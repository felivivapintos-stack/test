import SwiftUI

/// On-screen gamepad that writes into `InputManager.touchState`.
struct TouchControlsOverlay: View {
    let input: InputManager

    var body: some View {
        VStack {
            HStack {
                VStack(spacing: 8) {
                    TriggerButton(label: "LT") { input.touchState.leftTrigger = $0 ? 255 : 0 }
                    TouchButton(label: "LB", flag: .leftShoulder, input: input)
                }
                Spacer()
                HStack(spacing: 16) {
                    TouchButton(label: "⧉", flag: .back, input: input)
                    TouchButton(label: "≡", flag: .start, input: input)
                }
                Spacer()
                VStack(spacing: 8) {
                    TriggerButton(label: "RT") { input.touchState.rightTrigger = $0 ? 255 : 0 }
                    TouchButton(label: "RB", flag: .rightShoulder, input: input)
                }
            }
            Spacer()
            HStack(alignment: .bottom) {
                VirtualStick { x, y in
                    input.touchState.thumbLX = XInputState.axis(x)
                    input.touchState.thumbLY = XInputState.axis(y)
                }
                Spacer()
                VStack(spacing: 4) {
                    TouchButton(label: "Y", flag: .y, input: input)
                    HStack(spacing: 44) {
                        TouchButton(label: "X", flag: .x, input: input)
                        TouchButton(label: "B", flag: .b, input: input)
                    }
                    TouchButton(label: "A", flag: .a, input: input)
                }
                Spacer().frame(width: 24)
                VirtualStick { x, y in
                    input.touchState.thumbRX = XInputState.axis(x)
                    input.touchState.thumbRY = XInputState.axis(y)
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 56)
    }
}

private struct PressSurface<Content: View>: View {
    let onChange: (Bool) -> Void
    @ViewBuilder let content: (Bool) -> Content
    @State private var pressed = false

    var body: some View {
        content(pressed)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !pressed { pressed = true; onChange(true) }
                    }
                    .onEnded { _ in
                        pressed = false
                        onChange(false)
                    }
            )
    }
}

private struct TouchButton: View {
    let label: String
    let flag: XInputState.Buttons
    let input: InputManager

    var body: some View {
        PressSurface { down in
            if down { input.touchState.buttons.insert(flag) } else { input.touchState.buttons.remove(flag) }
        } content: { pressed in
            Text(label)
                .font(.headline)
                .frame(width: 48, height: 48)
                .background(.white.opacity(pressed ? 0.6 : 0.25), in: Circle())
                .foregroundStyle(.white)
        }
    }
}

private struct TriggerButton: View {
    let label: String
    let onChange: (Bool) -> Void

    var body: some View {
        PressSurface(onChange: onChange) { pressed in
            Text(label)
                .font(.subheadline.bold())
                .frame(width: 64, height: 32)
                .background(.white.opacity(pressed ? 0.6 : 0.25), in: Capsule())
                .foregroundStyle(.white)
        }
    }
}

private struct VirtualStick: View {
    let onMove: (Float, Float) -> Void
    @State private var offset = CGSize.zero
    private let radius: CGFloat = 56

    var body: some View {
        ZStack {
            Circle().fill(.white.opacity(0.15)).frame(width: radius * 2, height: radius * 2)
            Circle().fill(.white.opacity(0.5)).frame(width: 48, height: 48).offset(offset)
        }
        .contentShape(Circle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    var dx = value.location.x - radius
                    var dy = value.location.y - radius
                    let length = (dx * dx + dy * dy).squareRoot()
                    if length > radius {
                        dx *= radius / length
                        dy *= radius / length
                    }
                    offset = CGSize(width: dx, height: dy)
                    // XInput Y axis points up.
                    onMove(Float(dx / radius), Float(-dy / radius))
                }
                .onEnded { _ in
                    offset = .zero
                    onMove(0, 0)
                }
        )
    }
}
