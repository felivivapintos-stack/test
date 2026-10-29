-- Gravação dos dados de cada jogador com DataStore.
-- Uso:
--   DadosJogador.configurar("GobbleRoyale_v1", { moedas = 0, ... })
--   local dados = DadosJogador.obter(player)       -- espera até carregar
--   DadosJogador.alterar(player, function(d) d.moedas += 10 end)
-- Sem acesso às APIs no Studio passa a modo memória: funciona, mas não grava entre sessões.
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local DadosJogador = {}

local store: DataStore? = nil
local padrao: { [string]: any } = {}
local cache: { [Player]: { [string]: any } } = {}
local carregados: { [Player]: boolean } = {}
local modoMemoria = false
local configurado = false

local mudou = Instance.new("BindableEvent")
-- Dispara (player, dados) sempre que os dados mudam ou acabam de carregar.
DadosJogador.Mudou = mudou.Event

local function copiaFunda(t: any): any
	if type(t) ~= "table" then
		return t
	end
	local c = {}
	for k, v in t do
		c[k] = copiaFunda(v)
	end
	return c
end

-- Junta campos novos do padrão aos dados antigos (para quando o jogo ganha campos).
local function completar(dados: { [string]: any }, base: { [string]: any })
	for k, v in base do
		if dados[k] == nil then
			dados[k] = copiaFunda(v)
		elseif type(v) == "table" and type(dados[k]) == "table" and #v == 0 then
			completar(dados[k], v)
		end
	end
end

local function chave(player: Player): string
	return "j_" .. player.UserId
end

local function tentar<T>(fn: () -> T): (boolean, T | string)
	for tentativa = 1, 3 do
		local ok, res = pcall(fn)
		if ok then
			return true, res
		end
		local msg = tostring(res)
		if msg:find("API") or msg:find("Studio") or msg:find("publish") then
			return false, res
		end
		task.wait(tentativa)
	end
	return false, "falhou 3 vezes"
end

local function carregar(player: Player)
	local dados = copiaFunda(padrao)
	if store and not modoMemoria then
		local ok, res = tentar(function()
			return (store :: DataStore):GetAsync(chave(player))
		end)
		if ok then
			if type(res) == "table" then
				dados = res :: any
				completar(dados, padrao)
			end
		else
			if RunService:IsStudio() then
				modoMemoria = true
				warn(
					"[DadosJogador] Sem acesso ao DataStore no Studio; a usar memória. "
						.. "Para gravar: Home > Game Settings > Security > Enable Studio Access to API Services."
				)
			else
				warn("[DadosJogador] Não consegui carregar", player.Name, res)
			end
		end
	end
	if player.Parent ~= Players then
		return
	end
	cache[player] = dados
	carregados[player] = true
	mudou:Fire(player, dados)
end

local function gravar(player: Player)
	local dados = cache[player]
	if not dados or not store or modoMemoria then
		return
	end
	local ok, res = tentar(function()
		return (store :: DataStore):UpdateAsync(chave(player), function()
			return dados
		end)
	end)
	if not ok then
		warn("[DadosJogador] Não consegui gravar", player.Name, res)
	end
end

function DadosJogador.configurar(nomeStore: string, valoresPadrao: { [string]: any })
	assert(not configurado, "DadosJogador.configurar só pode ser chamado uma vez")
	configurado = true
	padrao = valoresPadrao
	local ok, res = pcall(function()
		return DataStoreService:GetDataStore(nomeStore)
	end)
	if ok then
		store = res
	else
		modoMemoria = true
		warn("[DadosJogador] DataStore indisponível; a usar memória.", res)
	end

	Players.PlayerAdded:Connect(carregar)
	for _, p in Players:GetPlayers() do
		task.spawn(carregar, p)
	end
	Players.PlayerRemoving:Connect(function(p)
		if carregados[p] then
			gravar(p)
		end
		cache[p] = nil
		carregados[p] = nil
	end)
	game:BindToClose(function()
		local pendentes = 0
		for p in cache do
			pendentes += 1
			task.spawn(function()
				gravar(p)
				pendentes -= 1
			end)
		end
		local limite = os.clock() + 25
		while pendentes > 0 and os.clock() < limite do
			task.wait(0.1)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(120)
			for p in cache do
				task.spawn(gravar, p)
			end
		end
	end)
end

-- Espera até os dados carregarem (máx. 15 s). Devolve nil se o jogador saiu.
function DadosJogador.obter(player: Player): { [string]: any }?
	local limite = os.clock() + 15
	while not carregados[player] and player.Parent == Players and os.clock() < limite do
		task.wait(0.1)
	end
	return cache[player]
end

-- Devolve já o que houver (pode ser nil se ainda não carregou).
function DadosJogador.agora(player: Player): { [string]: any }?
	return cache[player]
end

function DadosJogador.alterar(player: Player, fn: ({ [string]: any }) -> ())
	local dados = cache[player]
	if not dados then
		return
	end
	fn(dados)
	mudou:Fire(player, dados)
end

return DadosJogador
