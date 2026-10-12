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
        if ProcessInfo.processInfo.operatingSystemVersion.majorVersion < 26 {
            txm = .notPresent
        } else {
            switch jit_txm_status() {
            case 1: txm = .present
            case 0: txm = .notPresent
            default: txm = .unknown
            }
        }
        append("iOS \(UIDevice.current.systemVersion), TXM: \(txm.rawValue), get-task-allow: \(hasGetTaskAllow ? "sim" : "não")")
        if jit_is_debugged() {
            append("Depurador já ligado no arranque.")
            startWaiting()
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
