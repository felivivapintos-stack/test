import MetalKit
import SwiftUI

struct GameSessionView: View {
    let game: Game
    @EnvironmentObject private var input: InputManager
    @StateObject private var stats = SessionStats()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            MetalView(settings: game.settings, input: input, stats: stats)
                .ignoresSafeArea()

            if game.settings.showHUD {
                PerformanceHUD(stats: stats, controllerName: input.controllerName)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding()
            }

            if game.settings.touchControls && input.controllerName == nil {
                TouchControlsOverlay(input: input)
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        input.touchState = XInputState()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .symbolRenderingMode(.hierarchical)
                    }
                    .tint(.white)
                }
                Spacer()
                Text("Modo de teste: o motor Windows ainda não está incluído nesta versão.")
                    .font(.caption)
                    .padding(6)
                    .background(.black.opacity(0.5), in: Capsule())
                    .foregroundStyle(.white)
            }
            .padding()
        }
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
    }
}

private struct MetalView: UIViewRepresentable {
    let settings: GameSettings
    let input: InputManager
    let stats: SessionStats

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView()
        view.device = MTLCreateSystemDefaultDevice()
        view.colorPixelFormat = .bgra8Unorm
        view.contentScaleFactor = max(1, view.traitCollection.displayScale * settings.resolutionScale)
        view.preferredFramesPerSecond = settings.fpsLimit == 0 ? 120 : settings.fpsLimit
        if let device = view.device, let renderer = MetalRenderer(device: device, input: input, stats: stats) {
            context.coordinator.renderer = renderer
            view.delegate = renderer
        }
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {}

    final class Coordinator {
        var renderer: MetalRenderer?
    }
}

private struct PerformanceHUD: View {
    @ObservedObject var stats: SessionStats
    let controllerName: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(format: "%.0f fps · %.1f ms", stats.fps, stats.frameTimeMs))
            Text("\(Int(stats.drawableSize.width))×\(Int(stats.drawableSize.height))")
            Text("Memória livre: \(stats.availableMemoryMB) MB")
            Text("Comando: \(controllerName ?? "tátil")")
            Text(String(format: "Botões 0x%04X  LT %d RT %d", stats.input.buttons.rawValue,
                        stats.input.leftTrigger, stats.input.rightTrigger))
            Text("L (\(stats.input.thumbLX), \(stats.input.thumbLY))  R (\(stats.input.thumbRX), \(stats.input.thumbRY))")
        }
        .font(.system(size: 11, design: .monospaced))
        .foregroundStyle(.green)
        .padding(6)
        .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 6))
    }
}
