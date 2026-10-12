import Foundation

struct Game: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    /// Folder name under `GameLibrary.gamesDirectory`.
    var folderName: String
    /// Executable path relative to the game folder.
    var executable: String
    var info: PEInfo?
    var settings = GameSettings()
    var addedAt = Date()
    var lastPlayed: Date?
}

struct GameSettings: Codable, Hashable {
    enum GraphicsBackend: String, Codable, CaseIterable, Identifiable {
        case dxmt, dxvk, wined3d

        var id: Self { self }
        var title: String {
            switch self {
            case .dxmt: return "DXMT (D3D11 → Metal)"
            case .dxvk: return "DXVK + MoltenVK"
            case .wined3d: return "WineD3D"
            }
        }
    }

    enum WindowsVersion: String, Codable, CaseIterable, Identifiable {
        case win7, win10

        var id: Self { self }
        var title: String { self == .win7 ? "Windows 7" : "Windows 10" }
    }

    /// Fraction of the native screen resolution the game renders at.
    var resolutionScale = 0.75
    /// 0 means unlimited.
    var fpsLimit = 30
    var showHUD = true
    var touchControls = true
    var graphicsBackend = GraphicsBackend.dxmt
    var windowsVersion = WindowsVersion.win10
    var arguments = ""
}
