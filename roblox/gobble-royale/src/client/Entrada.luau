-- Controlos: rato (a bola segue o cursor), teclado (WASD/setas), toque (arrastar) e comando.
-- Devolve sempre uma direção na simulação (x para a direita, y para "baixo" no ecrã) e o dash.
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Gobble.Config)

local Entrada = {}

local modo = "rato" -- "rato" | "teclado" | "toque" | "comando"
local dashAte = 0
local rato1 = false
local toque = { id = nil :: InputObject?, origem = Vector2.zero, pos = Vector2.zero }
local manipulo = Vector2.zero
Entrada.toque = toque

local function teclado(): (number, number)
	local x, y = 0, 0
	if UserInputService:IsKeyDown(Enum.KeyCode.A) or UserInputService:IsKeyDown(Enum.KeyCode.Left) then
		x -= 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.D) or UserInputService:IsKeyDown(Enum.KeyCode.Right) then
		x += 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.W) or UserInputService:IsKeyDown(Enum.KeyCode.Up) then
		y -= 1
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.S) or UserInputService:IsKeyDown(Enum.KeyCode.Down) then
		y += 1
	end
	return x, y
end

function Entrada.iniciar()
	if UserInputService.TouchEnabled and not UserInputService.MouseEnabled then
		modo = "toque"
	elseif UserInputService.GamepadEnabled and not UserInputService.MouseEnabled then
		modo = "comando"
	end
	UserInputService.InputBegan:Connect(function(input, processado)
		local t = input.UserInputType
		if t == Enum.UserInputType.Keyboard then
			local k = input.KeyCode
			if k == Enum.KeyCode.Space then
				dashAte = os.clock() + 0.25
			elseif k == Enum.KeyCode.W or k == Enum.KeyCode.A or k == Enum.KeyCode.S or k == Enum.KeyCode.D
				or k == Enum.KeyCode.Up or k == Enum.KeyCode.Down or k == Enum.KeyCode.Left or k == Enum.KeyCode.Right then
				modo = "teclado"
			end
		elseif t == Enum.UserInputType.MouseButton1 then
			if not processado then
				rato1 = true
				dashAte = os.clock() + 0.25
			end
		elseif t == Enum.UserInputType.Gamepad1 then
			modo = "comando"
			if input.KeyCode == Enum.KeyCode.ButtonA or input.KeyCode == Enum.KeyCode.ButtonR2 then
				dashAte = os.clock() + 0.25
			end
		elseif t == Enum.UserInputType.Touch then
			modo = "toque"
			if not processado and not toque.id then
				toque.id = input
				toque.origem = Vector2.new(input.Position.X, input.Position.Y)
				toque.pos = toque.origem
			end
		end
	end)
	UserInputService.InputChanged:Connect(function(input)
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseMovement then
			if modo ~= "rato" and input.Delta.Magnitude > 2 then
				modo = "rato"
			end
		elseif t == Enum.UserInputType.Gamepad1 and input.KeyCode == Enum.KeyCode.Thumbstick1 then
			local p = Vector2.new(input.Position.X, -input.Position.Y)
			manipulo = if p.Magnitude > 0.15 then p else Vector2.zero
			if p.Magnitude > 0.15 then
				modo = "comando"
			end
		elseif t == Enum.UserInputType.Touch and toque.id == input then
			toque.pos = Vector2.new(input.Position.X, input.Position.Y)
		end
	end)
	UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			rato1 = false
		elseif toque.id == input then
			toque.id = nil
		end
	end)
end

-- Botão de dash no ecrã (telemóvel)
function Entrada.dash()
	dashAte = os.clock() + 0.25
end

-- meuPos: posição do meu blob na simulação; meuRaio: raio em unidades da simulação
function Entrada.ler(meuX: number?, meuY: number?, meuRaio: number?): (number, number, boolean)
	local dash = os.clock() < dashAte or rato1
	local x, y = 0, 0
	if modo == "teclado" then
		x, y = teclado()
	elseif modo == "comando" then
		x, y = manipulo.X, manipulo.Y
	elseif modo == "toque" then
		if toque.id then
			local d = toque.pos - toque.origem
			x, y = d.X / 60, d.Y / 60
		end
	elseif meuX and meuY then
		-- Rato: a bola vai para o ponto do chão debaixo do cursor.
		local cam = workspace.CurrentCamera
		local m = UserInputService:GetMouseLocation()
		local raio = cam:ViewportPointToRay(m.X, m.Y)
		if raio.Direction.Y < -0.01 then
			local t = -raio.Origin.Y / raio.Direction.Y
			local p = raio.Origin + raio.Direction * t
			local px, py = Config.daMundo(p)
			local dx, dy = px - meuX, py - meuY
			local d = math.sqrt(dx * dx + dy * dy)
			local cheio = (meuRaio or 14) * 2 + 60
			if d > 1 then
				local mag = math.min(1, d / cheio)
				x, y = dx / d * mag, dy / d * mag
			end
		end
	end
	local m = math.sqrt(x * x + y * y)
	if m > 1 then
		x, y = x / m, y / m
	end
	return x, y, dash
end

function Entrada.modo(): string
	return modo
end

return Entrada
