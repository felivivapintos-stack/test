--!strict
-- Remotes partilhados: o servidor cria-os, o cliente espera por eles.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Remotes = {}

local function pasta(): Folder
	local f = ReplicatedStorage:FindFirstChild("Remotes")
	if f then
		return f :: Folder
	end
	if RunService:IsServer() then
		local nova = Instance.new("Folder")
		nova.Name = "Remotes"
		nova.Parent = ReplicatedStorage
		return nova
	end
	return ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

local function obter(nome: string, classe: string): Instance
	local p = pasta()
	local r = p:FindFirstChild(nome)
	if r then
		return r
	end
	if RunService:IsServer() then
		local novo = Instance.new(classe)
		novo.Name = nome
		novo.Parent = p
		return novo
	end
	return p:WaitForChild(nome)
end

-- Fiável e por ordem (eventos, mudanças de estado).
function Remotes.evento(nome: string): RemoteEvent
	return obter(nome, "RemoteEvent") :: RemoteEvent
end

-- Pode perder pacotes e tem limite de ~900 bytes; serve para inputs frequentes.
function Remotes.rapido(nome: string): UnreliableRemoteEvent
	return obter(nome, "UnreliableRemoteEvent") :: UnreliableRemoteEvent
end

-- Pedido com resposta (lojas, ações que precisam de confirmação).
function Remotes.funcao(nome: string): RemoteFunction
	return obter(nome, "RemoteFunction") :: RemoteFunction
end

return Remotes
