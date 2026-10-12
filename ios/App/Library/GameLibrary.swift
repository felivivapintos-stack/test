import Foundation

/// Games copied into the app's Documents/Games folder, persisted as library.json.
@MainActor
final class GameLibrary: ObservableObject {
    @Published private(set) var games: [Game] = []
    @Published private(set) var importing: String?
    @Published var lastError: String?

    nonisolated static let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    nonisolated static let gamesDirectory = documents.appendingPathComponent("Games", isDirectory: true)
    nonisolated private static let libraryFile = documents.appendingPathComponent("library.json")

    /// Executables that are almost never the game itself.
    nonisolated private static let ignoredExecutableHints = [
        "unins", "setup", "redist", "vcredist", "dxsetup", "crash", "report", "launcher", "dotnet", "uninstall",
    ]

    init() {
        try? FileManager.default.createDirectory(at: Self.gamesDirectory, withIntermediateDirectories: true)
        if let data = try? Data(contentsOf: Self.libraryFile),
           let saved = try? JSONDecoder().decode([Game].self, from: data) {
            games = saved
        }
    }

    func folder(of game: Game) -> URL {
        Self.gamesDirectory.appendingPathComponent(game.folderName, isDirectory: true)
    }

    func executableURL(of game: Game) -> URL {
        folder(of: game).appendingPathComponent(game.executable)
    }

    /// Relative paths of every .exe inside the game's folder.
    func executables(of game: Game) -> [String] {
        Self.findExecutables(in: folder(of: game)).map(\.relative)
    }

    func importItem(at url: URL) {
        guard importing == nil else { return }
        importing = url.lastPathComponent
        Task.detached(priority: .userInitiated) {
            let result = Result { try Self.copyIntoLibrary(url) }
            await MainActor.run {
                self.importing = nil
                switch result {
                case .success(let game):
                    self.games.append(game)
                    self.save()
                case .failure(let error):
                    self.lastError = error.localizedDescription
                }
            }
        }
    }

    func update(_ game: Game) {
        guard let index = games.firstIndex(where: { $0.id == game.id }) else { return }
        games[index] = game
        save()
    }

    func setExecutable(_ relativePath: String, for game: Game) {
        var updated = game
        updated.executable = relativePath
        updated.info = try? PEParser.parse(folder(of: game).appendingPathComponent(relativePath))
        update(updated)
    }

    func delete(_ game: Game) {
        try? FileManager.default.removeItem(at: folder(of: game))
        games.removeAll { $0.id == game.id }
        save()
    }

    private func save() {
        do {
            try JSONEncoder().encode(games).write(to: Self.libraryFile, options: .atomic)
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Import (runs off the main actor)

    private enum ImportError: LocalizedError {
        case noExecutable

        var errorDescription: String? { "Não encontrei nenhum ficheiro .exe nesta pasta." }
    }

    nonisolated private static func copyIntoLibrary(_ source: URL) throws -> Game {
        let scoped = source.startAccessingSecurityScopedResource()
        defer { if scoped { source.stopAccessingSecurityScopedResource() } }

        let fileManager = FileManager.default
        let isDirectory = (try? source.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
        let baseName = isDirectory ? source.lastPathComponent : source.deletingPathExtension().lastPathComponent
        let folderName = "\(baseName)-\(UUID().uuidString.prefix(8))"
        let destination = gamesDirectory.appendingPathComponent(folderName, isDirectory: true)

        if isDirectory {
            try fileManager.copyItem(at: source, to: destination)
        } else {
            try fileManager.createDirectory(at: destination, withIntermediateDirectories: true)
            try fileManager.copyItem(at: source, to: destination.appendingPathComponent(source.lastPathComponent))
        }

        guard let main = pickMainExecutable(findExecutables(in: destination)) else {
            try? fileManager.removeItem(at: destination)
            throw ImportError.noExecutable
        }
        return Game(
            name: baseName,
            folderName: folderName,
            executable: main.relative,
            info: try? PEParser.parse(main.url)
        )
    }

    nonisolated private static func findExecutables(in folder: URL) -> [(url: URL, relative: String, size: Int)] {
        let keys: [URLResourceKey] = [.fileSizeKey, .isRegularFileKey]
        guard let enumerator = FileManager.default.enumerator(at: folder, includingPropertiesForKeys: keys) else {
            return []
        }
        let prefix = folder.standardizedFileURL.path + "/"
        var found: [(url: URL, relative: String, size: Int)] = []
        for case let url as URL in enumerator where url.pathExtension.lowercased() == "exe" {
            let values = try? url.resourceValues(forKeys: Set(keys))
            guard values?.isRegularFile == true else { continue }
            let relative = url.standardizedFileURL.path.replacingOccurrences(of: prefix, with: "")
            found.append((url, relative, values?.fileSize ?? 0))
        }
        return found.sorted { $0.relative < $1.relative }
    }

    /// The largest executable that doesn't look like an installer or helper.
    nonisolated private static func pickMainExecutable(
        _ candidates: [(url: URL, relative: String, size: Int)]
    ) -> (url: URL, relative: String, size: Int)? {
        let likely = candidates.filter { candidate in
            let name = candidate.url.lastPathComponent.lowercased()
            return !ignoredExecutableHints.contains { name.contains($0) }
        }
        return (likely.isEmpty ? candidates : likely).max { $0.size < $1.size }
    }
}
