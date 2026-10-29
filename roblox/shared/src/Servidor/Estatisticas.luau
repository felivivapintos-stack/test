-- leaderstats: a tabela de pontuação que o Roblox mostra no canto do ecrã.
local Estatisticas = {}

function Estatisticas.criar(player: Player, nomes: { string })
	local pasta = player:FindFirstChild("leaderstats") or Instance.new("Folder")
	pasta.Name = "leaderstats"
	for _, nome in nomes do
		if not pasta:FindFirstChild(nome) then
			local v = Instance.new("IntValue")
			v.Name = nome
			v.Parent = pasta
		end
	end
	pasta.Parent = player
end

function Estatisticas.definir(player: Player, nome: string, valor: number)
	local pasta = player:FindFirstChild("leaderstats")
	local v = pasta and pasta:FindFirstChild(nome)
	if v then
		(v :: IntValue).Value = math.floor(valor + 0.5)
	end
end

return Estatisticas
