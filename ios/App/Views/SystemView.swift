import SwiftUI
import os

struct SystemView: View {
    @EnvironmentObject private var jit: JITManager
    @State private var availableMemory = os_proc_available_memory()

    var body: some View {
        NavigationStack {
            List {
                Section("Dispositivo") {
                    LabeledContent("Modelo", value: JITManager.deviceModel)
                    LabeledContent("iOS", value: UIDevice.current.systemVersion)
                    LabeledContent("RAM total", value: Self.format(ProcessInfo.processInfo.physicalMemory))
                    LabeledContent("Memória disponível para a app", value: Self.format(UInt64(availableMemory)))
                    LabeledContent("Núcleos", value: "\(ProcessInfo.processInfo.activeProcessorCount)")
                    LabeledContent("TXM", value: jit.txm.rawValue)
                    LabeledContent("JIT", value: jit.state.title)
                }
                Section {
                    ForEach(EngineComponent.allCases) { component in
                        LabeledContent(component.title) {
                            if component.isBundled {
                                Text(component.version.map { "Incluído (\($0.prefix(8)))" } ?? "Incluído")
                                    .foregroundStyle(.green)
                            } else {
                                Text("Em falta").foregroundStyle(.orange)
                            }
                        }
                    }
                } header: {
                    Text("Motor")
                } footer: {
                    Text("Os jogos só arrancam quando os três componentes estiverem incluídos. Vê docs/PLANO.md no repositório.")
                }
            }
            .navigationTitle("Sistema")
            .refreshable { availableMemory = os_proc_available_memory() }
        }
    }

    private static func format(_ bytes: UInt64) -> String {
        ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .memory)
    }
}
