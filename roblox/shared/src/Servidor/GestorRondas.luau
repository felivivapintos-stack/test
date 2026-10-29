-- Ciclo de rondas: AEspera -> Intervalo -> Ronda -> Resultados -> Intervalo ...
-- Cada jogo passa callbacks; o gestor trata do tempo e da fase replicada.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Fase = require(ReplicatedStorage.Comum.Fase)

export type Opcoes = {
	intervalo: number, -- segundos antes de cada ronda
	duracao: number, -- duração máxima da ronda
	resultados: number, -- segundos a mostrar resultados
	minJogadores: number?, -- por defeito 1
	aoComecar: () -> (),
	aoAcabar: () -> (),
	deveAcabar: (() -> boolean)?, -- acabar antes do tempo (ex.: só resta um)
}

local GestorRondas = {}

function GestorRondas.iniciar(op: Opcoes)
	local minimo = op.minJogadores or 1
	task.spawn(function()
		while true do
			if #Players:GetPlayers() < minimo then
				Fase.definir("AEspera")
				repeat
					task.wait(1)
				until #Players:GetPlayers() >= minimo
			end

			Fase.definir("Intervalo", op.intervalo)
			task.wait(op.intervalo)
			if #Players:GetPlayers() < minimo then
				continue
			end

			Fase.definir("Ronda", op.duracao)
			local ok, erro = pcall(op.aoComecar)
			if not ok then
				warn("[GestorRondas] aoComecar falhou:", erro)
			end
			local fim = os.clock() + op.duracao
			while os.clock() < fim do
				task.wait(0.25)
				if #Players:GetPlayers() == 0 then
					break
				end
				if op.deveAcabar and op.deveAcabar() then
					break
				end
			end

			Fase.definir("Resultados", op.resultados)
			ok, erro = pcall(op.aoAcabar)
			if not ok then
				warn("[GestorRondas] aoAcabar falhou:", erro)
			end
			task.wait(op.resultados)
		end
	end)
end

return GestorRondas
