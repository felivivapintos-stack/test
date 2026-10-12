import MetalKit
import os

/// Frame statistics shown by the HUD.
@MainActor
final class SessionStats: ObservableObject {
    @Published var fps = 0.0
    @Published var frameTimeMs = 0.0
    @Published var availableMemoryMB = 0
    @Published var drawableSize = CGSize.zero
    @Published var input = XInputState()
}

/// Presents frames into the session's Metal layer. Until the Wine/DXMT engine is
/// bundled it draws a test pattern driven by the controller, to validate the
/// display, frame pacing and input paths on device.
@MainActor
final class MetalRenderer: NSObject, MTKViewDelegate {
    private let commandQueue: MTLCommandQueue
    private let input: InputManager
    private let stats: SessionStats

    private var frameCount = 0
    private var windowStart = CACurrentMediaTime()
    private var lastFrame = CACurrentMediaTime()
    private var hue = 0.0

    init?(device: MTLDevice, input: InputManager, stats: SessionStats) {
        guard let queue = device.makeCommandQueue() else { return nil }
        commandQueue = queue
        self.input = input
        self.stats = stats
    }

    nonisolated func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        MainActor.assumeIsolated { stats.drawableSize = size }
    }

    nonisolated func draw(in view: MTKView) {
        MainActor.assumeIsolated { drawFrame(in: view) }
    }

    private func drawFrame(in view: MTKView) {
        let now = CACurrentMediaTime()
        let state = input.currentState()
        updateStats(now: now, state: state)

        // Left stick tilts the hue, triggers set brightness, A flashes white.
        hue = (hue + 0.002 + Double(state.thumbLX) / Double(Int16.max) * 0.01)
            .truncatingRemainder(dividingBy: 1)
        if hue < 0 { hue += 1 }
        let brightness = 0.35 + 0.65 * Double(max(state.leftTrigger, state.rightTrigger)) / 255
        let color = state.buttons.contains(.a)
            ? UIColor.white
            : UIColor(hue: hue, saturation: 0.7, brightness: brightness, alpha: 1)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        view.clearColor = MTLClearColor(red: r, green: g, blue: b, alpha: 1)

        guard let pass = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let commands = commandQueue.makeCommandBuffer(),
              let encoder = commands.makeRenderCommandEncoder(descriptor: pass) else { return }
        encoder.endEncoding()
        commands.present(drawable)
        commands.commit()
    }

    private func updateStats(now: CFTimeInterval, state: XInputState) {
        let frameTime = now - lastFrame
        lastFrame = now
        frameCount += 1
        let elapsed = now - windowStart
        guard elapsed >= 0.5 else { return }
        stats.fps = Double(frameCount) / elapsed
        stats.frameTimeMs = frameTime * 1000
        stats.availableMemoryMB = Int(os_proc_available_memory() / 1_048_576)
        stats.input = state
        frameCount = 0
        windowStart = now
    }
}
