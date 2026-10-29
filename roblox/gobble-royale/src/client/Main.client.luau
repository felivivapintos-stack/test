-- Cliente do Gobble Royale: recebe o estado do servidor, desenha-o e envia os controlos.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Config = require(ReplicatedStorage.Gobble.Config)
local Protocolo = require(ReplicatedStorage.Gobble.Protocolo)
local Remotes = require(ReplicatedStorage.Comum.Remotes)
local Fase = require(ReplicatedStorage.Comum.Fase)
local Render = require(script.Parent.Render)
local Entrada = require(script.Parent.Entrada)
local Hud = require(script.Parent.Hud)

local player = Players.LocalPlayer

local rInput = Remotes.rapido("Input")
local rEscolherPoder = Remotes.evento("EscolherPoder")
local rEstado = Remotes.evento("Estado")
local rComida = Remotes.evento("Comida")
local rTudo = Remotes.evento("Tudo")
local rInfo = Remotes.evento("InfoBlobs")
local rPicos = Remotes.evento("Picos")
local rEvento = Remotes.evento("Evento")
local rEu = Remotes.evento("Eu")
local rResultados = Remotes.evento("Resultados")
local rDados = Remotes.evento("Dados")
local fLoja = Remotes.funcao("Loja")

local frenesi = false
local eu = nil -- último resumo "Eu" vindo do servidor

Render.iniciar()
Entrada.iniciar()
Hud.iniciar({
	escolherPoder = function(id)
		rEscolherPoder:FireServer(id)
	end,
	comprar = function(acao, id)
		local ok, a, b = pcall(fLoja.InvokeServer, fLoja, acao, id)
		if not ok then
			return false, "Try again"
		end
		return a, b
	end,
	dash = Entrada.dash,
})

-- Rede -----------------------------------------------------------------------
rTudo.OnClientEvent:Connect(function(info, comida, picos)
	Render.limpar()
	Render.definirInfo(info)
	Render.adicionarComida(Protocolo.lerComida(comida))
	Render.definirPicos(picos)
end)

rInfo.OnClientEvent:Connect(Render.definirInfo)
rPicos.OnClientEvent:Connect(Render.definirPicos)

rComida.OnClientEvent:Connect(function(novos, removidos)
	Render.adicionarComida(Protocolo.lerComida(novos))
	Render.removerComida(Protocolo.lerRemovidos(removidos))
end)

rEstado.OnClientEvent:Connect(function(blobs, moveis)
	Render.aplicarEstado(Protocolo.lerBlobs(blobs), Protocolo.lerMoveis(moveis))
end)

rEu.OnClientEvent:Connect(function(dados)
	eu = dados
	Hud.atualizarEu(dados)
end)

rDados.OnClientEvent:Connect(Hud.definirDados)

rResultados.OnClientEvent:Connect(function(top, meu)
	Hud.resultados(top, meu)
end)

local CORES = {
	verde = Color3.fromRGB(125, 255, 107),
	vermelho = Color3.fromRGB(255, 90, 110),
	ouro = Color3.fromRGB(255, 210, 77),
}

rEvento.OnClientEvent:Connect(function(tipo, ...)
	local a = { ... }
	if tipo == "eu" then
		Render.meuId = a[1]
		Hud.esconderMorte()
	elseif tipo == "poderes" then
		Hud.mostrarPoderes(a[1], a[2], eu and eu.perks)
	elseif tipo == "kill" then
		local eaterId, victimId, eaterName, victimName, mass = a[1], a[2], a[3], a[4], a[5]
		if eaterId == Render.meuId then
			Hud.feed(string.format("You gulped %s (+%d)", victimName, mass), CORES.verde)
		elseif victimId == Render.meuId then
			Hud.feed(string.format("%s gulped you!", eaterName), CORES.vermelho)
		else
			Hud.feed(string.format("%s gulped %s", eaterName, victimName))
		end
	elseif tipo == "morreste" then
		Hud.morte(a[1], a[2])
		-- Segue quem nos comeu enquanto esperamos.
		for id, inf in Render.info do
			if inf.name == a[1] then
				Render.espetar(id)
				break
			end
		end
	elseif tipo == "renasceste" then
		Hud.esconderMorte()
		Hud.banner("Back for seconds!", "You are shielded for 3 seconds", 2.5)
	elseif tipo == "frenesi" then
		frenesi = true
		Hud.banner("GOLDEN FRENZY!", "30 seconds left · golden snacks everywhere", 3)
	elseif tipo == "pico" then
		Hud.feed(string.format("Ouch! Spike took %d mass", a[1]), CORES.vermelho)
	elseif tipo == "comeuPico" then
		Hud.feed("Crunch! You ate a spike", CORES.verde)
	elseif tipo == "ouro" then
		Hud.feed(string.format("Golden snack! +%d", a[1]), CORES.ouro)
	end
end)

-- Fases ------------------------------------------------------------------------
local function aoMudarFase(f)
	Hud.fase(f)
	if f == "Ronda" then
		frenesi = false
		Hud.esconderResultados()
		local dicas = if UserInputService.TouchEnabled then "Drag anywhere to move · tap ⚡ to dash" else "Move the mouse (or WASD) to steer · Space or click to dash"
		Hud.banner("Eat smaller. Run from bigger!", dicas, 5)
	elseif f == "Intervalo" then
		Render.limpar()
		Render.meuId = 0
		eu = nil
		Hud.atualizarEu(nil)
	elseif f == "Resultados" then
		Render.meuId = 0
	end
end
Fase.aoMudar(aoMudarFase)
aoMudarFase(Fase.atual())

-- Teclas 1/2/3 para os poderes
UserInputService.InputBegan:Connect(function(input, processado)
	if processado then
		return
	end
	local k = input.KeyCode
	if k == Enum.KeyCode.One then
		Hud.teclaPoder(1)
	elseif k == Enum.KeyCode.Two then
		Hud.teclaPoder(2)
	elseif k == Enum.KeyCode.Three then
		Hud.teclaPoder(3)
	elseif k == Enum.KeyCode.DPadLeft then
		Hud.teclaPoder(1)
	elseif k == Enum.KeyCode.DPadUp then
		Hud.teclaPoder(2)
	elseif k == Enum.KeyCode.DPadRight then
		Hud.teclaPoder(3)
	end
end)

-- Ciclo por frame -------------------------------------------------------------
local accInput, accHud = 0, 0
local ultimoEnvio = { x = 0, y = 0, dash = false }
local ultimoTempo = 0

RunService.RenderStepped:Connect(function(dt)
	Render.atualizar(dt)
	Render.camara(dt)
	Hud.atualizarFrame()

	accHud += dt
	if accHud >= 0.2 then
		accHud = 0
		local fase = Fase.atual()
		Hud.atualizarTopo(fase, Fase.restante(), frenesi)
		if fase == "Ronda" then
			local lista = {}
			for id, b in Render.blobs do
				local inf = Render.info[id]
				table.insert(lista, { name = if inf then inf.name else "?", mass = b.mass, eu = id == Render.meuId })
			end
			table.sort(lista, function(x, y)
				return x.mass > y.mass
			end)
			for i, l in lista do
				l.rank = i
			end
			Hud.atualizarClassificacao(lista)
		end
	end

	accInput += dt
	if accInput >= 0.05 then
		accInput = 0
		local meu = Render.meu()
		local x, y, dash
		if meu then
			x, y, dash = Entrada.ler(meu.x, meu.y, Config.raio(meu.mass))
		else
			x, y, dash = 0, 0, false
		end
		-- Só envia se mudou ou de 0,25 s em 0,25 s (a rede pode perder pacotes).
		local agora = os.clock()
		local mudou = math.abs(x - ultimoEnvio.x) > 0.02 or math.abs(y - ultimoEnvio.y) > 0.02 or dash ~= ultimoEnvio.dash
		if meu and (mudou or agora - ultimoTempo > 0.25) then
			rInput:FireServer(x, y, dash)
			ultimoEnvio.x, ultimoEnvio.y, ultimoEnvio.dash = x, y, dash
			ultimoTempo = agora
		end
	end
end)

print(("[Gobble Royale] Cliente pronto para %s."):format(player.Name))
