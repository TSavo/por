import AppKit
import CoreGraphics
import Foundation

let bundle = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
let clock = ProcessInfo.processInfo
enum ProbeError: Error { case alreadyRunning, launchFailed, noWindow, quitFailed }

func running() -> NSRunningApplication? {
    NSWorkspace.shared.runningApplications.first { $0.bundleURL?.standardizedFileURL == bundle && !$0.isTerminated }
}

func visibleWindow(_ pid: pid_t) -> Bool {
    let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []
    return windows.contains { window in
        guard window[kCGWindowOwnerPID as String] as? Int == Int(pid),
              window[kCGWindowLayer as String] as? Int == 0,
              let bounds = window[kCGWindowBounds as String] as? [String: Any],
              let width = bounds["Width"] as? Double,
              let height = bounds["Height"] as? Double else { return false }
        return width >= 320 && height >= 200
    }
}

for attempt in 1...3 {
    guard running() == nil else { throw ProbeError.alreadyRunning }
    let open = Process()
    open.executableURL = URL(fileURLWithPath: "/usr/bin/open")
    open.arguments = ["-a", bundle.path]
    let start = clock.systemUptime
    try open.run()
    var registered: Double?
    var windowTime: Double?
    while clock.systemUptime - start < 90 {
        if !open.isRunning && open.terminationStatus != 0 { throw ProbeError.launchFailed }
        if let app = running() {
            registered = registered ?? (clock.systemUptime - start)
            if visibleWindow(app.processIdentifier) {
                windowTime = clock.systemUptime - start
                break
            }
        }
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
    }
    guard let visible = windowTime, let first = registered else {
        print("Launch \(attempt) timed out. App registration (seconds): \(String(describing: registered))")
        throw ProbeError.noWindow
    }
    print(String(format: "Launch %d | registered %.3f s | first visible window %.3f s", attempt, first, visible))
    guard let app = running(), app.terminate() else { throw ProbeError.quitFailed }
    let deadline = clock.systemUptime + 20
    while !app.isTerminated && clock.systemUptime < deadline {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
    }
    guard app.isTerminated else { throw ProbeError.quitFailed }
}
