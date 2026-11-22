; The Pool of Radiance installer for Windows. tools/release/pack.ts builds it with
;   makensis -DSTAGE=<staged install> -DOUTFILE=<installer.exe> -DVERSION=<x.y.z> windows-installer.nsi
; It installs to Program Files, adds a Start Menu shortcut and an optional desktop shortcut that run the
; launcher with the bundled Node (its console window is the game's: close it to stop the game), and an
; uninstaller. The player's saves in %APPDATA%\Pool of Radiance are left in place by the uninstaller.
Unicode true
ManifestDPIAware true
SetCompressor zlib
RequestExecutionLevel admin

!include "MUI2.nsh"
!include "x64.nsh"

!define PRODUCT "Pool of Radiance"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}"

Name "${PRODUCT}"
OutFile "${OUTFILE}"
InstallDir "$PROGRAMFILES64\${PRODUCT}"
InstallDirRegKey HKLM "Software\${PRODUCT}" "InstallDir"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${PRODUCT}"
VIAddVersionKey "FileDescription" "${PRODUCT} installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"

!define MUI_ICON "${STAGE}/pool-of-radiance.ico"
!define MUI_UNICON "${STAGE}/pool-of-radiance.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\node\node.exe"
!define MUI_FINISHPAGE_RUN_PARAMETERS '"$INSTDIR\app\launch.mjs"'
!define MUI_FINISHPAGE_RUN_TEXT "Play ${PRODUCT}"
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

Section "${PRODUCT}" SectionGame
  SectionIn RO
  SetShellVarContext all
  ; An update replaces the game's files rather than mixing two versions.
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\game"
  RMDir /r "$INSTDIR\upgrades"
  RMDir /r "$INSTDIR\audio"
  SetOutPath "$INSTDIR"
  File /r "${STAGE}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\${PRODUCT}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk" "$INSTDIR\node\node.exe" '"$INSTDIR\app\launch.mjs"' "$INSTDIR\pool-of-radiance.ico"
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
  CreateShortcut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\node\node.exe" '"$INSTDIR\app\launch.mjs"' "$INSTDIR\pool-of-radiance.ico"
SectionEnd

Section "Uninstall"
  SetShellVarContext all
  Delete "$DESKTOP\${PRODUCT}.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${UNINSTALL_KEY}"
  DeleteRegKey HKLM "Software\${PRODUCT}"
SectionEnd
