-- Codificação compacta (buffers) do estado enviado aos clientes.
-- Blobs: 12 bytes cada. Comida nova: 20 bytes. Comida comida: 6 bytes. Comida a mexer: 8 bytes.
local Protocolo = {}

local function u16(v: number): number
	return math.clamp(math.floor(v + 0.5), 0, 65535)
end

local function i16(v: number): number
	return math.clamp(math.floor(v + 0.5), -32768, 32767)
end

-- Blobs ----------------------------------------------------------------
-- flags: 1 = vivo, 2 = escudo (acabou de nascer), 4 = em dash
export type BlobRede = { id: number, x: number, y: number, mass: number, flags: number, ang: number }

function Protocolo.codificarBlobs(blobs: { any }): buffer
	local n = 0
	for _, b in blobs do
		if b.alive then
			n += 1
		end
	end
	local buf = buffer.create(1 + n * 12)
	buffer.writeu8(buf, 0, n)
	local o = 1
	for _, b in blobs do
		if b.alive then
			local flags = 1
			if b.spawnT > 0 then
				flags += 2
			end
			if b.dashT > 0 then
				flags += 4
			end
			local ang = (math.atan2(b.dirY, b.dirX) % (2 * math.pi)) / (2 * math.pi) * 255
			buffer.writeu16(buf, o, b.id)
			buffer.writeu16(buf, o + 2, u16(b.x))
			buffer.writeu16(buf, o + 4, u16(b.y))
			buffer.writef32(buf, o + 6, b.mass)
			buffer.writeu8(buf, o + 10, flags)
			buffer.writeu8(buf, o + 11, math.floor(ang + 0.5) % 256)
			o += 12
		end
	end
	return buf
end

function Protocolo.lerBlobs(buf: buffer): { BlobRede }
	local n = buffer.readu8(buf, 0)
	local out = table.create(n)
	local o = 1
	for i = 1, n do
		out[i] = {
			id = buffer.readu16(buf, o),
			x = buffer.readu16(buf, o + 2),
			y = buffer.readu16(buf, o + 4),
			mass = buffer.readf32(buf, o + 6),
			flags = buffer.readu8(buf, o + 10),
			ang = buffer.readu8(buf, o + 11) / 255 * 2 * math.pi,
		}
		o += 12
	end
	return out
end

-- Comida nova ----------------------------------------------------------
export type ComidaRede = {
	id: number,
	kind: number,
	x: number,
	y: number,
	vx: number,
	vy: number,
	mass: number,
	hue: number,
	src: number,
}

function Protocolo.codificarComida(lista: { any }, tipo: { [string]: number }): buffer
	local vivos = {}
	for _, f in lista do
		if not f.dead then
			table.insert(vivos, f)
		end
	end
	local buf = buffer.create(2 + #vivos * 20)
	buffer.writeu16(buf, 0, #vivos)
	local o = 2
	for _, f in vivos do
		buffer.writeu32(buf, o, f.id)
		buffer.writeu8(buf, o + 4, tipo[f.kind])
		buffer.writeu16(buf, o + 5, u16(f.x))
		buffer.writeu16(buf, o + 7, u16(f.y))
		buffer.writei16(buf, o + 9, i16(f.vx))
		buffer.writei16(buf, o + 11, i16(f.vy))
		buffer.writef32(buf, o + 13, f.mass)
		buffer.writeu8(buf, o + 17, f.hue)
		buffer.writeu16(buf, o + 18, f.src or 0)
		o += 20
	end
	return buf
end

function Protocolo.lerComida(buf: buffer): { ComidaRede }
	local n = buffer.readu16(buf, 0)
	local out = table.create(n)
	local o = 2
	for i = 1, n do
		out[i] = {
			id = buffer.readu32(buf, o),
			kind = buffer.readu8(buf, o + 4),
			x = buffer.readu16(buf, o + 5),
			y = buffer.readu16(buf, o + 7),
			vx = buffer.readi16(buf, o + 9),
			vy = buffer.readi16(buf, o + 11),
			mass = buffer.readf32(buf, o + 13),
			hue = buffer.readu8(buf, o + 17),
			src = buffer.readu16(buf, o + 18),
		}
		o += 20
	end
	return out
end

-- Comida comida: { {id, quemComeu} } ------------------------------------
function Protocolo.codificarRemovidos(lista: { { number } }): buffer
	local buf = buffer.create(2 + #lista * 6)
	buffer.writeu16(buf, 0, #lista)
	local o = 2
	for _, r in lista do
		buffer.writeu32(buf, o, r[1])
		buffer.writeu16(buf, o + 4, r[2])
		o += 6
	end
	return buf
end

function Protocolo.lerRemovidos(buf: buffer): { { number } }
	local n = buffer.readu16(buf, 0)
	local out = table.create(n)
	local o = 2
	for i = 1, n do
		out[i] = { buffer.readu32(buf, o), buffer.readu16(buf, o + 4) }
		o += 6
	end
	return out
end

-- Comida a mexer (bichos e ouro): posições ---------------------------
function Protocolo.codificarMoveis(lista: { any }): buffer
	local buf = buffer.create(2 + #lista * 8)
	buffer.writeu16(buf, 0, #lista)
	local o = 2
	for _, f in lista do
		buffer.writeu32(buf, o, f.id)
		buffer.writeu16(buf, o + 4, u16(f.x))
		buffer.writeu16(buf, o + 6, u16(f.y))
		o += 8
	end
	return buf
end

function Protocolo.lerMoveis(buf: buffer): { { number } }
	local n = buffer.readu16(buf, 0)
	local out = table.create(n)
	local o = 2
	for i = 1, n do
		out[i] = { buffer.readu32(buf, o), buffer.readu16(buf, o + 4), buffer.readu16(buf, o + 6) }
		o += 8
	end
	return out
end

return Protocolo
