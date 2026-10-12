import SwiftUI

struct JITView: View {
    @EnvironmentObject private var jit: JITManager

    var body: some View {
        NavigationStack {
            List {
                Section("Estado") {
                    LabeledContent("JIT", value: jit.state.title)
                    LabeledContent("TXM", value: jit.txm.rawValue)
                    LabeledContent("get-task-allow", value: jit.hasGetTaskAllow ? "Sim" : "Não")
                }
                Section {
                    Button("Ativar JIT com o StikDebug") { jit.requestViaStikDebug() }
                    Button("Esperar por outro depurador") { jit.startWaiting() }
                } footer: {
                    Text("Precisas do StikDebug instalado, com o ficheiro de emparelhamento e o LocalDevVPN ligado.")
                }
                Section("Registo") {
                    ForEach(Array(jit.log.enumerated()), id: \.offset) { _, line in
                        Text(line).font(.system(.footnote, design: .monospaced))
                    }
                }
            }
            .navigationTitle("JIT")
        }
    }
}
