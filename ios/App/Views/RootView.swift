import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            LibraryView()
                .tabItem { Label("Biblioteca", systemImage: "gamecontroller") }
            JITView()
                .tabItem { Label("JIT", systemImage: "bolt") }
            SystemView()
                .tabItem { Label("Sistema", systemImage: "cpu") }
        }
    }
}
