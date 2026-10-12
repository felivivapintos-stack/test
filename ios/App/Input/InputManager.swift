import Combine
import GameController

/// Gamepad state in the layout of XINPUT_GAMEPAD, so it can be handed to Wine's xinput as-is.
struct XInputState: Equatable {
    struct Buttons: OptionSet, Hashable {
        let rawValue: UInt16

        static let dpadUp = Buttons(rawValue: 0x0001)
        static let dpadDown = Buttons(rawValue: 0x0002)
        static let dpadLeft = Buttons(rawValue: 0x0004)
        static let dpadRight = Buttons(rawValue: 0x0008)
        static let start = Buttons(rawValue: 0x0010)
        static let back = Buttons(rawValue: 0x0020)
        static let leftThumb = Buttons(rawValue: 0x0040)
        static let rightThumb = Buttons(rawValue: 0x0080)
        static let leftShoulder = Buttons(rawValue: 0x0100)
        static let rightShoulder = Buttons(rawValue: 0x0200)
        static let a = Buttons(rawValue: 0x1000)
        static let b = Buttons(rawValue: 0x2000)
        static let x = Buttons(rawValue: 0x4000)
        static let y = Buttons(rawValue: 0x8000)
    }

    var buttons: Buttons = []
    var leftTrigger: UInt8 = 0
    var rightTrigger: UInt8 = 0
    var thumbLX: Int16 = 0
    var thumbLY: Int16 = 0
    var thumbRX: Int16 = 0
    var thumbRY: Int16 = 0

    static func axis(_ value: Float) -> Int16 {
        Int16(max(-1, min(1, value)) * Float(Int16.max))
    }

    static func trigger(_ value: Float) -> UInt8 {
        UInt8(max(0, min(1, value)) * 255)
    }

    /// Physical controller input wins per axis/trigger; buttons are combined.
    func merged(with other: XInputState) -> XInputState {
        func pick(_ a: Int16, _ b: Int16) -> Int16 { abs(Int(a)) >= abs(Int(b)) ? a : b }
        return XInputState(
            buttons: buttons.union(other.buttons),
            leftTrigger: max(leftTrigger, other.leftTrigger),
            rightTrigger: max(rightTrigger, other.rightTrigger),
            thumbLX: pick(thumbLX, other.thumbLX),
            thumbLY: pick(thumbLY, other.thumbLY),
            thumbRX: pick(thumbRX, other.thumbRX),
            thumbRY: pick(thumbRY, other.thumbRY)
        )
    }
}

/// Tracks MFi/Xbox/PlayStation controllers and the on-screen touch controls.
@MainActor
final class InputManager: ObservableObject {
    @Published private(set) var controllerName: String?
    /// Written by the touch overlay.
    var touchState = XInputState()

    private var observers: [NSObjectProtocol] = []

    init() {
        let center = NotificationCenter.default
        for name in [Notification.Name.GCControllerDidConnect, .GCControllerDidDisconnect] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.refreshController() }
            })
        }
        GCController.startWirelessControllerDiscovery()
        refreshController()
    }

    private func refreshController() {
        controllerName = GCController.controllers().first { $0.extendedGamepad != nil }?.vendorName
    }

    /// Current combined state; call once per frame.
    func currentState() -> XInputState {
        guard let pad = GCController.controllers().lazy.compactMap(\.extendedGamepad).first else {
            return touchState
        }
        var state = XInputState()
        let mapping: [(GCControllerButtonInput?, XInputState.Buttons)] = [
            (pad.buttonA, .a), (pad.buttonB, .b), (pad.buttonX, .x), (pad.buttonY, .y),
            (pad.leftShoulder, .leftShoulder), (pad.rightShoulder, .rightShoulder),
            (pad.buttonMenu, .start), (pad.buttonOptions, .back),
            (pad.leftThumbstickButton, .leftThumb), (pad.rightThumbstickButton, .rightThumb),
            (pad.dpad.up, .dpadUp), (pad.dpad.down, .dpadDown),
            (pad.dpad.left, .dpadLeft), (pad.dpad.right, .dpadRight),
        ]
        for (button, flag) in mapping where button?.isPressed == true {
            state.buttons.insert(flag)
        }
        state.leftTrigger = XInputState.trigger(pad.leftTrigger.value)
        state.rightTrigger = XInputState.trigger(pad.rightTrigger.value)
        state.thumbLX = XInputState.axis(pad.leftThumbstick.xAxis.value)
        state.thumbLY = XInputState.axis(pad.leftThumbstick.yAxis.value)
        state.thumbRX = XInputState.axis(pad.rightThumbstick.xAxis.value)
        state.thumbRY = XInputState.axis(pad.rightThumbstick.yAxis.value)
        return state.merged(with: touchState)
    }
}
