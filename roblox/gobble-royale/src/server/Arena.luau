-- Constrói a arena física (chão, grelha, paredes). Os blobs e a comida são desenhados no cliente.
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Gobble.Config)

local Arena = {}

local function peca(props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		(p :: any)[k] = v
	end
	return p
end

function Arena.construir()
	-- O Baseplate e o SpawnLocation do sítio vazio ficam por baixo do chão; tiramo-los em jogo.
	for _, nome in { "Baseplate", "SpawnLocation" } do
		local o = workspace:FindFirstChild(nome)
		if o then
			o:Destroy()
		end
	end

	local antiga = workspace:FindFirstChild("Arena")
	if antiga then
		antiga:Destroy()
	end
	local pasta = Instance.new("Folder")
	pasta.Name = "Arena"

	local lado = Config.ARENA * Config.ESCALA
	peca({
		Name = "Chao",
		Size = Vector3.new(lado, 2, lado),
		Position = Vector3.new(0, -1, 0),
		Color = Color3.fromRGB(38, 30, 72),
		Material = Enum.Material.SmoothPlastic,
		CanCollide = true,
		Parent = pasta,
	})
	-- Fora da arena: chão mais escuro para não parecer que acaba no vazio.
	peca({
		Name = "Fora",
		Size = Vector3.new(lado * 3, 2, lado * 3),
		Position = Vector3.new(0, -1.2, 0),
		Color = Color3.fromRGB(18, 14, 36),
		Material = Enum.Material.SmoothPlastic,
		Parent = pasta,
	})

	local passo = 40
	local n = math.floor(lado / passo)
	for i = 1, n - 1 do
		local o = -lado / 2 + i * passo
		peca({
			Name = "LinhaX",
			Size = Vector3.new(0.3, 0.05, lado),
			Position = Vector3.new(o, 0.02, 0),
			Color = Color3.fromRGB(70, 58, 130),
			Material = Enum.Material.Neon,
			Transparency = 0.6,
			Parent = pasta,
		})
		peca({
			Name = "LinhaZ",
			Size = Vector3.new(lado, 0.05, 0.3),
			Position = Vector3.new(0, 0.02, o),
			Color = Color3.fromRGB(70, 58, 130),
			Material = Enum.Material.Neon,
			Transparency = 0.6,
			Parent = pasta,
		})
	end

	local alturaParede = 6
	for _, d in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
		local horizontal = d[1] == 0
		peca({
			Name = "Parede",
			Size = if horizontal then Vector3.new(lado + 4, alturaParede, 2) else Vector3.new(2, alturaParede, lado + 4),
			Position = Vector3.new(d[1] * (lado / 2 + 1), alturaParede / 2, d[2] * (lado / 2 + 1)),
			Color = Color3.fromRGB(255, 95, 162),
			Material = Enum.Material.Neon,
			Transparency = 0.2,
			Parent = pasta,
		})
	end

	pasta.Parent = workspace

	Lighting.ClockTime = 14
	Lighting.Brightness = 2
	Lighting.Ambient = Color3.fromRGB(110, 100, 150)
	Lighting.OutdoorAmbient = Color3.fromRGB(140, 130, 180)
end

return Arena
