import Foundation
import UIKit

enum TXMStatus: String {
    case present = "Presente"
    case notPresent = "Ausente"
    case unknown = "Desconhecido"
}

enum JITState: Equatable {
    case idle
    case waiting
    case ready
    case failed(String)

    var title: String {
        switch self {
        case .idle: return "Inativo"
        case .waiting: return "À espera…"
        case .ready: return "Ativo"
        case .failed: return "Falhou"
        }
    }
}

/// Acquires JIT through an external debugger (StikDebug) and verifies it by
/// running freshly generated ARM64 code.
final class JITManager: ObservableObject {
    /// Initial executable memory. On TXM devices regions cannot be added after
    /// detaching, so the translator's code cache must be reserved up front.
    static let codeCacheSize = 64 * 1024 * 1024

    @Published private(set) var state: JITState = .idle
    @Published private(set) var log: [String] = []

    let hasGetTaskAllow = jit_has_get_task_allow()
    let txm: TXMStatus
    private(set) var region = jit_region()

    init() {
        txm = Self.detectTXM()
        append("iOS \(UIDevice.current.systemVersion), TXM: \(txm.rawValue), get-task-allow: \(hasGetTaskAllow ? "sim" : "não")")
        if jit_is_debugged() {
            append("Depurador já ligado no arranque.")
            startWaiting()
        }
    }

    /// Same rule StikDebug uses: TXM gates JIT from iOS 26 on A15/M2 and newer (iPhone14,2+),
    /// and on every device iOS 27 supports except two iPad Pro models.
    private static func detectTXM() -> TXMStatus {
        let major = ProcessInfo.processInfo.operatingSystemVersion.majorVersion
        guard major >= 26 else { return .notPresent }
        let model = deviceModel
        if major >= 27 {
            return model == "iPad8,11" || model == "iPad8,12" ? .notPresent : .present
        }
        let pattern = #/^(iPhone|iPad)(\d+),(\d+)$/#
        guard let match = model.wholeMatch(of: pattern),
              let generation = Int(match.2), let variant = Int(match.3) else {
            return .unknown
        }
        // StikDebug compares "major.minor" as a decimal: iPhone14,2 → 14.2, iPad14,5 → 14.5.
        let version = Double(generation) + Double(variant) / pow(10, Double(String(variant).count))
        return version >= (match.1 == "iPad" ? 14.5 : 14.2) ? .present : .notPresent
    }

    static var deviceModel: String {
        var info = utsname()
        uname(&info)
        return withUnsafeBytes(of: &info.machine) { bytes in
            String(decoding: bytes.prefix { $0 != 0 }, as: UTF8.self)
        }
    }

    /// The universal-script protocol is required unless TXM is known to be absent.
    private var usesTXMProtocol: Bool { txm != .notPresent }

    func requestViaStikDebug() {
        guard hasGetTaskAllow else {
            state = .failed("Falta get-task-allow: reinstala a app com o SideStore/AltStore.")
            return
        }
        var components = URLComponents()
        components.scheme = "stikdebug"
        components.host = "enable-jit"
        components.queryItems = [
            URLQueryItem(name: "bundle-id", value: Bundle.main.bundleIdentifier),
            URLQueryItem(name: "pid", value: String(getpid())),
        ]
        if usesTXMProtocol {
            components.queryItems?.append(URLQueryItem(name: "script-name", value: "universal.js"))
        }
        guard let url = components.url else { return }
        startWaiting()
        UIApplication.shared.open(url) { [weak self] opened in
            if !opened {
                self?.state = .failed("Não foi possível abrir o StikDebug. Está instalado?")
            }
        }
    }

    func startWaiting() {
        guard state != .waiting, state != .ready else { return }
        state = .waiting
        append("À espera do depurador…")
        let txmProtocol = usesTXMProtocol
        Thread.detachNewThread { [weak self] in
            let deadline = Date().addingTimeInterval(300)
            while !jit_is_debugged() {
                if Date() > deadline {
                    self?.finish(.failed("Tempo esgotado à espera do depurador."))
                    return
                }
                usleep(100_000)
            }
            self?.setUp(txmProtocol: txmProtocol)
        }
    }

    private func setUp(txmProtocol: Bool) {
        var region = jit_region()
        guard jit_region_create(&region, Self.codeCacheSize, txmProtocol) else {
            let error = String(cString: jit_last_error())
            jit_finish_setup(txmProtocol)
            finish(.failed(error))
            return
        }
        jit_finish_setup(txmProtocol)

        let result = jit_selftest(&region, 2, 40)
        DispatchQueue.main.async {
            self.region = region
            self.append("Região JIT: \(region.size / 1024 / 1024) MB em \(String(describing: region.rx))")
            self.append("Código gerado executado: 2 + 40 = \(result)")
        }
        finish(result == 42 ? .ready : .failed("Resultado inesperado: \(result)"))
    }

    private func finish(_ newState: JITState) {
        DispatchQueue.main.async {
            self.state = newState
            switch newState {
            case .ready: self.append("JIT ativo ✅")
            case .failed(let reason): self.append("Falhou: \(reason)")
            default: break
            }
        }
    }

    private func append(_ line: String) {
        log.append(line)
    }
}
