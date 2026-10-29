-- Servidor do Gobble Royale: rondas, simulação, rede, loja e gravação.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage.Gobble.Config)
local Protocolo = require(ReplicatedStorage.Gobble.Protocolo)
local Remotes = require(ReplicatedStorage.Comum.Remotes)
local Fase = require(ReplicatedStorage.Comum.Fase)
local GestorRondas = require(ServerScriptService.ComumServidor.GestorRondas)
local DadosJogador = require(ServerScriptService.ComumServidor.DadosJogador)
local Estatisticas = require(ServerScriptService.ComumServidor.Estatisticas)
local Sim = require(script.Parent.Sim)
local Arena = require(script.Parent.Arena)

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

Players.CharacterAutoLoads = false
Arena.construir()

DadosJogador.configurar("GobbleRoyale_v1", Config.DADOS_PADRAO)

local S = nil -- simulação da ronda atual (nil fora das rondas)
local blobDe: { [Player]: any } = {}
local fimRonda = 0

local function corDaSkin(id: string): string
	local s = Config.SKIN_POR_ID[id] or Config.SKINS[1]
	return s.color
end

local function upg(dados, id: string): number
	return (dados and dados.upg and dados.upg[id]) or 0
end

-- Rede -------------------------------------------------------------------
local function listaInfo()
	local out = {}
	for _, b in S.blobs do
		table.insert(out, {
			id = b.id,
			name = b.name,
			color = b.color,
			userId = if b.player then b.player.UserId else 0,
		})
	end
	return out
end

local function listaPicos()
	local out = {}
	for _, s in S.spikes do
		if not s.dead then
			table.insert(out, { s.id, math.round(s.x), math.round(s.y), s.mass })
		end
	end
	return out
end

local function enviarTudo(alvo: Player?)
	if not S then
		return
	end
	local comida = Protocolo.codificarComida(S.food, Config.TIPO)
	if alvo then
		rTudo:FireClient(alvo, listaInfo(), comida, listaPicos())
	else
		rTudo:FireAllClients(listaInfo(), comida, listaPicos())
	end
end

local function enviarDados(player: Player, dados)
	rDados:FireClient(player, dados)
	Estatisticas.definir(player, "Coins", dados.moedas)
	Estatisticas.definir(player, "Wins", dados.vitorias)
end

DadosJogador.Mudou:Connect(enviarDados)

-- Jogadores ---------------------------------------------------------------
local function criarBlob(player: Player)
	if not S or blobDe[player] then
		return
	end
	local dados = DadosJogador.obter(player)
	if not dados or player.Parent ~= Players or not S or blobDe[player] then
		return
	end
	local b = S:addBlob({
		name = player.DisplayName,
		color = corDaSkin(dados.skin),
		skin = dados.skin,
		player = player,
		mass = Config.MASSA_INICIAL + 3 * upg(dados, "start"),
		skill = 1,
		dashMul = 0.92 ^ upg(dados, "dash"),
	})
	blobDe[player] = b
	enviarTudo(player)
	rEvento:FireClient(player, "eu", b.id)
end

-- Bots preenchem a arena até MIN_BLOBS; saem quando entram humanos.
local function equilibrarBots()
	if not S then
		return
	end
	local humanos, bots = 0, {}
	for _, b in S.blobs do
		if b.player then
			humanos += 1
		else
			table.insert(bots, b)
		end
	end
	local total = humanos + #bots
	while total < Config.MIN_BLOBS do
		S:addBot()
		total += 1
	end
	if total > Config.MIN_BLOBS and #bots > 0 then
		-- Tira primeiro os bots mortos ou mais pequenos (não se nota).
		table.sort(bots, function(a, b)
			local ma = if a.alive then a.mass else -1
			local mb = if b.alive then b.mass else -1
			return ma < mb
		end)
		local i = 1
		while total > Config.MIN_BLOBS and i <= #bots do
			S:removeBlob(bots[i])
			total -= 1
			i += 1
		end
	end
end

local function aoEntrar(player: Player)
	Estatisticas.criar(player, { "Coins", "Wins" })
	local dados = DadosJogador.obter(player)
	if dados then
		enviarDados(player, dados)
	end
	if S then
		criarBlob(player)
	end
end
Players.PlayerAdded:Connect(aoEntrar)
for _, p in Players:GetPlayers() do
	task.spawn(aoEntrar, p)
end

Players.PlayerRemoving:Connect(function(player)
	local b = blobDe[player]
	blobDe[player] = nil
	if S and b then
		S:removeBlob(b)
	end
end)

rInput.OnServerEvent:Connect(function(player, x, y, dash)
	local b = blobDe[player]
	if not b or type(x) ~= "number" or type(y) ~= "number" then
		return
	end
	if x ~= x or y ~= y then -- NaN
		return
	end
	local m = math.sqrt(x * x + y * y)
	if m > 1 then
		x, y = x / m, y / m
	end
	b.input.x, b.input.y, b.input.dash = x, y, dash == true
end)

rEscolherPoder.OnServerEvent:Connect(function(player, id)
	local b = blobDe[player]
	if S and b and type(id) == "string" then
		S:choosePerk(b, id)
	end
end)

-- Loja -------------------------------------------------------------------
fLoja.OnServerInvoke = function(player, acao, id)
	if type(acao) ~= "string" or type(id) ~= "string" then
		return false, "?"
	end
	local dados = DadosJogador.agora(player)
	if not dados then
		return false, "A carregar..."
	end
	if acao == "skin" then
		local skin = Config.SKIN_POR_ID[id]
		if not skin then
			return false, "?"
		end
		local tem = table.find(dados.skins, id) ~= nil
		if not tem and dados.moedas < skin.price then
			return false, "Not enough coins"
		end
		DadosJogador.alterar(player, function(d)
			if not tem then
				d.moedas -= skin.price
				table.insert(d.skins, id)
			end
			d.skin = id
		end)
		local b = blobDe[player]
		if S and b then
			b.skin, b.color = id, skin.color
			S.infoDirty = true
		end
		return true, if tem then "Equipped" else "Unlocked!"
	elseif acao == "upg" then
		local u = Config.UPGRADE_POR_ID[id]
		if not u then
			return false, "?"
		end
		local nivel = upg(dados, id)
		local custo = u.costs[nivel + 1]
		if not custo then
			return false, "Maxed"
		end
		if dados.moedas < custo then
			return false, "Not enough coins"
		end
		DadosJogador.alterar(player, function(d)
			d.moedas -= custo
			d.upg[id] = nivel + 1
		end)
		return true, "Upgraded!"
	end
	return false, "?"
end

-- Rondas -----------------------------------------------------------------
local function comecarRonda()
	S = Sim.new(math.random(1, 2 ^ 30), 0.75)
	table.clear(blobDe)
	equilibrarBots()
	enviarTudo(nil)
	for _, p in Players:GetPlayers() do
		task.spawn(criarBlob, p)
	end
	fimRonda = os.clock() + Config.TEMPO_RONDA
end

local function moedasPor(b, lugar: number, dados): number
	local base = b.peak / 8 + b.kills * 10 + b.gold + (Config.PLACE_BONUS[lugar] or 0)
	return math.round(base * (1 + 0.15 * upg(dados, "coins")))
end

local function acabarRonda()
	if not S then
		return
	end
	local lista = S:classificacao()
	local top = {}
	for i, b in lista do
		if i > 10 then
			break
		end
		table.insert(top, {
			name = b.name,
			mass = math.round(if b.alive then b.mass else 0),
			kills = b.kills,
			userId = if b.player then b.player.UserId else 0,
			color = b.color,
		})
	end
	for lugar, b in lista do
		local player = b.player
		if not player or player.Parent ~= Players then
			continue
		end
		local dados = DadosJogador.agora(player)
		if not dados then
			continue
		end
		local ganho = moedasPor(b, lugar, dados)
		-- Na primeira ronda tudo é recorde; não vale a pena anunciar.
		local primeira = dados.rondas == 0
		local recordes = {}
		DadosJogador.alterar(player, function(d)
			d.moedas += ganho
			d.rondas += 1
			if lugar == 1 then
				d.vitorias += 1
			end
			if lugar < d.melhor.lugar then
				d.melhor.lugar = lugar
				table.insert(recordes, "best rank")
			end
			if b.peak > d.melhor.massa then
				d.melhor.massa = math.round(b.peak)
				table.insert(recordes, "biggest ever")
			end
			if b.kills > d.melhor.gulps then
				d.melhor.gulps = b.kills
				table.insert(recordes, "most gulps")
			end
		end)
		rResultados:FireClient(player, top, {
			lugar = lugar,
			total = #lista,
			moedas = ganho,
			pico = math.round(b.peak),
			kills = b.kills,
			nivel = b.level,
			recordes = if primeira then {} else recordes,
		})
	end
	S = nil
	table.clear(blobDe)
end

GestorRondas.iniciar({
	intervalo = Config.INTERVALO,
	duracao = Config.TEMPO_RONDA,
	resultados = Config.RESULTADOS,
	aoComecar = comecarRonda,
	aoAcabar = acabarRonda,
})

-- Ciclo da simulação e envio -----------------------------------------------
local acc, accRede, accEu, accBots = 0, 0, 0, 0

local function tratarEventos()
	for _, e in S.events do
		local t = e.tipo
		if t == "poderes" then
			local p = e.blob.player
			if p then
				rEvento:FireClient(p, "poderes", e.nivel, e.opcoes)
			end
		elseif t == "kill" then
			rEvento:FireAllClients("kill", e.eater.id, e.victim.id, e.eater.name, e.victim.name, math.round(e.mass))
			if e.victim.player then
				rEvento:FireClient(e.victim.player, "morreste", e.eater.name, e.victim.respawnT)
			end
		elseif t == "frenesi" then
			rEvento:FireAllClients("frenesi")
		elseif t == "pico" then
			if e.blob.player then
				rEvento:FireClient(e.blob.player, "pico", math.round(e.lost))
			end
		elseif t == "comeuPico" then
			if e.blob.player then
				rEvento:FireClient(e.blob.player, "comeuPico")
			end
		elseif t == "comeu" then
			if e.kind == "gold" then
				rEvento:FireClient(e.blob.player, "ouro", math.round(e.gain))
			end
		elseif t == "renasceu" then
			if e.blob.player then
				rEvento:FireClient(e.blob.player, "renasceste")
			end
		end
	end
	table.clear(S.events)
end

local function enviarRede()
	local moveis = {}
	for _, f in S.food do
		if not f.dead and (f.kind == "critter" or f.kind == "gold") then
			table.insert(moveis, f)
		end
	end
	if #S.foodAdded > 0 or #S.foodRemoved > 0 then
		rComida:FireAllClients(
			Protocolo.codificarComida(S.foodAdded, Config.TIPO),
			Protocolo.codificarRemovidos(S.foodRemoved)
		)
		table.clear(S.foodAdded)
		table.clear(S.foodRemoved)
	end
	if S.infoDirty then
		S.infoDirty = false
		rInfo:FireAllClients(listaInfo())
	end
	if S.spikesDirty then
		S.spikesDirty = false
		rPicos:FireAllClients(listaPicos())
	end
	rEstado:FireAllClients(Protocolo.codificarBlobs(S.blobs), Protocolo.codificarMoveis(moveis))
end

local function enviarEu()
	for player, b in blobDe do
		rEu:FireClient(player, {
			nivel = b.level,
			xp = b.xp,
			xpPrecisa = Config.xpNeed(b.level + 1),
			kills = b.kills,
			combo = b.combo,
			dash = if b.dashCd > 0 then 1 - b.dashCd / Sim.dashCooldown(b) else 1,
			podeDash = b.mass >= 14,
			vivo = b.alive,
			renascer = b.respawnT,
			massa = b.mass,
			pico = b.peak,
			pendentes = b.pendingLevels,
			perks = b.perks,
		})
	end
end

RunService.Heartbeat:Connect(function(dt)
	if not S then
		return
	end
	dt = math.min(dt, 0.25)
	acc += dt
	local timeLeft = math.max(0, fimRonda - os.clock())
	while acc >= Config.TICK do
		acc -= Config.TICK
		S:step(Config.TICK, timeLeft)
	end
	tratarEventos()

	accRede += dt
	if accRede >= Config.REDE then
		accRede = 0
		enviarRede()
	end
	accEu += dt
	if accEu >= 0.2 then
		accEu = 0
		enviarEu()
	end
	accBots += dt
	if accBots >= 1 then
		accBots = 0
		equilibrarBots()
	end
end)

print("[Gobble Royale] Servidor pronto. Fase:", Fase.atual())
