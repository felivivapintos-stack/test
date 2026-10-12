import Foundation

/// What can be learned from a Windows executable's PE headers without running it.
struct PEInfo: Codable, Hashable {
    enum Machine: String, Codable {
        case x86, x64, arm64, other
    }

    enum Subsystem: String, Codable {
        case gui, console, other
    }

    enum GraphicsAPI: String, Codable {
        case d3d12, d3d11, d3d10, d3d9, d3d8, openGL, vulkan, unknown

        var title: String {
            switch self {
            case .d3d12: return "DirectX 12"
            case .d3d11: return "DirectX 11"
            case .d3d10: return "DirectX 10"
            case .d3d9: return "DirectX 9"
            case .d3d8: return "DirectX 8"
            case .openGL: return "OpenGL"
            case .vulkan: return "Vulkan"
            case .unknown: return "Desconhecida"
            }
        }
    }

    var machine: Machine
    var subsystem: Subsystem
    var imports: [String]

    var graphicsAPI: GraphicsAPI {
        let order: [(String, GraphicsAPI)] = [
            ("d3d12.dll", .d3d12), ("d3d11.dll", .d3d11), ("dxgi.dll", .d3d11),
            ("d3d10.dll", .d3d10), ("d3d10_1.dll", .d3d10), ("d3d9.dll", .d3d9),
            ("d3d8.dll", .d3d8), ("opengl32.dll", .openGL), ("vulkan-1.dll", .vulkan),
        ]
        return order.first { imports.contains($0.0) }?.1 ?? .unknown
    }

    var usesSteam: Bool {
        imports.contains("steam_api.dll") || imports.contains("steam_api64.dll")
    }

    var usesXInput: Bool {
        imports.contains { $0.hasPrefix("xinput") }
    }
}

enum PEParser {
    enum Failure: LocalizedError {
        case notPE

        var errorDescription: String? { "Não é um executável Windows válido." }
    }

    static func parse(_ url: URL) throws -> PEInfo {
        let data = try Data(contentsOf: url, options: .mappedIfSafe)
        return try parse(data)
    }

    static func parse(_ data: Data) throws -> PEInfo {
        let reader = Reader(data: data)
        guard reader.u16(0) == 0x5A4D, let peOffset = reader.u32(0x3C).map(Int.init),
              reader.u32(peOffset) == 0x0000_4550 else {
            throw Failure.notPE
        }
        let coff = peOffset + 4
        guard let machineRaw = reader.u16(coff),
              let sectionCount = reader.u16(coff + 2).map(Int.init),
              let optionalSize = reader.u16(coff + 16).map(Int.init),
              let magic = reader.u16(coff + 20) else {
            throw Failure.notPE
        }
        let optional = coff + 20
        let isPE32Plus = magic == 0x20B

        let machine: PEInfo.Machine
        switch machineRaw {
        case 0x014C: machine = .x86
        case 0x8664: machine = .x64
        case 0xAA64: machine = .arm64
        default: machine = .other
        }

        let subsystem: PEInfo.Subsystem
        switch reader.u16(optional + 68) {
        case 2: subsystem = .gui
        case 3: subsystem = .console
        default: subsystem = .other
        }

        var sections: [(va: Int, size: Int, raw: Int)] = []
        let sectionTable = optional + optionalSize
        for index in 0..<sectionCount {
            let header = sectionTable + index * 40
            guard let virtualSize = reader.u32(header + 8), let va = reader.u32(header + 12),
                  let rawSize = reader.u32(header + 16), let raw = reader.u32(header + 20) else { break }
            sections.append((Int(va), Int(max(virtualSize, rawSize)), Int(raw)))
        }
        func offset(ofRVA rva: Int) -> Int? {
            sections.first { rva >= $0.va && rva < $0.va + $0.size }.map { rva - $0.va + $0.raw }
        }

        var imports: [String] = []
        let directories = optional + (isPE32Plus ? 112 : 96)
        let directoryCount = reader.u32(optional + (isPE32Plus ? 108 : 92)) ?? 0
        if directoryCount > 1, let importRVA = reader.u32(directories + 8), importRVA != 0,
           var descriptor = offset(ofRVA: Int(importRVA)) {
            while imports.count < 512, let nameRVA = reader.u32(descriptor + 12), nameRVA != 0 {
                if let nameOffset = offset(ofRVA: Int(nameRVA)), let name = reader.cString(nameOffset) {
                    imports.append(name.lowercased())
                }
                descriptor += 20
            }
        }

        return PEInfo(machine: machine, subsystem: subsystem, imports: imports)
    }

    private struct Reader {
        let data: Data

        func u16(_ offset: Int) -> UInt16? {
            guard offset >= 0, offset + 2 <= data.count else { return nil }
            let base = data.startIndex + offset
            return UInt16(data[base]) | UInt16(data[base + 1]) << 8
        }

        func u32(_ offset: Int) -> UInt32? {
            guard let low = u16(offset), let high = u16(offset + 2) else { return nil }
            return UInt32(low) | UInt32(high) << 16
        }

        func cString(_ offset: Int) -> String? {
            guard offset >= 0, offset < data.count else { return nil }
            let start = data.startIndex + offset
            let end = data[start...].prefix(260).firstIndex(of: 0) ?? min(start + 260, data.endIndex)
            return String(data: data[start..<end], encoding: .ascii)
        }
    }
}
