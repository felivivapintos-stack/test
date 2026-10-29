--!strict
local Util = {}

-- 75 -> "1:15"
function Util.formatarTempo(segundos: number): string
	local s = math.max(0, math.ceil(segundos))
	return string.format("%d:%02d", s // 60, s % 60)
end

function Util.escolher<T>(lista: { T }, rng: Random?): T
	local r = rng or Random.new()
	return lista[r:NextInteger(1, #lista)]
end

function Util.baralhar<T>(lista: { T }, rng: Random?): { T }
	local r = rng or Random.new()
	local copia = table.clone(lista)
	for i = #copia, 2, -1 do
		local j = r:NextInteger(1, i)
		copia[i], copia[j] = copia[j], copia[i]
	end
	return copia
end

function Util.arredondar(v: number, casas: number?): number
	local m = 10 ^ (casas or 0)
	return math.round(v * m) / m
end

-- "#7dff6b" -> Color3
function Util.hex(cor: string): Color3
	return Color3.fromHex(cor)
end

return Util
