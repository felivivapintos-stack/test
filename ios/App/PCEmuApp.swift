import SwiftUI

@main
struct PCEmuApp: App {
    @StateObject private var jit = JITManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(jit)
        }
    }
}
