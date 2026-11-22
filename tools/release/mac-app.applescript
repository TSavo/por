-- Pool of Radiance.app. tools/release/pack.ts compiles this with osacompile into a stay-open applet and
-- puts the game in Contents/Resources and the release's Node in Contents/MacOS/node.
-- Opening the app starts the game server and opens the browser on it. Quitting the app, with Cmd-Q or
-- Quit from its Dock menu, stops the server and the runner. Clicking the Dock icon while it runs opens the
-- game in the browser again. The launcher's output goes to ~/Library/Logs/Pool of Radiance.log.
property launcherPID : ""
property quitting : false

on appPath()
	return POSIX path of (path to me)
end appPath

on logFile()
	return (POSIX path of (path to library folder from user domain)) & "Logs/Pool of Radiance.log"
end logFile

on launchCommand()
	return quoted form of (appPath() & "Contents/MacOS/node") & " " & quoted form of (appPath() & "Contents/Resources/app/launch.mjs")
end launchCommand

on run
	do shell script "mkdir -p " & quoted form of ((POSIX path of (path to library folder from user domain)) & "Logs")
	set launcherPID to do shell script launchCommand() & " > " & quoted form of logFile() & " 2>&1 & echo $!"
end run

on reopen
	-- A second launcher finds the running game and opens the browser on it.
	do shell script launchCommand() & " >> " & quoted form of logFile() & " 2>&1 &"
end reopen

on idle
	if launcherPID is not "" then
		try
			do shell script "kill -0 " & launcherPID
		on error
			if not quitting then
				display dialog "Pool of Radiance stopped. Its log is in ~/Library/Logs/Pool of Radiance.log." buttons {"Quit"} default button 1 with icon caution
				quit
			end if
		end try
	end if
	return 2
end idle

on quit
	set quitting to true
	if launcherPID is not "" then
		try
			do shell script "kill -TERM " & launcherPID
			-- The launcher stops the runner and the server, then exits.
			repeat 30 times
				do shell script "kill -0 " & launcherPID
				delay 0.1
			end repeat
		end try
	end if
	continue quit
end quit
