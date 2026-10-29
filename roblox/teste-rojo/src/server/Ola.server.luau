-- Se isto aparecer no Output do Studio ao carregar em Play, o Rojo está a funcionar.
print("[teste-rojo] Olá do servidor! O Rojo está ligado.")

-- Cria uma peça verde no meio do mapa para veres a ligação também no 3D.
local peca = Instance.new("Part")
peca.Name = "PecaDoRojo"
peca.Size = Vector3.new(6, 1, 6)
peca.Position = Vector3.new(0, 5, 0)
peca.Anchored = true
peca.BrickColor = BrickColor.new("Lime green")
peca.Parent = workspace
