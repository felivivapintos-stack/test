--!strict
-- Fase da ronda, guardada em atributos do ReplicatedStorage para todos os clientes verem.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Fase = {}

export type NomeFase = "AEspera" | "Intervalo" | "Ronda" | "Resultados"

function Fase.definir(nome: NomeFase, duracao: number?)
	ReplicatedStorage:SetAttribute("Fase", nome)
	ReplicatedStorage:SetAttribute("FaseFim", if duracao then workspace:GetServerTimeNow() + duracao else 0)
end

function Fase.atual(): NomeFase
	return (ReplicatedStorage:GetAttribute("Fase") or "AEspera") :: NomeFase
end

-- Segundos que faltam para a fase acabar (0 se não tiver fim).
function Fase.restante(): number
	local fim = ReplicatedStorage:GetAttribute("FaseFim") :: number?
	if not fim or fim == 0 then
		return 0
	end
	return math.max(0, fim - workspace:GetServerTimeNow())
end

function Fase.aoMudar(fn: (NomeFase) -> ())
	return ReplicatedStorage:GetAttributeChangedSignal("Fase"):Connect(function()
		fn(Fase.atual())
	end)
end

return Fase
