import SwiftUI

@main
struct PCEmuApp: App {
    @StateObject private var jit = JITManager()
    @StateObject private var library = GameLibrary()
    @StateObject private var input = InputManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(jit)
                .environmentObject(library)
                .environmentObject(input)
        }
    }
}
