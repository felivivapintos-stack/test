-- Atalhos para criar interfaces em código, com o mesmo tema em todos os jogos.
local Players = game:GetService("Players")

local UI = {}

UI.tema = {
	fundo = Color3.fromRGB(24, 20, 48),
	painel = Color3.fromRGB(40, 34, 78),
	texto = Color3.fromRGB(255, 255, 255),
	suave = Color3.fromRGB(190, 182, 230),
	destaque = Color3.fromRGB(125, 255, 107),
	perigo = Color3.fromRGB(255, 90, 110),
	ouro = Color3.fromRGB(255, 210, 77),
	fonte = Enum.Font.FredokaOne,
	fonteTexto = Enum.Font.GothamMedium,
}

-- UI.criar("Frame", { Size = ..., Parent = ... }, { filhos })
function UI.criar(classe: string, props: { [string]: any }?, filhos: { Instance }?): any
	local inst = Instance.new(classe)
	local pai = nil
	for k, v in props or {} do
		if k == "Parent" then
			pai = v
		else
			(inst :: any)[k] = v
		end
	end
	for _, f in filhos or {} do
		f.Parent = inst
	end
	if pai then
		inst.Parent = pai
	end
	return inst
end

function UI.cantos(raio: number?): UICorner
	return UI.criar("UICorner", { CornerRadius = UDim.new(0, raio or 12) })
end

function UI.contorno(cor: Color3?, espessura: number?): UIStroke
	return UI.criar("UIStroke", {
		Color = cor or Color3.new(0, 0, 0),
		Thickness = espessura or 2,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

-- ScreenGui no PlayerGui do jogador local (não depende de haver personagem).
function UI.ecra(nome: string, ordem: number?): ScreenGui
	local gui = Players.LocalPlayer:WaitForChild("PlayerGui")
	local antigo = gui:FindFirstChild(nome)
	if antigo then
		antigo:Destroy()
	end
	return UI.criar("ScreenGui", {
		Name = nome,
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = ordem or 0,
		Parent = gui,
	})
end

function UI.texto(props: { [string]: any }): TextLabel
	local base = {
		BackgroundTransparency = 1,
		Font = UI.tema.fonte,
		TextColor3 = UI.tema.texto,
		TextScaled = true,
		Text = "",
	}
	for k, v in props do
		if k ~= "Contorno" then
			base[k] = v
		end
	end
	local t = UI.criar("TextLabel", base)
	if props.Contorno ~= false then
		UI.criar("UIStroke", { Thickness = 2, Transparency = 0.3, Parent = t })
	end
	return t
end

function UI.botao(props: { [string]: any }, aoCarregar: (() -> ())?): TextButton
	local base = {
		BackgroundColor3 = UI.tema.destaque,
		Font = UI.tema.fonte,
		TextColor3 = Color3.fromRGB(20, 20, 40),
		TextScaled = true,
		AutoButtonColor = true,
		Text = "",
	}
	for k, v in props do
		base[k] = v
	end
	local b = UI.criar("TextButton", base, { UI.cantos(12) })
	UI.criar("UIPadding", {
		PaddingLeft = UDim.new(0, 8),
		PaddingRight = UDim.new(0, 8),
		PaddingTop = UDim.new(0, 4),
		PaddingBottom = UDim.new(0, 4),
		Parent = b,
	})
	if aoCarregar then
		b.Activated:Connect(aoCarregar)
	end
	return b
end

function UI.painel(props: { [string]: any }): Frame
	local base = {
		BackgroundColor3 = UI.tema.painel,
		BackgroundTransparency = 0.08,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
	}
	for k, v in props do
		base[k] = v
	end
	return UI.criar("Frame", base, { UI.cantos(18), UI.contorno(Color3.fromRGB(0, 0, 0), 3) })
end

return UI
