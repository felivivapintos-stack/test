-- Interface do Gobble Royale: tempo, classificação, massa/nível, poderes, mortes, resultados e loja.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Config = require(ReplicatedStorage.Gobble.Config)
local UI = require(ReplicatedStorage.Comum.UI)
local Util = require(ReplicatedStorage.Comum.Util)

local T = UI.tema
local Hud = {}

local gui: ScreenGui
local el = {} :: { [string]: any }
local acoes = {} :: { escolherPoder: (string) -> (), comprar: (string, string) -> (boolean, string), dash: () -> () }
local dados = nil
local opcoesPoder: { string }? = nil
local separadorLoja = "skins"
local feedLinhas: { TextLabel } = {}

local function texto(props)
	return UI.texto(props)
end

-- Topo: tempo e fase ----------------------------------------------------------
local function criarTopo()
	el.tempo = texto({
		Name = "Tempo",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 44),
		Size = UDim2.fromOffset(220, 46),
		Text = "",
		Parent = gui,
	})
	el.fase = texto({
		Name = "Fase",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 90),
		Size = UDim2.fromOffset(420, 26),
		TextColor3 = T.suave,
		Text = "",
		Parent = gui,
	})
	el.banner = UI.criar("Frame", {
		Name = "Banner",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0.2, 0),
		Size = UDim2.new(0.8, 0, 0, 100),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = gui,
	})
	el.bannerTitulo = texto({ Size = UDim2.new(1, 0, 0, 60), TextColor3 = T.ouro, Parent = el.banner })
	el.bannerDica = texto({
		Position = UDim2.new(0, 0, 0, 62),
		Size = UDim2.new(1, 0, 0, 28),
		Font = T.fonteTexto,
		Parent = el.banner,
	})
end

local bannerId = 0
function Hud.banner(titulo: string, dica: string?, segundos: number?)
	bannerId += 1
	local meu = bannerId
	el.bannerTitulo.Text = titulo
	el.bannerDica.Text = dica or ""
	el.banner.Visible = true
	task.delay(segundos or 4, function()
		if bannerId == meu then
			el.banner.Visible = false
		end
	end)
end

function Hud.atualizarTopo(fase: string, restante: number, frenesi: boolean)
	if fase == "Ronda" then
		el.tempo.Text = Util.formatarTempo(restante)
		el.tempo.TextColor3 = if frenesi then T.ouro elseif restante < 60 then T.perigo else T.texto
		el.fase.Text = if frenesi then "GOLDEN FRENZY!" else "Be the biggest when the clock hits zero"
	elseif fase == "Intervalo" then
		el.tempo.Text = Util.formatarTempo(restante)
		el.tempo.TextColor3 = T.destaque
		el.fase.Text = "Next round starting..."
	elseif fase == "Resultados" then
		el.tempo.Text = ""
		el.fase.Text = "Round over!"
	else
		el.tempo.Text = ""
		el.fase.Text = "Waiting for players..."
	end
end

-- Classificação (canto superior direito) ---------------------------------------
local function criarClassificacao()
	local f = UI.criar("Frame", {
		Name = "Classificacao",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -12, 0, 60),
		Size = UDim2.fromOffset(210, 9 * 22 + 12),
		BackgroundColor3 = T.fundo,
		BackgroundTransparency = 0.35,
		Parent = gui,
	}, { UI.cantos(12) })
	el.linhas = {}
	for i = 1, 9 do
		el.linhas[i] = texto({
			Position = UDim2.fromOffset(8, 6 + (i - 1) * 22),
			Size = UDim2.new(1, -16, 0, 20),
			TextXAlignment = Enum.TextXAlignment.Left,
			Font = T.fonteTexto,
			Text = "",
			Parent = f,
		})
	end
	el.classificacao = f
end

-- lista: { {name, mass, eu, rank} } já ordenada
function Hud.atualizarClassificacao(lista)
	local mostrar = {}
	local euDentro = false
	for i = 1, math.min(8, #lista) do
		table.insert(mostrar, lista[i])
		if lista[i].eu then
			euDentro = true
		end
	end
	if not euDentro then
		for _, l in lista do
			if l.eu then
				table.insert(mostrar, l)
				break
			end
		end
	end
	for i, linha in el.linhas do
		local l = mostrar[i]
		if l then
			linha.Text = string.format("%d. %s  %d", l.rank, l.name, math.floor(l.mass))
			linha.TextColor3 = if l.eu then T.destaque else T.texto
		else
			linha.Text = ""
		end
	end
	el.classificacao.Visible = #lista > 0
end

-- Fundo: massa, nível, dash -------------------------------------------------------
local function criarFundo()
	local f = UI.criar("Frame", {
		Name = "Eu",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -16),
		Size = UDim2.fromOffset(340, 74),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = gui,
	})
	el.massa = texto({ Size = UDim2.new(1, 0, 0, 30), Text = "", Parent = f })
	local barra = UI.criar("Frame", {
		Position = UDim2.fromOffset(0, 34),
		Size = UDim2.new(1, 0, 0, 14),
		BackgroundColor3 = T.fundo,
		BackgroundTransparency = 0.2,
		Parent = f,
	}, { UI.cantos(7) })
	el.xp = UI.criar("Frame", {
		Size = UDim2.fromScale(0, 1),
		BackgroundColor3 = Color3.fromRGB(180, 140, 255),
		Parent = barra,
	}, { UI.cantos(7) })
	el.nivel = texto({
		Position = UDim2.fromOffset(0, 50),
		Size = UDim2.new(0.5, 0, 0, 20),
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = T.fonteTexto,
		Parent = f,
	})
	el.dashTxt = texto({
		Position = UDim2.new(0.5, 0, 0, 50),
		Size = UDim2.new(0.5, 0, 0, 20),
		TextXAlignment = Enum.TextXAlignment.Right,
		Font = T.fonteTexto,
		Parent = f,
	})
	el.eu = f

	-- Botão de dash para telemóvel
	el.botaoDash = UI.botao({
		Name = "Dash",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -24, 1, -110),
		Size = UDim2.fromOffset(96, 96),
		Text = "⚡",
		BackgroundColor3 = T.ouro,
		Visible = UserInputService.TouchEnabled,
		Parent = gui,
	}, function()
		acoes.dash()
	end)
	el.botaoDash:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
end

function Hud.atualizarEu(eu)
	if not eu then
		el.eu.Visible = false
		return
	end
	el.eu.Visible = eu.vivo
	el.massa.Text = string.format("Mass %d", math.floor(eu.massa))
	el.xp.Size = UDim2.fromScale(math.clamp(eu.xp / math.max(1, eu.xpPrecisa), 0, 1), 1)
	el.nivel.Text = string.format("Lv %d · Gulps %d", eu.nivel, eu.kills)
	if not eu.podeDash then
		el.dashTxt.Text = "Dash: need mass 14"
		el.dashTxt.TextColor3 = T.suave
	elseif eu.dash >= 1 then
		el.dashTxt.Text = "⚡ Dash ready"
		el.dashTxt.TextColor3 = T.ouro
	else
		el.dashTxt.Text = string.format("⚡ %d%%", math.floor(eu.dash * 100))
		el.dashTxt.TextColor3 = T.suave
	end
	if eu.combo and eu.combo >= 3 then
		el.massa.Text ..= string.format("  ·  combo x%d", eu.combo)
	end
end

-- Poderes (não pausam o jogo: escolher depressa é estratégia) ------------------------
local function criarPoderes()
	local f = UI.criar("Frame", {
		Name = "Poderes",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -100),
		Size = UDim2.fromOffset(640, 150),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = gui,
	})
	el.poderesTitulo = texto({ Size = UDim2.new(1, 0, 0, 30), TextColor3 = Color3.fromRGB(200, 170, 255), Parent = f })
	el.botoesPoder = {}
	for i = 1, 3 do
		local b = UI.botao({
			Position = UDim2.new((i - 1) / 3, 4, 0, 36),
			Size = UDim2.new(1 / 3, -8, 0, 110),
			BackgroundColor3 = T.painel,
			TextColor3 = T.texto,
			TextScaled = false,
			TextSize = 16,
			TextWrapped = true,
			Font = T.fonteTexto,
			Parent = f,
		}, function()
			if opcoesPoder and opcoesPoder[i] then
				acoes.escolherPoder(opcoesPoder[i])
				Hud.esconderPoderes()
			end
		end)
		UI.contorno(Color3.fromRGB(180, 140, 255), 2).Parent = b
		el.botoesPoder[i] = b
	end
	el.poderes = f
	-- Em ecrãs estreitos (telemóvel) encolhe.
	local function ajustar()
		local largura = workspace.CurrentCamera.ViewportSize.X
		f.Size = UDim2.fromOffset(math.min(640, largura - 24), 150)
	end
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(ajustar)
	ajustar()
end

function Hud.mostrarPoderes(nivel: number, opcoes: { string }, perks: { [string]: number }?)
	opcoesPoder = opcoes
	el.poderesTitulo.Text = string.format("Level %d! Pick a power (1 · 2 · 3)", nivel)
	for i, b in el.botoesPoder do
		local p = Config.PERK_POR_ID[opcoes[i]]
		if p then
			local lv = perks and perks[p.id] or 0
			local etiqueta = if lv > 0 then string.format("Lv %d → %d", lv, lv + 1) else "NEW"
			b.Text = string.format("%s %s\n%s\n%s", p.icon, p.name, p.desc, etiqueta)
			b.Visible = true
		else
			b.Visible = false
		end
	end
	el.poderes.Visible = true
end

function Hud.esconderPoderes()
	opcoesPoder = nil
	el.poderes.Visible = false
end

function Hud.teclaPoder(i: number)
	if opcoesPoder and opcoesPoder[i] then
		acoes.escolherPoder(opcoesPoder[i])
		Hud.esconderPoderes()
	end
end

-- Feed de gulps (canto superior esquerdo) ------------------------------------------
local function criarFeed()
	local f = UI.criar("Frame", {
		Name = "Feed",
		Position = UDim2.fromOffset(12, 60),
		Size = UDim2.fromOffset(300, 5 * 22),
		BackgroundTransparency = 1,
		Parent = gui,
	})
	for i = 1, 5 do
		feedLinhas[i] = texto({
			Position = UDim2.fromOffset(0, (i - 1) * 22),
			Size = UDim2.new(1, 0, 0, 20),
			TextXAlignment = Enum.TextXAlignment.Left,
			Font = T.fonteTexto,
			Text = "",
			Parent = f,
		})
	end
end

local feed: { { texto: string, cor: Color3 } } = {}
function Hud.feed(t: string, c: Color3?)
	table.insert(feed, 1, { texto = t, cor = c or T.texto })
	if #feed > 5 then
		table.remove(feed)
	end
	for i, linha in feedLinhas do
		local item = feed[i]
		linha.Text = if item then item.texto else ""
		linha.TextColor3 = if item then item.cor else T.texto
		linha.TextTransparency = (i - 1) * 0.15
	end
end

-- Morte ---------------------------------------------------------------------------
local function criarMorte()
	local f = UI.painel({ Name = "Morte", Size = UDim2.fromOffset(420, 160), Visible = false, Parent = gui })
	el.morteTitulo = texto({ Position = UDim2.fromOffset(16, 16), Size = UDim2.new(1, -32, 0, 50), TextColor3 = T.perigo, Parent = f })
	el.morteDica = texto({ Position = UDim2.fromOffset(16, 76), Size = UDim2.new(1, -32, 0, 30), Font = T.fonteTexto, Parent = f })
	el.morteConta = texto({ Position = UDim2.fromOffset(16, 112), Size = UDim2.new(1, -32, 0, 30), TextColor3 = T.suave, Parent = f })
	el.morte = f
end

local QUIPS = { "Should have run.", "You were delicious.", "Snack status: achieved.", "Big fish, little fish.", "That was a mouthful.", "Nom." }
local fimMorte = 0
function Hud.morte(por: string, segundos: number)
	el.morteTitulo.Text = "Gulped by " .. por .. "!"
	el.morteDica.Text = Util.escolher(QUIPS)
	fimMorte = os.clock() + segundos
	el.morte.Visible = true
	Hud.esconderPoderes()
end

function Hud.esconderMorte()
	el.morte.Visible = false
end

-- Lobby, resultados e loja --------------------------------------------------------
local function criarLobby()
	local f = UI.criar("Frame", {
		Name = "Lobby",
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.new(0, 16, 1, -16),
		Size = UDim2.fromOffset(260, 100),
		BackgroundTransparency = 1,
		Parent = gui,
	})
	el.moedas = texto({ Size = UDim2.new(1, 0, 0, 34), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = T.ouro, Text = "🪙 0", Parent = f })
	el.botaoLoja = UI.botao({
		Position = UDim2.fromOffset(0, 44),
		Size = UDim2.fromOffset(150, 48),
		Text = "🛒 Shop",
		Parent = f,
	}, function()
		Hud.abrirLoja(not el.loja.Visible)
	end)
	el.lobby = f
end

local function criarResultados()
	local f = UI.painel({ Name = "Resultados", Size = UDim2.fromOffset(460, 420), Visible = false, Parent = gui })
	el.resTitulo = texto({ Position = UDim2.fromOffset(16, 14), Size = UDim2.new(1, -32, 0, 54), Parent = f })
	el.resSub = texto({ Position = UDim2.fromOffset(16, 70), Size = UDim2.new(1, -32, 0, 28), Font = T.fonteTexto, TextColor3 = T.ouro, Parent = f })
	el.resLinhas = {}
	for i = 1, 10 do
		el.resLinhas[i] = texto({
			Position = UDim2.fromOffset(28, 106 + (i - 1) * 26),
			Size = UDim2.new(1, -56, 0, 24),
			TextXAlignment = Enum.TextXAlignment.Left,
			Font = T.fonteTexto,
			Parent = f,
		})
	end
	el.resultados = f
end

function Hud.resultados(top, meu)
	local win = meu.lugar == 1
	el.resTitulo.Text = if win then "👑 You're the biggest!" else string.format("#%d of %d", meu.lugar, meu.total)
	el.resTitulo.TextColor3 = if win then T.ouro else T.texto
	local extra = if #meu.recordes > 0 then "  ·  New " .. table.concat(meu.recordes, ", ") .. "!" else ""
	el.resSub.Text = string.format("+%d 🪙   peak %d · %d gulps%s", meu.moedas, meu.pico, meu.kills, extra)
	for i, linha in el.resLinhas do
		local l = top[i]
		if l then
			linha.Text = string.format("%d. %s — %d (%d gulps)", i, l.name, l.mass, l.kills)
			linha.TextColor3 = if l.userId ~= 0 then T.destaque else T.texto
		else
			linha.Text = ""
		end
	end
	el.resultados.Visible = true
	Hud.esconderPoderes()
	Hud.esconderMorte()
end

function Hud.esconderResultados()
	el.resultados.Visible = false
end

local function criarLoja()
	local f = UI.painel({ Name = "Loja", Size = UDim2.fromOffset(520, 440), Visible = false, Parent = gui })
	el.lojaTitulo = texto({ Position = UDim2.fromOffset(16, 12), Size = UDim2.new(1, -90, 0, 40), Text = "Shop", TextXAlignment = Enum.TextXAlignment.Left, Parent = f })
	UI.botao({
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -12, 0, 12),
		Size = UDim2.fromOffset(44, 40),
		Text = "✕",
		BackgroundColor3 = T.perigo,
		Parent = f,
	}, function()
		Hud.abrirLoja(false)
	end)
	UI.botao({ Position = UDim2.fromOffset(16, 60), Size = UDim2.fromOffset(140, 36), Text = "Skins", Parent = f }, function()
		separadorLoja = "skins"
		Hud.desenharLoja()
	end)
	UI.botao({ Position = UDim2.fromOffset(166, 60), Size = UDim2.fromOffset(140, 36), Text = "Upgrades", Parent = f }, function()
		separadorLoja = "upg"
		Hud.desenharLoja()
	end)
	el.lojaMsg = texto({ Position = UDim2.fromOffset(316, 64), Size = UDim2.new(1, -332, 0, 28), Font = T.fonteTexto, TextColor3 = T.ouro, Parent = f })
	el.lojaLista = UI.criar("ScrollingFrame", {
		Position = UDim2.fromOffset(16, 106),
		Size = UDim2.new(1, -32, 1, -122),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 8,
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		CanvasSize = UDim2.new(),
		Parent = f,
	}, {
		UI.criar("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	el.loja = f
	local function ajustar()
		local v = workspace.CurrentCamera.ViewportSize
		f.Size = UDim2.fromOffset(math.min(520, v.X - 24), math.min(440, v.Y - 80))
	end
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(ajustar)
	ajustar()
end

local function linhaLoja(ordem: number, nome: string, desc: string, botao: string, corBotao: Color3, ativo: boolean, fn: () -> ())
	local l = UI.criar("Frame", {
		LayoutOrder = ordem,
		Size = UDim2.new(1, -10, 0, 52),
		BackgroundColor3 = T.fundo,
		BackgroundTransparency = 0.3,
		Parent = el.lojaLista,
	}, { UI.cantos(10) })
	texto({ Position = UDim2.fromOffset(10, 4), Size = UDim2.new(1, -150, 0, 26), Text = nome, TextXAlignment = Enum.TextXAlignment.Left, Parent = l })
	texto({ Position = UDim2.fromOffset(10, 30), Size = UDim2.new(1, -150, 0, 18), Text = desc, Font = T.fonteTexto, TextColor3 = T.suave, TextXAlignment = Enum.TextXAlignment.Left, Contorno = false, Parent = l })
	local b = UI.botao({
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -8, 0.5, 0),
		Size = UDim2.fromOffset(126, 38),
		Text = botao,
		BackgroundColor3 = corBotao,
		AutoButtonColor = ativo,
		Parent = l,
	})
	if ativo then
		b.Activated:Connect(fn)
	end
	return l
end

local function comprar(acao: string, id: string)
	local ok, msg = acoes.comprar(acao, id)
	el.lojaMsg.Text = msg or ""
	el.lojaMsg.TextColor3 = if ok then T.destaque else T.perigo
end

function Hud.desenharLoja()
	for _, c in el.lojaLista:GetChildren() do
		if c:IsA("Frame") then
			c:Destroy()
		end
	end
	if not dados then
		return
	end
	if separadorLoja == "skins" then
		for i, s in Config.SKINS do
			local tem = table.find(dados.skins, s.id) ~= nil
			local equipada = dados.skin == s.id
			local botao, corB, ativo
			if equipada then
				botao, corB, ativo = "Equipped", T.suave, false
			elseif tem then
				botao, corB, ativo = "Equip", T.destaque, true
			else
				botao, corB, ativo = "🪙 " .. s.price, if dados.moedas >= s.price then T.ouro else T.suave, dados.moedas >= s.price
			end
			local l = linhaLoja(i, s.name, if s.color == "rainbow" then "Shifts through every colour" else "Blob colour", botao, corB, ativo, function()
				comprar("skin", s.id)
			end)
			local amostra = UI.criar("Frame", {
				AnchorPoint = Vector2.new(1, 0.5),
				Position = UDim2.new(1, -144, 0.5, 0),
				Size = UDim2.fromOffset(34, 34),
				BackgroundColor3 = if s.color == "rainbow" then Color3.new(1, 1, 1) else Color3.fromHex(s.color),
				Parent = l,
			}, { UI.cantos(17) })
			if s.color == "rainbow" then
				UI.criar("UIGradient", {
					Color = ColorSequence.new({
						ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 80, 80)),
						ColorSequenceKeypoint.new(0.33, Color3.fromRGB(255, 230, 80)),
						ColorSequenceKeypoint.new(0.66, Color3.fromRGB(80, 220, 255)),
						ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 100, 255)),
					}),
					Parent = amostra,
				})
			end
		end
	else
		for i, u in Config.UPGRADES do
			local nivel = dados.upg[u.id] or 0
			local custo = u.costs[nivel + 1]
			local botao, corB, ativo
			if not custo then
				botao, corB, ativo = "MAX", T.suave, false
			else
				botao, corB, ativo = "🪙 " .. custo, if dados.moedas >= custo then T.ouro else T.suave, dados.moedas >= custo
			end
			linhaLoja(i, string.format("%s  (Lv %d/%d)", u.name, nivel, #u.costs), u.desc, botao, corB, ativo, function()
				comprar("upg", u.id)
			end)
		end
	end
end

function Hud.abrirLoja(abrir: boolean)
	el.loja.Visible = abrir
	if abrir then
		el.lojaMsg.Text = ""
		Hud.desenharLoja()
	end
end

function Hud.definirDados(d)
	dados = d
	el.moedas.Text = "🪙 " .. tostring(d.moedas)
	if el.loja.Visible then
		Hud.desenharLoja()
	end
end

-- Mostrar/esconder o que faz sentido em cada fase
function Hud.fase(fase: string)
	local emRonda = fase == "Ronda"
	el.lobby.Visible = true
	el.classificacao.Visible = emRonda
	if fase == "Intervalo" then
		Hud.esconderResultados()
	end
	if not emRonda then
		Hud.esconderPoderes()
		Hud.esconderMorte()
		el.eu.Visible = false
	end
end

function Hud.atualizarFrame()
	if el.morte.Visible then
		el.morteConta.Text = string.format("Respawning in %d...", math.max(0, math.ceil(fimMorte - os.clock())))
	end
end

function Hud.iniciar(a)
	acoes = a
	gui = UI.ecra("GobbleHud", 5)
	criarTopo()
	criarClassificacao()
	criarFundo()
	criarPoderes()
	criarFeed()
	criarMorte()
	criarLobby()
	criarResultados()
	criarLoja()
end

return Hud
