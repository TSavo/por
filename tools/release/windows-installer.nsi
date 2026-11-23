; The Pool of Radiance installer for Windows. tools/release/pack.ts builds it with
;   makensis -DSTAGE=<staged install> -DOUTFILE=<installer.exe> -DVERSION=<x.y.z> windows-installer.nsi
; It installs to Program Files or the folder the player chooses (a drive without room for the game and
; SPARE_MB more is refused with a message), adds a Start Menu shortcut and an optional desktop shortcut
; that open the Electron app, and an uninstaller. The player's saves in %APPDATA%\Pool of Radiance are left in place
; by the uninstaller.
Unicode true
ManifestDPIAware true
SetCompressor zlib
RequestExecutionLevel admin

!include "MUI2.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

!define PRODUCT "Pool of Radiance"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}"
; Room the chosen drive must have beyond the game's files: the file system's own overhead for 18,000
; files, and space for Windows to go on working, so an install never fills a drive. (A test can raise it
; with -DSPARE_MB=, to see a drive refused without writing a game's worth of files to it.)
!ifndef SPARE_MB
  !define SPARE_MB 256
!endif

Name "${PRODUCT}"
OutFile "${OUTFILE}"
InstallDir "$PROGRAMFILES64\${PRODUCT}"
InstallDirRegKey HKLM "Software\${PRODUCT}" "InstallDir"
!ifndef NUMERIC_VERSION
  !define NUMERIC_VERSION "${VERSION}.0"
!endif
VIProductVersion "${NUMERIC_VERSION}"
VIAddVersionKey "ProductName" "${PRODUCT}"
VIAddVersionKey "FileDescription" "${PRODUCT} installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"

!define MUI_ICON "${STAGE}/pool-of-radiance.ico"
!define MUI_UNICON "${STAGE}/pool-of-radiance.ico"
; Through the Start Menu shortcut and Explorer, so the game does not run with the installer's elevation.
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION PlayGame
!define MUI_FINISHPAGE_RUN_TEXT "Play ${PRODUCT}"
; The directory page's own check greys Next out without a word when the files do not fit; with it left
; to the page's leave function, Next stays on and says why (DirectoryLeave).
!define MUI_DIRECTORYPAGE_VERIFYONLEAVE
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "${PRODUCT} needs 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd

Function un.onInit
  SetRegView 64
FunctionEnd

Function PlayGame
  SetShellVarContext all
  Exec '"$WINDIR\explorer.exe" "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk"'
FunctionEnd

Var Drive
Var FreeMB
Var NeedMB
Var RoomMessage

Section "${PRODUCT}" SectionGame
  SectionIn RO
  ; A silent install has no directory page: it refuses a drive without room before writing anything
  ; (exit code 2).
  Call MeasureRoom
  ${If} $FreeMB < $NeedMB
    MessageBox MB_ICONSTOP|MB_OK "$RoomMessage" /SD IDOK
    Abort
  ${EndIf}
  SetShellVarContext all
  ; An update replaces the game's files rather than mixing two versions.
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\tools"
  RMDir /r "$INSTDIR\game"
  RMDir /r "$INSTDIR\upgrades"
  RMDir /r "$INSTDIR\audio"
  RMDir /r "$INSTDIR\web"
  RMDir /r "$INSTDIR\src"
  RMDir /r "$INSTDIR\qa"
  RMDir /r "$INSTDIR\node"
  SetOutPath "$INSTDIR"
  File /r "${STAGE}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\${PRODUCT}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk" "$INSTDIR\${PRODUCT}.exe" "" "$INSTDIR\pool-of-radiance.ico"
  CreateShortcut "$SMPROGRAMS\${PRODUCT}\Uninstall ${PRODUCT}.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\${PRODUCT}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayName" "${PRODUCT}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\pool-of-radiance.ico"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Desktop shortcut" SectionDesktop
  SetShellVarContext all
  CreateShortcut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\${PRODUCT}.exe" "" "$INSTDIR\pool-of-radiance.ico"
SectionEnd

; $Drive: the drive (or share) $INSTDIR is on; $FreeMB: its free space; $NeedMB: the game's files and
; SPARE_MB; $RoomMessage: what to tell the player when $FreeMB is less than $NeedMB.
Function MeasureRoom
  ${GetRoot} "$INSTDIR" $Drive
  ClearErrors
  ${DriveSpace} "$Drive\" "/D=F /S=M" $FreeMB
  ${If} ${Errors}
    StrCpy $FreeMB 0
  ${EndIf}
  SectionGetSize ${SectionGame} $NeedMB
  IntOp $NeedMB $NeedMB / 1024
  IntOp $NeedMB $NeedMB + ${SPARE_MB}
  StrCpy $RoomMessage "${PRODUCT} needs $NeedMB MB free on $Drive, and $Drive has $FreeMB MB.$\r$\n$\r$\nChoose a folder on a drive with more room: type it in the box (for example D:\${PRODUCT}), or click Browse."
FunctionEnd

Function DirectoryLeave
  GetInstDirError $0
  ${If} $0 = 1
    MessageBox MB_ICONEXCLAMATION|MB_OK "${PRODUCT} cannot be installed in $INSTDIR. Choose a folder, such as D:\${PRODUCT}."
    Abort
  ${EndIf}
  Call MeasureRoom
  ${If} $FreeMB < $NeedMB
    MessageBox MB_ICONEXCLAMATION|MB_OK "$RoomMessage"
    Abort
  ${EndIf}
FunctionEnd

Section "Uninstall"
  SetShellVarContext all
  Delete "$DESKTOP\${PRODUCT}.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${UNINSTALL_KEY}"
  DeleteRegKey HKLM "Software\${PRODUCT}"
SectionEnd
