import SwiftUI

struct GameDetailView: View {
    @EnvironmentObject private var library: GameLibrary
    @EnvironmentObject private var jit: JITManager
    @State var game: Game
    @State private var problems: [LaunchProblem] = []
    @State private var showProblems = false
    @State private var playing = false

    var body: some View {
        Form {
            Section {
                Button {
                    launch()
                } label: {
                    Label("Jogar", systemImage: "play.fill").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .listRowBackground(Color.clear)
            }

            Section("Executável") {
                Picker("Ficheiro", selection: Binding(
                    get: { game.executable },
                    set: { library.setExecutable($0, for: game) }
                )) {
                    ForEach(library.executables(of: game), id: \.self) { Text($0).tag($0) }
                }
                if let info = game.info {
                    LabeledContent("Arquitetura", value: info.machine.rawValue)
                    LabeledContent("Gráficos", value: info.graphicsAPI.title)
                    LabeledContent("Tipo", value: info.subsystem == .console ? "Consola" : "Janela")
                    LabeledContent("Comando (XInput)", value: info.usesXInput ? "Sim" : "Não detetado")
                    if info.usesSteam {
                        Text("Usa a API do Steam: pode precisar do cliente Steam. Versões GOG (sem DRM) são as mais fáceis.")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                    DisclosureGroup("DLLs importadas (\(info.imports.count))") {
                        ForEach(info.imports, id: \.self) { Text($0).font(.caption.monospaced()) }
                    }
                } else {
                    Text("Não foi possível ler o executável.").foregroundStyle(.secondary)
                }
            }

            Section("Desempenho") {
                Picker("Resolução", selection: $game.settings.resolutionScale) {
                    Text("50%").tag(0.5)
                    Text("75%").tag(0.75)
                    Text("100%").tag(1.0)
                }
                Picker("Limite de FPS", selection: $game.settings.fpsLimit) {
                    Text("30").tag(30)
                    Text("60").tag(60)
                    Text("Sem limite").tag(0)
                }
                Toggle("Mostrar HUD de desempenho", isOn: $game.settings.showHUD)
            }

            Section("Controlos") {
                Toggle("Controlos táteis (sem comando ligado)", isOn: $game.settings.touchControls)
            }

            Section("Avançado") {
                Picker("Gráficos", selection: $game.settings.graphicsBackend) {
                    ForEach(GameSettings.GraphicsBackend.allCases) { Text($0.title).tag($0) }
                }
                Picker("Versão do Windows", selection: $game.settings.windowsVersion) {
                    ForEach(GameSettings.WindowsVersion.allCases) { Text($0.title).tag($0) }
                }
                TextField("Argumentos", text: $game.settings.arguments)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
        }
        .navigationTitle(game.name)
        .onChange(of: game.settings) { library.update(game) }
        .onReceive(library.$games) { games in
            if let latest = games.first(where: { $0.id == game.id }), latest.executable != game.executable {
                game = latest
            }
        }
        .sheet(isPresented: $showProblems) {
            LaunchProblemsView(problems: problems) {
                showProblems = false
                playing = true
            }
        }
        .fullScreenCover(isPresented: $playing) {
            GameSessionView(game: game)
        }
    }

    private func launch() {
        problems = Launcher.problems(for: game, executable: library.executableURL(of: game),
                                     jitReady: jit.state == .ready)
        game.lastPlayed = Date()
        library.update(game)
        if problems.isEmpty {
            playing = true
        } else {
            showProblems = true
        }
    }
}

private struct LaunchProblemsView: View {
    let problems: [LaunchProblem]
    let openTestSession: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(problems) { problem in
                        Label(problem.message, systemImage: "exclamationmark.triangle")
                    }
                } footer: {
                    Text("Podes abrir a sessão de teste para experimentar os controlos, o ecrã e o contador de FPS.")
                }
                Button("Abrir sessão de teste", action: openTestSession)
            }
            .navigationTitle("Ainda não dá para jogar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                Button("Fechar") { dismiss() }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
