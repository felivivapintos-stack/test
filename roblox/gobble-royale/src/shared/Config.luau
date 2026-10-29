-- Tabelas e constantes do Gobble Royale (vindas do original: data.js e sim.js).
-- A simulação usa as mesmas unidades do original (píxeis); ESCALA converte para studs.
local Config = {}

Config.ESCALA = 0.1 -- 1 unidade da simulação = 0,1 stud
Config.TICK = 1 / 30 -- passo da simulação no servidor
Config.REDE = 1 / 15 -- envio de estado aos clientes

-- Rondas (o original tinha 3 min a solo; aqui 5 min com mais gente)
Config.TEMPO_RONDA = 300
Config.TEMPO_FRENESI = 30 -- últimos segundos: chuva de ouro
Config.INTERVALO = 15
Config.RESULTADOS = 10

-- Arena maior que a original (3200) para 20–30 jogadores
Config.ARENA = 4800
Config.MIN_BLOBS = 16 -- bots preenchem até aqui, nunca há arena vazia
Config.MIGALHAS = 1600
Config.BICHOS = 90
Config.OUROS = 4
Config.OUROS_FRENESI = 16
Config.PICOS = { 40, 40, 40, 40, 40, 40, 100, 100, 100, 100, 100, 250, 250, 250, 250, 600, 600 }
Config.RENASCER_JOGADOR = 3
Config.MASSA_INICIAL = 10

Config.PERKS = {
	{ id = "speed", name = "Turbo Legs", desc = "+10% speed", icon = "💨", max = 5 },
	{ id = "magnet", name = "Snack Magnet", desc = "Pull crumbs from further away", icon = "🧲", max = 5 },
	{ id = "jaws", name = "Mega Jaws", desc = "Eat rivals closer to your size", icon = "🦷", max = 3 },
	{ id = "dash", name = "Quick Dash", desc = "Dash recharges 22% faster", icon = "⚡", max = 4 },
	{ id = "glutton", name = "Glutton", desc = "+15% mass from snacks", icon = "🍩", max = 5 },
	{ id = "skin", name = "Thick Skin", desc = "Lose less to spikes, dashes and melting", icon = "🛡️", max = 3 },
	{ id = "combo", name = "Combo King", desc = "Combos last longer", icon = "🔥", max = 4 },
	{ id = "hunter", name = "Hunter", desc = "+20% mass from eating rivals", icon = "🎯", max = 4 },
	{ id = "goldnose", name = "Gold Nose", desc = "Golden snacks give +50% mass", icon = "✨", max = 3 },
	{ id = "chonk", name = "Instant Chonk", desc = "Grow 15% right now", icon = "🍔", max = 6 },
}
Config.PERK_POR_ID = {}
for _, p in Config.PERKS do
	Config.PERK_POR_ID[p.id] = p
end

Config.BOT_NAMES = {
	"NomNom", "Chompy", "Big Tony", "xX_Gulp_Xx", "Blobert", "Mochi", "Sir Snacks", "Munchkin", "Gloop",
	"Pudding", "Jellybean", "Marshmallow", "Burp King", "Wobbles", "Taco", "Dumpling", "Noodle",
	"Grumble", "Squishy", "Bubbles", "Tofu", "Biscuit", "Pickles", "Waffle", "Captain Crumb", "Meatball",
	"Lil Gobbler", "Snacky", "Doughnut", "Gummy", "Nugget", "Pancake",
}

Config.BOT_COLORS = {
	"#ff6b8b", "#ffb84d", "#5ad1ff", "#b48cff", "#ff8f5a", "#4de3a5",
	"#ffd84d", "#ff7ad9", "#7d9bff", "#9be15d", "#ff5a5a", "#5af0e0",
}

Config.CRUMB_COLORS = { "#ff6b8b", "#ffd84d", "#5ad1ff", "#7dff6b", "#ff9f43", "#c58bff" }

-- price em moedas; 0 = grátis
Config.SKINS = {
	{ id = "lime", name = "Limey", color = "#7dff6b", price = 0 },
	{ id = "berry", name = "Berry", color = "#ff5fa2", price = 60 },
	{ id = "ocean", name = "Ocean", color = "#4fc3ff", price = 120 },
	{ id = "mango", name = "Mango", color = "#ffb02e", price = 200 },
	{ id = "grape", name = "Grape", color = "#a77bff", price = 300 },
	{ id = "cherry", name = "Cherry", color = "#ff4848", price = 450 },
	{ id = "mint", name = "Minty", color = "#5cf2c8", price = 650 },
	{ id = "cool", name = "Cool Cat", color = "#ffd84d", price = 900 },
	{ id = "void", name = "Void", color = "#3a2f6b", price = 1300 },
	{ id = "rainbow", name = "Rainbow", color = "rainbow", price = 2000 },
}
Config.SKIN_POR_ID = {}
for _, s in Config.SKINS do
	Config.SKIN_POR_ID[s.id] = s
end

-- Melhorias permanentes compradas entre rondas
Config.UPGRADES = {
	{ id = "start", name = "Bigger Start", desc = "+3 starting mass", costs = { 80, 160, 300, 500, 800 } },
	{ id = "dash", name = "Dash Training", desc = "Dash recharges 8% faster", costs = { 100, 220, 420, 700 } },
	{ id = "coins", name = "Piggy Bank", desc = "+15% coins per round", costs = { 120, 260, 480, 800 } },
}
Config.UPGRADE_POR_ID = {}
for _, u in Config.UPGRADES do
	Config.UPGRADE_POR_ID[u.id] = u
end

-- Bónus de moedas por lugar no fim da ronda
Config.PLACE_BONUS = { 60, 35, 20, 12, 10, 8, 6, 4, 3, 2, 1 }

Config.DADOS_PADRAO = {
	moedas = 0,
	skin = "lime",
	skins = { "lime" },
	upg = { start = 0, dash = 0, coins = 0 },
	rondas = 0,
	vitorias = 0,
	melhor = { lugar = 99, massa = 0, gulps = 0 },
}

-- IDs de áudio (rbxassetid). Vazios até escolhermos sons da biblioteca do Roblox.
Config.SONS = {
	comer = "",
	ouro = "",
	gulp = "",
	pico = "",
	dash = "",
	nivel = "",
	frenesi = "",
	morte = "",
	vitoria = "",
}

-- Tipos de comida na rede
Config.TIPO = { crumb = 1, critter = 2, gold = 3, bit = 4 }
Config.TIPO_NOME = { "crumb", "critter", "gold", "bit" }

-- Simulação (x, y) -> mundo. A arena fica centrada na origem; o chão está em Y = 0.
function Config.paraMundo(x: number, y: number, altura: number?): Vector3
	local e = Config.ESCALA
	return Vector3.new(x * e - Config.ARENA * e / 2, altura or 0, y * e - Config.ARENA * e / 2)
end

function Config.daMundo(p: Vector3): (number, number)
	local e = Config.ESCALA
	return (p.X + Config.ARENA * e / 2) / e, (p.Z + Config.ARENA * e / 2) / e
end

function Config.raio(massa: number): number
	return 4.5 * math.sqrt(massa)
end

function Config.xpNeed(nivel: number): number
	return math.round(12 * 1.42 ^ nivel)
end

return Config
