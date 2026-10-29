-- Simulação do Gobble Royale, autoritária no servidor.
-- Porto do sim.js original, com estas mudanças para multijogador:
--   * vários jogadores humanos (blob.player); bots preenchem até Config.MIN_BLOBS;
--   * quem é comido renasce pequeno ao fim de uns segundos (a ronda não acaba por isso);
--   * o íman já não arrasta migalhas no servidor: aumenta o alcance de comer
--     (o cliente anima a migalha a voar para a boca), assim as migalhas nunca mexem na rede.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Gobble.Config)

local ARENA = Config.ARENA
local CELL = 100
local GRID = math.ceil(ARENA / CELL)
local BASE_EAT = 1.25
local radius = Config.raio
local xpNeed = Config.xpNeed

local function hypot(x: number, y: number): number
	return math.sqrt(x * x + y * y)
end
local function clampA(v: number): number
	return math.clamp(v, 20, ARENA - 20)
end
local function perkLevel(b, id: string): number
	return b.perks[id] or 0
end
local function eatRatio(b): number
	return math.max(1.1, BASE_EAT - 0.04 * perkLevel(b, "jaws"))
end
local function blobSpeed(b): number
	return 270 * b.mass ^ -0.17 * (1 + 0.1 * perkLevel(b, "speed"))
end
local function dashCooldown(b): number
	return 2.6 * 0.78 ^ perkLevel(b, "dash") * (b.dashMul or 1)
end
local function magnetRange(b): number
	return b.r * 0.6 + 26 * perkLevel(b, "magnet") + 10
end
local function comboWindow(b): number
	return 1.3 + 0.45 * perkLevel(b, "combo")
end
local function canEat(a, b): boolean
	return a.mass >= b.mass * eatRatio(a)
end
local function spikeHurts(b, s): boolean
	return b.mass > 16 and b.mass < s.mass * 1.4
end

local Sim = {}
Sim.__index = Sim

function Sim.new(seed: number, dificuldade: number?)
	local S = setmetatable({}, Sim)
	S.rng = Random.new(seed)
	S.t = 0
	S.nextId = 1
	S.nextBlobId = 1
	S.blobs = {}
	S.food = {}
	S.spikes = {}
	S.patches = {}
	S.grid = table.create(GRID * GRID)
	for i = 1, GRID * GRID do
		S.grid[i] = {}
	end
	S.frenzy = false
	S.foodTimer = 0
	S.difficulty = dificuldade or 0.75
	S.events = {}
	S.foodAdded = {}
	S.foodRemoved = {}
	S.spikesDirty = true
	S.infoDirty = true
	S.botNames = table.clone(Config.BOT_NAMES)

	for _ = 1, 12 do
		table.insert(S.patches, {
			x = 300 + S:rand() * (ARENA - 600),
			y = 300 + S:rand() * (ARENA - 600),
			r = 120 + S:rand() * 160,
		})
	end
	for _ = 1, Config.MIGALHAS do
		S:spawnFood("crumb")
	end
	for _ = 1, Config.BICHOS do
		S:spawnFood("critter")
	end
	for _ = 1, Config.OUROS do
		S:spawnFood("gold")
	end
	for _, m in Config.PICOS do
		S:spawnSpike(m)
	end
	-- A comida inicial vai no envio completo, não como "nova".
	table.clear(S.foodAdded)
	return S
end

function Sim:rand(): number
	return self.rng:NextNumber()
end

function Sim:evento(e)
	table.insert(self.events, e)
end

-- Comida -------------------------------------------------------------
function Sim:spawnFood(kind: string, x: number?, y: number?, mass: number?)
	if x == nil then
		if kind == "crumb" and self:rand() < 0.55 and #self.patches > 0 then
			local p = self.patches[self.rng:NextInteger(1, #self.patches)]
			local a, d = self:rand() * math.pi * 2, math.sqrt(self:rand()) * p.r
			x, y = p.x + math.cos(a) * d, p.y + math.sin(a) * d
		else
			x, y = 40 + self:rand() * (ARENA - 80), 40 + self:rand() * (ARENA - 80)
		end
	end
	if mass == nil then
		if kind == "crumb" then
			mass = 1 + (if self:rand() < 0.15 then 1 else 0)
		elseif kind == "critter" then
			mass = 3 + math.floor(self:rand() ^ 2.5 * 36)
		elseif kind == "gold" then
			mass = 22
		else
			mass = 1
		end
	end
	local m = mass :: number
	local r
	if kind == "crumb" then
		r = 4 + m * 1.5
	elseif kind == "bit" then
		r = math.min(14, 4 + math.sqrt(m) * 1.6)
	else
		r = radius(m) * 0.85
	end
	local f = {
		id = self.nextId,
		kind = kind,
		x = clampA(x :: number),
		y = clampA(y :: number),
		vx = 0,
		vy = 0,
		mass = m,
		r = r,
		hue = self.rng:NextInteger(0, 5),
		a = self:rand() * math.pi * 2,
		dead = false,
		age = 0,
		ownerT = 0,
		owner = 0,
		src = 0,
	}
	self.nextId += 1
	table.insert(self.food, f)
	table.insert(self.foodAdded, f)
	return f
end

function Sim:removeFood(f, quem: number)
	f.dead = true
	table.insert(self.foodRemoved, { f.id, quem })
end

function Sim:spawnSpike(mass: number)
	for tries = 1, 30 do
		local x, y = 150 + self:rand() * (ARENA - 300), 150 + self:rand() * (ARENA - 300)
		local ok = true
		for _, s in self.spikes do
			if hypot(s.x - x, s.y - y) < 300 then
				ok = false
				break
			end
		end
		if ok then
			for _, b in self.blobs do
				if b.alive and hypot(b.x - x, b.y - y) < b.r + 120 then
					ok = false
					break
				end
			end
		end
		if ok or tries == 30 then
			table.insert(self.spikes, {
				id = self.nextId,
				x = x,
				y = y,
				mass = mass,
				r = radius(mass) * 0.9,
				dead = false,
				respawn = 0,
			})
			self.nextId += 1
			self.spikesDirty = true
			return
		end
	end
end

function Sim:rebuildGrid()
	for _, c in self.grid do
		table.clear(c)
	end
	for _, f in self.food do
		if not f.dead then
			local cx = math.clamp(math.floor(f.x / CELL), 0, GRID - 1)
			local cy = math.clamp(math.floor(f.y / CELL), 0, GRID - 1)
			table.insert(self.grid[cy * GRID + cx + 1], f)
		end
	end
end

local tmp = {}
function Sim:queryFood(x: number, y: number, r: number, out)
	table.clear(out)
	local x0, x1 = math.max(0, math.floor((x - r) / CELL)), math.min(GRID - 1, math.floor((x + r) / CELL))
	local y0, y1 = math.max(0, math.floor((y - r) / CELL)), math.min(GRID - 1, math.floor((y + r) / CELL))
	for cy = y0, y1 do
		for cx = x0, x1 do
			for _, f in self.grid[cy * GRID + cx + 1] do
				table.insert(out, f)
			end
		end
	end
	return out
end

-- Blobs --------------------------------------------------------------
-- Lugar seguro: longe de quem nos possa comer.
function Sim:lugarSeguro(massa: number): (number, number)
	local bestX, bestY, bestD = ARENA / 2, ARENA / 2, -math.huge
	for _ = 1, 40 do
		local x, y = 200 + self:rand() * (ARENA - 400), 200 + self:rand() * (ARENA - 400)
		local dmin = 1e9
		for _, b in self.blobs do
			if b.alive and b.mass >= massa * 1.1 then
				dmin = math.min(dmin, hypot(b.x - x, b.y - y) - b.r)
			end
		end
		if dmin > bestD then
			bestD, bestX, bestY = dmin, x, y
		end
	end
	return bestX, bestY
end

-- op: { name, color, skin, player?, mass, skill, dashMul? }
function Sim:addBlob(op)
	local x, y = self:lugarSeguro(op.mass)
	local a = self:rand() * math.pi * 2
	local b = {
		id = self.nextBlobId,
		name = op.name,
		color = op.color,
		skin = op.skin,
		player = op.player,
		skill = op.skill or 1,
		dashMul = op.dashMul or 1,
		startMass = op.mass,
		x = x,
		y = y,
		vx = 0,
		vy = 0,
		dirX = math.cos(a),
		dirY = math.sin(a),
		mass = op.mass,
		peak = op.mass,
		r = radius(op.mass),
		alive = true,
		respawnT = 0,
		dashCd = 0,
		dashT = 0,
		spikeT = 0,
		spawnT = 3,
		combo = 0,
		comboT = 0,
		kills = 0,
		deaths = 0,
		eaten = 0,
		xp = 0,
		level = 0,
		pendingLevels = 0,
		perkOpts = nil,
		perks = {},
		killer = nil,
		gold = 0,
		input = { x = 0, y = 0, dash = false },
		ai = { t = 0, tx = 0, ty = 0, dash = false, wanderA = a },
	}
	self.nextBlobId += 1
	table.insert(self.blobs, b)
	self.infoDirty = true
	return b
end

function Sim:addBot()
	if #self.botNames == 0 then
		self.botNames = table.clone(Config.BOT_NAMES)
	end
	local nome = table.remove(self.botNames, self.rng:NextInteger(1, #self.botNames)) :: string
	local i = #self.blobs
	-- Alguns tubarões, a maioria média, alguns petiscos (como no original).
	local r = self:rand()
	local skill = if r < 0.18 then 0.85 + self:rand() * 0.15 elseif r < 0.7 then 0.45 + self:rand() * 0.35 else 0.15 + self:rand() * 0.25
	skill *= 0.5 + 0.5 * self.difficulty
	return self:addBlob({
		name = nome,
		color = Config.BOT_COLORS[i % #Config.BOT_COLORS + 1],
		skin = "bot",
		mass = 9.5 + self:rand() * 1.5,
		skill = skill,
	})
end

function Sim:removeBlob(b)
	local i = table.find(self.blobs, b)
	if i then
		table.remove(self.blobs, i)
		self.infoDirty = true
	end
end

function Sim:respawn(b)
	b.alive = true
	b.mass = if b.player then b.startMass else 9.5 + self:rand() * 1.5
	b.r = radius(b.mass)
	b.x, b.y = self:lugarSeguro(b.mass)
	b.vx, b.vy = 0, 0
	b.spawnT = 3
	b.combo = 0
	b.dashT = 0
	self:evento({ tipo = "renasceu", blob = b })
end

function Sim:addMassRaw(b, m: number)
	b.mass += m
	if b.mass > b.peak then
		b.peak = b.mass
	end
end

function Sim:addMass(b, m: number, src: string): number
	local gain = m
	if src == "food" then
		gain *= 1 + 0.15 * perkLevel(b, "glutton")
	elseif src == "blob" then
		gain *= 1 + 0.2 * perkLevel(b, "hunter")
	elseif src == "gold" then
		gain *= 1 + 0.5 * perkLevel(b, "goldnose")
	end
	if src ~= "bit" then
		b.combo = if b.comboT > 0 then b.combo + 1 else 1
		b.comboT = comboWindow(b)
		gain *= 1 + math.min(0.5, (b.combo - 1) * 0.03)
	end
	b.mass += gain
	b.xp += gain
	b.eaten += gain
	if b.mass > b.peak then
		b.peak = b.mass
	end
	while b.xp >= xpNeed(b.level + 1) do
		b.xp -= xpNeed(b.level + 1)
		b.level += 1
		if b.player then
			b.pendingLevels += 1
			if not b.perkOpts then
				self:rollPerks(b)
			end
		else
			self:botPickPerk(b)
		end
	end
	return gain
end

function Sim:botPickPerk(b)
	local opts = {}
	for _, p in Config.PERKS do
		if perkLevel(b, p.id) < p.max then
			table.insert(opts, p)
		end
	end
	if #opts == 0 then
		return
	end
	local p = opts[self.rng:NextInteger(1, #opts)]
	b.perks[p.id] = perkLevel(b, p.id) + 1
	if p.id == "chonk" then
		self:addMassRaw(b, math.max(8, b.mass * 0.15))
	end
end

-- Três opções diferentes para o jogador; o cliente mostra-as sem pausar o jogo.
function Sim:rollPerks(b)
	local opts = {}
	for _, p in Config.PERKS do
		if perkLevel(b, p.id) < p.max then
			table.insert(opts, p.id)
		end
	end
	local out = {}
	while #out < 3 and #opts > 0 do
		table.insert(out, table.remove(opts, self.rng:NextInteger(1, #opts)))
	end
	if #out == 0 then
		b.pendingLevels = 0
		b.perkOpts = nil
		return
	end
	b.perkOpts = out
	self:evento({ tipo = "poderes", blob = b, opcoes = out, nivel = b.level - b.pendingLevels + 1 })
end

function Sim:choosePerk(b, id: string): boolean
	if b.pendingLevels <= 0 or not b.perkOpts or not table.find(b.perkOpts, id) then
		return false
	end
	b.pendingLevels -= 1
	b.perks[id] = perkLevel(b, id) + 1
	if id == "chonk" then
		self:addMassRaw(b, math.max(8, b.mass * 0.15))
	end
	b.perkOpts = nil
	if b.pendingLevels > 0 then
		self:rollPerks(b)
	end
	return true
end

function Sim:loseMass(b, frac: number, vx: number, vy: number): number
	local lost = b.mass * frac * 0.6 ^ perkLevel(b, "skin")
	b.mass = math.max(8, b.mass - lost)
	-- O que se perde espalha-se em pedaços para os outros comerem.
	local n = math.min(14, math.max(3, math.floor(lost / 6)))
	for _ = 1, n do
		local a, sp = self:rand() * math.pi * 2, 140 + self:rand() * 220
		local f = self:spawnFood("bit", b.x, b.y, lost / n)
		f.vx = math.cos(a) * sp + vx * 0.3
		f.vy = math.sin(a) * sp + vy * 0.3
		f.src = b.id
	end
	return lost
end

function Sim:kill(eater, victim)
	victim.alive = false
	victim.killer = eater.name
	victim.deaths += 1
	victim.respawnT = if victim.player then Config.RENASCER_JOGADOR else 3 + self:rand() * 3
	eater.kills += 1
	local gain = self:addMass(eater, victim.mass * 0.8, "blob")
	if eater.player then
		eater.gold += 3 + math.round(victim.mass / 25)
	end
	self:evento({ tipo = "kill", eater = eater, victim = victim, mass = victim.mass, gain = gain })
end

-- IA (igual ao original) ------------------------------------------------
function Sim:think(b)
	local ai = b.ai
	local view = 260 + b.r * 5
	local fx, fy, threat = 0, 0, 0
	local best, bestScore = nil, 0
	ai.dash = false
	for _, o in self.blobs do
		if o == b or not o.alive then
			continue
		end
		local dx, dy = o.x - b.x, o.y - b.y
		local d = hypot(dx, dy)
		if d == 0 then
			d = 1
		end
		if d > view + o.r then
			continue
		end
		if canEat(o, b) and o.spawnT <= 0 then
			-- Fugir: mais forte quanto mais perto. Bots fracos reparam no perigo mais tarde.
			local reach = o.r + b.r + 140 + 260 * b.skill
			if d < reach then
				local w = (reach - d) / reach
				fx -= dx / d * w * 3
				fy -= dy / d * w * 3
				threat = math.max(threat, w)
				if d < o.r + b.r + 60 and self:rand() < b.skill then
					ai.dash = true
				end
			end
		elseif canEat(b, o) and o.spawnT <= 0 then
			-- Bots caçam humanos um pouco menos do que se caçam uns aos outros.
			local mult = if o.player then 0.35 + 0.75 * self.difficulty else 1
			local score = (o.mass * (0.6 + b.skill)) / (d + 80) * mult
			if score > bestScore then
				bestScore, best = score, o
			end
		end
	end
	for _, s in self.spikes do
		if s.dead then
			continue
		end
		local dx, dy = s.x - b.x, s.y - b.y
		local d = hypot(dx, dy)
		if d == 0 then
			d = 1
		end
		if spikeHurts(b, s) and d < s.r + b.r + 90 * b.skill then
			local w = 1 - d / (s.r + b.r + 90)
			fx -= dx / d * w * 2
			fy -= dy / d * w * 2
		elseif b.mass >= s.mass * 1.4 then
			local score = s.mass / (d + 80)
			if score > bestScore then
				bestScore, best = score, s
			end
		end
	end
	self:queryFood(b.x, b.y, math.min(view, 520), tmp)
	for _, f in tmp do
		if f.dead or f.r > b.r * 0.9 then
			continue
		end
		local d = hypot(f.x - b.x, f.y - b.y)
		local score = (f.mass * (if f.kind == "gold" then 2 else 1)) / (d + 60) * (0.7 + 0.3 * b.skill)
		if score > bestScore then
			bestScore, best = score, f
		end
	end
	local tx, ty
	if best then
		local lead = if best.vx ~= nil then 0.25 * b.skill else 0
		tx = best.x + (best.vx or 0) * lead - b.x
		ty = best.y + (best.vy or 0) * lead - b.y
		local d = hypot(tx, ty)
		if d == 0 then
			d = 1
		end
		tx /= d
		ty /= d
		if best.alive ~= nil and d < b.r * 3 + 120 and threat < 0.2 then
			local p = b.skill * (if best.player then 0.3 + 0.5 * self.difficulty else 0.8)
			if self:rand() < p then
				ai.dash = true
			end
		end
	else
		ai.wanderA += (self:rand() - 0.5) * 1.2
		tx, ty = math.cos(ai.wanderA), math.sin(ai.wanderA)
	end
	-- O perigo pesa mais que a fome; puxa para o meio perto das paredes.
	local wTarget = if threat > 0 then math.max(0.2, 1 - threat * 1.5) else 1
	local mx, my = tx * wTarget + fx, ty * wTarget + fy
	local edge = 220
	if b.x < edge then
		mx += (edge - b.x) / edge * 2
	end
	if b.x > ARENA - edge then
		mx -= (b.x - (ARENA - edge)) / edge * 2
	end
	if b.y < edge then
		my += (edge - b.y) / edge * 2
	end
	if b.y > ARENA - edge then
		my -= (b.y - (ARENA - edge)) / edge * 2
	end
	local m = hypot(mx, my)
	if m == 0 then
		m = 1
	end
	ai.tx, ai.ty = mx / m, my / m
	ai.t = 0.12 + (1 - b.skill) * 0.35 + self:rand() * 0.1
end

-- Passo ----------------------------------------------------------------
function Sim:step(dt: number, timeLeft: number)
	self.t += dt
	if not self.frenzy and timeLeft <= Config.TEMPO_FRENESI then
		self.frenzy = true
		self:evento({ tipo = "frenesi" })
	end

	self:rebuildGrid()

	-- Movimento
	for _, b in self.blobs do
		if not b.alive then
			b.respawnT -= dt
			if b.respawnT <= 0 then
				self:respawn(b)
			end
			continue
		end
		local ix, iy, dash
		if b.player then
			ix, iy, dash = b.input.x, b.input.y, b.input.dash
		else
			b.ai.t -= dt
			if b.ai.t <= 0 then
				self:think(b)
			end
			ix, iy, dash = b.ai.tx, b.ai.ty, b.ai.dash
		end
		local h = hypot(ix, iy)
		local mag = math.min(1, h)
		if mag > 0.05 then
			b.dirX, b.dirY = ix / h, iy / h
		end
		local sp = blobSpeed(b) * mag
		b.dashCd = math.max(0, b.dashCd - dt)
		b.spikeT = math.max(0, b.spikeT - dt)
		b.spawnT = math.max(0, b.spawnT - dt)
		if dash and b.dashCd <= 0 and b.mass >= 14 then
			b.dashCd = dashCooldown(b)
			b.dashT = 0.24
			local cost = b.mass * 0.03 * 0.6 ^ perkLevel(b, "skin")
			b.mass -= cost
			local f = self:spawnFood("bit", b.x - b.dirX * b.r, b.y - b.dirY * b.r, cost)
			f.vx, f.vy = -b.dirX * 120, -b.dirY * 120
			f.owner, f.ownerT, f.src = b.id, 0.6, b.id
			self:evento({ tipo = "dash", blob = b })
			b.vx, b.vy = b.dirX * blobSpeed(b) * 2.8, b.dirY * blobSpeed(b) * 2.8
		end
		if b.dashT > 0 then
			b.dashT -= dt
		else
			local k = math.min(1, dt * 7)
			b.vx += (b.dirX * sp - b.vx) * k
			b.vy += (b.dirY * sp - b.vy) * k
		end
		b.x += b.vx * dt
		b.y += b.vy * dt
		local lim = b.r * 0.5
		if b.x < lim then
			b.x, b.vx = lim, 0
		end
		if b.y < lim then
			b.y, b.vy = lim, 0
		end
		if b.x > ARENA - lim then
			b.x, b.vx = ARENA - lim, 0
		end
		if b.y > ARENA - lim then
			b.y, b.vy = ARENA - lim, 0
		end
		b.comboT -= dt
		if b.comboT <= 0 then
			b.combo = 0
		end
		-- Os grandes derretem devagar para o líder poder ser apanhado.
		if b.mass > 120 then
			b.mass -= (b.mass - 120) * 0.006 * (1 + b.mass / 1500) * 0.6 ^ perkLevel(b, "skin") * dt
		end
		b.r = radius(b.mass)
	end

	-- Comportamento da comida
	for _, f in self.food do
		if f.dead then
			continue
		end
		f.age += dt
		if f.ownerT > 0 then
			f.ownerT -= dt
		end
		if f.kind == "critter" or f.kind == "gold" then
			-- Foge de quem a pode comer.
			local fx, fy = 0, 0
			for _, b in self.blobs do
				if not b.alive or f.r > b.r * 0.9 then
					continue
				end
				local dx, dy = f.x - b.x, f.y - b.y
				local d = hypot(dx, dy)
				local range = b.r + (if f.kind == "gold" then 230 else 140)
				if d < range and d > 0 then
					local w = (range - d) / range
					fx += dx / d * w
					fy += dy / d * w
				end
			end
			local base = (if f.kind == "gold" then 0.95 else 0.68) * 270 * f.mass ^ -0.17
			if fx ~= 0 or fy ~= 0 then
				local m = hypot(fx, fy)
				f.a = math.atan2(fy, fx)
				f.vx += (fx / m * base - f.vx) * math.min(1, dt * 5)
				f.vy += (fy / m * base - f.vy) * math.min(1, dt * 5)
			else
				f.a += (self:rand() - 0.5) * 3 * dt
				f.vx += (math.cos(f.a) * base * 0.3 - f.vx) * math.min(1, dt * 2)
				f.vy += (math.sin(f.a) * base * 0.3 - f.vy) * math.min(1, dt * 2)
			end
			f.x += f.vx * dt
			f.y += f.vy * dt
			if f.x < 30 or f.x > ARENA - 30 then
				f.vx *= -1
				f.a = math.pi - f.a
			end
			if f.y < 30 or f.y > ARENA - 30 then
				f.vy *= -1
				f.a = -f.a
			end
			f.x, f.y = clampA(f.x), clampA(f.y)
		elseif f.vx ~= 0 or f.vy ~= 0 then
			f.x += f.vx * dt
			f.y += f.vy * dt
			local k = 0.04 ^ dt
			f.vx *= k
			f.vy *= k
			if math.abs(f.vx) + math.abs(f.vy) < 2 then
				f.vx, f.vy = 0, 0
			end
			f.x, f.y = clampA(f.x), clampA(f.y)
		end
	end

	-- Comer comida (o íman alarga o alcance para migalhas e pedaços)
	for _, b in self.blobs do
		if not b.alive then
			continue
		end
		local mr = magnetRange(b)
		self:queryFood(b.x, b.y, b.r + mr + 20, tmp)
		for _, f in tmp do
			if f.dead or f.r > b.r * 0.9 then
				continue
			end
			if f.owner == b.id and f.ownerT > 0 then
				continue
			end
			local d = hypot(b.x - f.x, b.y - f.y)
			local alcance = b.r - f.r * 0.3
			if f.kind == "crumb" or f.kind == "bit" then
				alcance = b.r + mr * 0.55
			end
			if d < alcance then
				self:removeFood(f, b.id)
				local src = if f.kind == "gold" then "gold" elseif f.kind == "bit" then "bit" else "food"
				local gain = self:addMass(b, f.mass, src)
				if f.kind == "gold" and b.player then
					b.gold += 5
				end
				if b.player then
					self:evento({ tipo = "comeu", blob = b, kind = f.kind, gain = gain, combo = b.combo })
				end
			end
		end
	end

	-- Picos
	for _, s in self.spikes do
		if s.dead then
			s.respawn -= dt
			continue
		end
		for _, b in self.blobs do
			if not b.alive then
				continue
			end
			local d = hypot(b.x - s.x, b.y - s.y)
			if b.mass >= s.mass * 1.4 then
				if d < b.r - s.r * 0.3 then
					s.dead = true
					s.respawn = 12
					self.spikesDirty = true
					self:addMass(b, s.mass * 0.5, "food")
					self:evento({ tipo = "comeuPico", blob = b })
					break
				end
			elseif spikeHurts(b, s) and b.spikeT <= 0 and d < b.r + s.r * 0.75 then
				b.spikeT = 1.2
				local lost = self:loseMass(b, 0.22, b.vx, b.vy)
				local dd = if d == 0 then 1 else d
				local nx, ny = (b.x - s.x) / dd, (b.y - s.y) / dd
				b.vx, b.vy = nx * 420, ny * 420
				b.dashT = 0.18
				b.combo = 0
				self:evento({ tipo = "pico", blob = b, lost = lost })
			end
		end
	end
	for i = #self.spikes, 1, -1 do
		local s = self.spikes[i]
		if s.dead and s.respawn <= 0 then
			table.remove(self.spikes, i)
			self.spikesDirty = true
			self:spawnSpike(s.mass)
		end
	end

	-- Blob contra blob
	local vivos = {}
	for _, b in self.blobs do
		if b.alive then
			table.insert(vivos, b)
		end
	end
	table.sort(vivos, function(a, b)
		return a.mass > b.mass
	end)
	for i = 1, #vivos do
		local a = vivos[i]
		if not a.alive then
			continue
		end
		for j = i + 1, #vivos do
			local v = vivos[j]
			if not v.alive or v.spawnT > 0 or a.spawnT > 0 then
				continue
			end
			if not canEat(a, v) then
				continue
			end
			local d = hypot(a.x - v.x, a.y - v.y)
			if d < a.r - v.r * 0.35 then
				self:kill(a, v)
			end
		end
	end

	-- Limpeza e nova comida
	local limpa = table.create(#self.food)
	for _, f in self.food do
		if f.dead then
			continue
		end
		if f.kind == "bit" and f.age > 40 then
			self:removeFood(f, 0)
			continue
		end
		table.insert(limpa, f)
	end
	self.food = limpa

	self.foodTimer -= dt
	if self.foodTimer <= 0 then
		self.foodTimer = 0.25
		local crumbs, critters, golds = 0, 0, 0
		for _, f in self.food do
			if f.kind == "crumb" then
				crumbs += 1
			elseif f.kind == "critter" then
				critters += 1
			elseif f.kind == "gold" then
				golds += 1
			end
		end
		local alvo = if self.frenzy then Config.MIGALHAS * 1.4 else Config.MIGALHAS
		local k = 0
		while k < (if self.frenzy then 20 else 10) and crumbs < alvo do
			self:spawnFood("crumb")
			k += 1
			crumbs += 1
		end
		if critters < Config.BICHOS then
			self:spawnFood("critter")
		end
		local maxOuro = if self.frenzy then Config.OUROS_FRENESI else Config.OUROS
		if golds < maxOuro and self:rand() < (if self.frenzy then 0.6 else 0.05) then
			self:spawnFood("gold")
		end
	end
end

-- Classificação: vivos primeiro, por massa.
function Sim:classificacao()
	local lista = table.clone(self.blobs)
	table.sort(lista, function(a, b)
		local ma = if a.alive then a.mass else 0
		local mb = if b.alive then b.mass else 0
		if ma == mb then
			return a.peak > b.peak
		end
		return ma > mb
	end)
	return lista
end

Sim.canEat = canEat
Sim.dashCooldown = dashCooldown

return Sim
