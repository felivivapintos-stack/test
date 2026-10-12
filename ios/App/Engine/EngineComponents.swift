import Foundation

/// The pieces of the Windows compatibility stack bundled under PCEmu.app/Engine.
enum EngineComponent: String, CaseIterable, Identifiable {
    case fex
    case wine
    case dxmt

    var id: Self { self }

    var title: String {
        switch self {
        case .fex: return "FEX-Emu (x86/x64 → ARM64)"
        case .wine: return "Wine para iOS (API do Windows)"
        case .dxmt: return "DXMT (Direct3D 11 → Metal)"
        }
    }

    /// A file whose presence in the bundle means the component is included.
    private var marker: String {
        switch self {
        case .fex: return "fex/libarm64ecfex.dll"
        case .wine: return "wine/lib/wine/aarch64-unix/ntdll.so"
        case .dxmt: return "dxmt/d3d11.dll"
        }
    }

    static let engineDirectory = Bundle.main.bundleURL.appendingPathComponent("Engine", isDirectory: true)

    var isBundled: Bool {
        FileManager.default.fileExists(atPath: Self.engineDirectory.appendingPathComponent(marker).path)
    }

    /// Revision the component was built from (written by CI next to the files).
    var version: String? {
        let file = Self.engineDirectory.appendingPathComponent(rawValue).appendingPathComponent("VERSION")
        return (try? String(contentsOf: file, encoding: .utf8))?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

enum LaunchProblem: Identifiable, Hashable {
    case jitNotReady
    case missingComponent(EngineComponent)
    case unsupportedMachine(String)
    case executableMissing

    var id: String { message }

    var message: String {
        switch self {
        case .jitNotReady:
            return "O JIT não está ativo. Ativa-o no separador JIT."
        case .missingComponent(let component):
            return "Falta o componente: \(component.title)."
        case .unsupportedMachine(let machine):
            return "Arquitetura do executável não suportada (\(machine))."
        case .executableMissing:
            return "O executável já não existe na pasta do jogo."
        }
    }
}

enum Launcher {
    static func problems(for game: Game, executable: URL, jitReady: Bool) -> [LaunchProblem] {
        var problems: [LaunchProblem] = []
        if !FileManager.default.fileExists(atPath: executable.path) {
            problems.append(.executableMissing)
        }
        if let machine = game.info?.machine, machine == .other {
            problems.append(.unsupportedMachine(machine.rawValue))
        }
        if !jitReady {
            problems.append(.jitNotReady)
        }
        problems += EngineComponent.allCases.filter { !$0.isBundled }.map(LaunchProblem.missingComponent)
        return problems
    }
}
