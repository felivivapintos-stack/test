import SwiftUI
import UniformTypeIdentifiers

struct LibraryView: View {
    @EnvironmentObject private var library: GameLibrary
    @State private var showImporter = false

    private static let importTypes: [UTType] = [.folder, UTType(filenameExtension: "exe") ?? .data]

    var body: some View {
        NavigationStack {
            Group {
                if library.games.isEmpty {
                    ContentUnavailableView {
                        Label("Sem jogos", systemImage: "gamecontroller")
                    } description: {
                        Text("Importa a pasta de um jogo de PC (por exemplo, a pasta instalada de um jogo GOG) a partir da app Ficheiros.")
                    } actions: {
                        Button("Importar jogo") { showImporter = true }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    List {
                        ForEach(library.games) { game in
                            NavigationLink(value: game.id) {
                                GameRow(game: game)
                            }
                        }
                        .onDelete { offsets in
                            offsets.map { library.games[$0] }.forEach(library.delete)
                        }
                    }
                }
            }
            .navigationTitle("Biblioteca")
            .navigationDestination(for: UUID.self) { id in
                if let game = library.games.first(where: { $0.id == id }) {
                    GameDetailView(game: game)
                }
            }
            .toolbar {
                Button { showImporter = true } label: { Image(systemName: "plus") }
                    .disabled(library.importing != nil)
            }
            .fileImporter(isPresented: $showImporter, allowedContentTypes: Self.importTypes) { result in
                if case .success(let url) = result {
                    library.importItem(at: url)
                }
            }
            .overlay {
                if let name = library.importing {
                    ProgressView("A copiar \(name)…")
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
            .alert("Erro", isPresented: Binding(
                get: { library.lastError != nil },
                set: { if !$0 { library.lastError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(library.lastError ?? "")
            }
        }
    }
}

private struct GameRow: View {
    let game: Game

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(game.name).font(.headline)
            HStack(spacing: 6) {
                if let info = game.info {
                    Badge(text: info.machine.rawValue)
                    Badge(text: info.graphicsAPI.title)
                    if info.usesSteam { Badge(text: "Steam") }
                }
                Text(game.executable).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
        }
    }
}

struct Badge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(.tint.opacity(0.15), in: Capsule())
    }
}
