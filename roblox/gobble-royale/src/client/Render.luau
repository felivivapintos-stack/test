-- Desenha o mundo no cliente: blobs (bolas com olhos), comida, picos e a câmara.
-- Tudo aqui são peças locais (só este jogador as vê); o servidor só manda números.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Gobble.Config)

local E = Config.ESCALA
local paraMundo = Config.paraMundo
local raio = Config.raio

local Render = {}

local pasta: Folder
local pastaComida: Folder
local pastaBlobs: Folder
local pastaPicos: Folder

Render.meuId = 0
Render.blobs = {} :: { [number]: any }
Render.info = {} :: { [number]: any }
local comida: { [number]: any } = {}
local moveis: { [number]: any } = {}
local voando: { any } = {}
local picos: { [number]: any } = {}
local tempo = 0

local CORES_MIGALHA = {}
for i, h in Config.CRUMB_COLORS do
	CORES_MIGALHA[i - 1] = Color3.fromHex(h)
end

local function cor(c: string?): Color3
	if c == nil then
		return Color3.new(1, 1, 1)
	end
	if c == "rainbow" then
		return Color3.fromHSV((tempo * 0.25) % 1, 0.75, 1)
	end
	local ok, res = pcall(Color3.fromHex, c)
	return if ok then res else Color3.new(1, 1, 1)
end

local function bola(props): Part
	local p = Instance.new("Part")
	p.Shape = Enum.PartType.Ball
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		(p :: any)[k] = v
	end
	return p
end

function Render.iniciar()
	local antigo = workspace:FindFirstChild("GobbleLocal")
	if antigo then
		antigo:Destroy()
	end
	pasta = Instance.new("Folder")
	pasta.Name = "GobbleLocal"
	pastaComida = Instance.new("Folder")
	pastaComida.Name = "Comida"
	pastaComida.Parent = pasta
	pastaBlobs = Instance.new("Folder")
	pastaBlobs.Name = "Blobs"
	pastaBlobs.Parent = pasta
	pastaPicos = Instance.new("Folder")
	pastaPicos.Name = "Picos"
	pastaPicos.Parent = pasta
	pasta.Parent = workspace
end

-- Blobs --------------------------------------------------------------------
local function criarVisualBlob(id: number)
	local inf = Render.info[id]
	local c = cor(inf and inf.color)
	local m = Instance.new("Model")
	m.Name = "Blob" .. id
	local corpo = bola({ Name = "Corpo", Color = c, Size = Vector3.one * 2 })
	corpo.Parent = m
	local olhos = {}
	for i = 1, 2 do
		local branco = bola({ Name = "Olho", Color = Color3.new(1, 1, 1), Size = Vector3.one })
		local pupila = bola({ Name = "Pupila", Color = Color3.fromRGB(20, 16, 30), Size = Vector3.one * 0.5 })
		branco.Parent = m
		pupila.Parent = m
		olhos[i] = { branco, pupila }
	end
	local anel = Instance.new("Part")
	anel.Name = "Anel"
	anel.Shape = Enum.PartType.Cylinder
	anel.Anchored = true
	anel.CanCollide = false
	anel.CanQuery = false
	anel.CanTouch = false
	anel.CastShadow = false
	anel.Material = Enum.Material.Neon
	anel.Transparency = 1
	anel.Size = Vector3.new(0.1, 2, 2)
	anel.Parent = m

	local bb = Instance.new("BillboardGui")
	bb.Name = "Nome"
	bb.Adornee = corpo
	bb.LightInfluence = 0
	bb.Size = UDim2.fromScale(6, 1.5)
	bb.StudsOffsetWorldSpace = Vector3.new(0, 2, 0)
	bb.MaxDistance = 400
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.TextColor3 = Color3.new(1, 1, 1)
	t.Text = if inf then inf.name else "?"
	local st = Instance.new("UIStroke")
	st.Thickness = 2
	st.Parent = t
	t.Parent = bb
	bb.Parent = corpo
	m.Parent = pastaBlobs
	return { modelo = m, corpo = corpo, olhos = olhos, anel = anel, nome = t, bb = bb, diam = 0 }
end

local function desenharBlob(b, eu)
	local v = b.visual
	local r = raio(b.mass) * E
	local pos = paraMundo(b.x, b.y, r)
	local d = r * 2
	if math.abs(v.diam - d) > 0.02 then
		v.diam = d
		v.corpo.Size = Vector3.one * d
		v.bb.Size = UDim2.fromScale(math.max(4, d * 1.4), math.max(1, d * 0.35))
		v.bb.StudsOffsetWorldSpace = Vector3.new(0, r + 0.6 + d * 0.15, 0)
		for _, o in v.olhos do
			o[1].Size = Vector3.one * r * 0.42
			o[2].Size = Vector3.one * r * 0.22
		end
	end
	local inf = Render.info[b.id]
	local c = cor(inf and inf.color)
	if inf and inf.color == "rainbow" then
		v.corpo.Color = c
	end
	-- Escudo depois de nascer: pisca.
	v.corpo.Transparency = if b.flags // 2 % 2 == 1 then 0.35 + 0.25 * math.sin(tempo * 18) else 0
	v.corpo.CFrame = CFrame.new(pos)

	local fx, fz = math.cos(b.ang), math.sin(b.ang)
	local frente = Vector3.new(fx, 0, fz)
	local direita = Vector3.new(-fz, 0, fx)
	for i, o in v.olhos do
		local lado = if i == 1 then -1 else 1
		local base = pos + frente * r * 0.72 + direita * lado * r * 0.36 + Vector3.yAxis * r * 0.38
		o[1].CFrame = CFrame.new(base)
		o[2].CFrame = CFrame.new(base + frente * r * 0.14)
	end

	-- Anel no chão: verde = petisco, vermelho = foge.
	local anel = v.anel
	if eu and b.id ~= eu.id and eu.mass > 0 then
		local ratio = 1.25
		if eu.mass >= b.mass * ratio then
			anel.Color = Color3.fromRGB(125, 255, 107)
			anel.Transparency = 0.45
		elseif b.mass >= eu.mass * ratio then
			anel.Color = Color3.fromRGB(255, 70, 90)
			anel.Transparency = 0.35
		else
			anel.Transparency = 1
		end
	else
		anel.Transparency = 1
	end
	if anel.Transparency < 1 then
		anel.Size = Vector3.new(0.08, d * 1.25, d * 1.25)
		anel.CFrame = CFrame.new(paraMundo(b.x, b.y, 0.06)) * CFrame.Angles(0, 0, math.pi / 2)
	end
end

function Render.definirInfo(lista)
	local novo = {}
	for _, inf in lista do
		novo[inf.id] = inf
	end
	Render.info = novo
	for id, b in Render.blobs do
		local inf = novo[id]
		if not inf then
			b.visual.modelo:Destroy()
			Render.blobs[id] = nil
		else
			b.visual.nome.Text = inf.name
			if inf.color ~= "rainbow" then
				b.visual.corpo.Color = cor(inf.color)
			end
		end
	end
end

function Render.aplicarEstado(lista, listaMoveis)
	local vistos = {}
	for _, n in lista do
		vistos[n.id] = true
		local b = Render.blobs[n.id]
		if not b then
			b = { id = n.id, x = n.x, y = n.y, mass = n.mass, visual = criarVisualBlob(n.id) }
			Render.blobs[n.id] = b
		end
		b.tx, b.ty, b.tmass, b.flags, b.ang = n.x, n.y, n.mass, n.flags, n.ang
		-- Saltos grandes (renascer): não interpolar.
		if math.abs(b.x - n.x) + math.abs(b.y - n.y) > 400 then
			b.x, b.y, b.mass = n.x, n.y, n.mass
		end
	end
	-- Quem não veio está morto (ou saiu): esconder.
	for id, b in Render.blobs do
		if not vistos[id] then
			b.visual.modelo:Destroy()
			Render.blobs[id] = nil
		end
	end
	for _, m in listaMoveis do
		local f = moveis[m[1]]
		if f then
			f.tx, f.ty = m[2], m[3]
		end
	end
end

-- Comida ---------------------------------------------------------------------
local function raioComida(kind: string, mass: number): number
	if kind == "crumb" then
		return 4 + mass * 1.5
	elseif kind == "bit" then
		return math.min(14, 4 + math.sqrt(mass) * 1.6)
	end
	return raio(mass) * 0.85
end

function Render.adicionarComida(lista)
	for _, n in lista do
		if comida[n.id] then
			continue
		end
		local kind = Config.TIPO_NOME[n.kind] or "crumb"
		local r = raioComida(kind, n.mass) * E
		local c, mat
		if kind == "crumb" then
			c, mat = CORES_MIGALHA[n.hue] or Color3.new(1, 1, 1), Enum.Material.SmoothPlastic
		elseif kind == "critter" then
			c, mat = (CORES_MIGALHA[n.hue] or Color3.new(1, 1, 1)):Lerp(Color3.new(0, 0, 0), 0.25), Enum.Material.SmoothPlastic
		elseif kind == "gold" then
			c, mat = Color3.fromRGB(255, 205, 60), Enum.Material.Neon
		else
			local inf = Render.info[n.src]
			c, mat = cor(inf and inf.color), Enum.Material.SmoothPlastic
		end
		local p = bola({ Color = c, Material = mat, Size = Vector3.one * r * 2 })
		p.CFrame = CFrame.new(paraMundo(n.x, n.y, r))
		p.Parent = pastaComida
		local f = { id = n.id, kind = kind, x = n.x, y = n.y, tx = n.x, ty = n.y, vx = n.vx, vy = n.vy, r = r, parte = p }
		comida[n.id] = f
		if kind == "critter" or kind == "gold" then
			moveis[n.id] = f
		end
	end
end

function Render.removerComida(lista)
	for _, rm in lista do
		local f = comida[rm[1]]
		if not f then
			continue
		end
		comida[rm[1]] = nil
		moveis[rm[1]] = nil
		local quem = Render.blobs[rm[2]]
		if quem then
			-- Voa para a boca de quem a comeu.
			table.insert(voando, { parte = f.parte, quem = quem, t = 0, de = f.parte.Position, tam = f.parte.Size })
		else
			f.parte:Destroy()
		end
	end
end

-- Picos ----------------------------------------------------------------------
local function criarPico(id, x, y, mass)
	local r = raio(mass) * 0.9 * E
	local m = Instance.new("Model")
	m.Name = "Pico" .. id
	local centro = bola({ Name = "Centro", Color = Color3.fromRGB(60, 56, 80), Material = Enum.Material.Metal, Size = Vector3.one * r * 1.5 })
	centro.Parent = m
	local espinhos = {}
	local eixos = {
		CFrame.Angles(0, 0, 0),
		CFrame.Angles(0, math.pi / 2, 0),
		CFrame.Angles(0, 0, math.pi / 2),
		CFrame.Angles(0, math.pi / 4, math.pi / 4),
		CFrame.Angles(0, -math.pi / 4, math.pi / 4),
		CFrame.Angles(math.pi / 4, 0, math.pi / 4),
		CFrame.Angles(-math.pi / 4, 0, math.pi / 4),
	}
	for i, ang in eixos do
		local e = Instance.new("Part")
		e.Name = "Espinho"
		e.Shape = Enum.PartType.Cylinder
		e.Anchored = true
		e.CanCollide = false
		e.CanQuery = false
		e.CanTouch = false
		e.CastShadow = false
		e.Material = Enum.Material.Neon
		e.Color = Color3.fromRGB(255, 70, 100)
		e.Size = Vector3.new(r * 2.3, r * 0.22, r * 0.22)
		e.Parent = m
		espinhos[i] = { e, ang }
	end
	m.Parent = pastaPicos
	return { modelo = m, centro = centro, espinhos = espinhos, x = x, y = y, r = r, mass = mass, rot = (id % 7) }
end

function Render.definirPicos(lista)
	local vistos = {}
	for _, s in lista do
		local id = s[1]
		vistos[id] = true
		if not picos[id] then
			picos[id] = criarPico(id, s[2], s[3], s[4])
		end
	end
	for id, p in picos do
		if not vistos[id] then
			p.modelo:Destroy()
			picos[id] = nil
		end
	end
end

-- Limpar tudo (nova ronda)
function Render.limpar()
	for _, b in Render.blobs do
		b.visual.modelo:Destroy()
	end
	for _, f in comida do
		f.parte:Destroy()
	end
	for _, v in voando do
		v.parte:Destroy()
	end
	for _, p in picos do
		p.modelo:Destroy()
	end
	Render.blobs = {}
	comida = {}
	moveis = {}
	voando = {}
	picos = {}
end

function Render.meu()
	return Render.blobs[Render.meuId]
end

-- Por frame ------------------------------------------------------------------
function Render.atualizar(dt: number)
	tempo += dt
	local a = 1 - math.exp(-14 * dt)
	for _, b in Render.blobs do
		b.x += (b.tx - b.x) * a
		b.y += (b.ty - b.y) * a
		b.mass += (b.tmass - b.mass) * a
	end
	local eu = Render.meu()
	for _, b in Render.blobs do
		desenharBlob(b, eu)
	end

	local am = 1 - math.exp(-10 * dt)
	for _, f in moveis do
		f.x += (f.tx - f.x) * am
		f.y += (f.ty - f.y) * am
		f.parte.CFrame = CFrame.new(paraMundo(f.x, f.y, f.r + math.abs(math.sin(tempo * 8 + f.id)) * f.r * 0.5))
	end
	-- Pedaços que escorregam depois de largados (mesmo atrito do servidor).
	for id, f in comida do
		if f.vx ~= 0 or f.vy ~= 0 then
			f.x += f.vx * dt
			f.y += f.vy * dt
			local k = 0.04 ^ dt
			f.vx *= k
			f.vy *= k
			if math.abs(f.vx) + math.abs(f.vy) < 2 then
				f.vx, f.vy = 0, 0
			end
			if not moveis[id] then
				f.parte.CFrame = CFrame.new(paraMundo(f.x, f.y, f.r))
			end
		end
	end

	for i = #voando, 1, -1 do
		local v = voando[i]
		v.t += dt / 0.14
		if v.t >= 1 or not v.quem.visual.modelo.Parent then
			v.parte:Destroy()
			table.remove(voando, i)
		else
			local alvo = v.quem.visual.corpo.Position
			v.parte.CFrame = CFrame.new(v.de:Lerp(alvo, v.t))
			v.parte.Size = v.tam * (1 - v.t * 0.7)
		end
	end

	for _, p in picos do
		p.rot += dt * 0.3
		local base = CFrame.new(paraMundo(p.x, p.y, p.r)) * CFrame.Angles(0, p.rot, 0)
		p.centro.CFrame = base
		for _, e in p.espinhos do
			e[1].CFrame = base * e[2]
		end
	end
end

-- Câmara ---------------------------------------------------------------------
local camPos: Vector3? = nil
local alvoEspetador = 0

function Render.espetar(id: number)
	alvoEspetador = id
end

function Render.camara(dt: number)
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local alvo, dist
	local eu = Render.meu()
	local seguir = eu or Render.blobs[alvoEspetador]
	if not seguir then
		-- Sem ninguém para seguir: o maior.
		local maior = nil
		for _, b in Render.blobs do
			if not maior or b.mass > maior.mass then
				maior = b
			end
		end
		seguir = maior
	end
	if seguir then
		local r = raio(seguir.mass) * E
		alvo = paraMundo(seguir.x, seguir.y, r * 0.5)
		dist = 34 + r * 7
	else
		-- Entre rondas: vista geral a rodar devagar.
		alvo = Vector3.zero
		dist = Config.ARENA * E * 0.55
	end
	local inclinacao = math.rad(58)
	local desejada = alvo + Vector3.new(0, math.sin(inclinacao) * dist, math.cos(inclinacao) * dist)
	if not seguir then
		local ang = tempo * 0.05
		local off = desejada - alvo
		desejada = alvo + Vector3.new(math.sin(ang) * off.Z, off.Y, math.cos(ang) * off.Z)
	end
	if not camPos or (camPos - desejada).Magnitude > 300 then
		camPos = desejada
	else
		camPos = (camPos :: Vector3):Lerp(desejada, 1 - math.exp(-6 * dt))
	end
	cam.CFrame = CFrame.lookAt(camPos :: Vector3, alvo)
end

return Render
