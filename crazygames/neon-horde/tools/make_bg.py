"""Gera bg.jpg: campo de nebulosa e estrelas seamless (tileable) por síntese espectral.

python3 tools/make_bg.py [saida.jpg]
"""
import sys
import numpy as np
from PIL import Image

N = 2048
SEED = 20261023
out_path = sys.argv[1] if len(sys.argv) > 1 else 'bg.jpg'

fx = np.fft.fftfreq(N)
FREQ = np.sqrt(fx[:, None] ** 2 + fx[None, :] ** 2)
FREQ[0, 0] = 1.0


def fbm(beta, seed):
    """Ruído fractal periódico (1/f^beta): tileable por construção."""
    r = np.random.default_rng(SEED + seed)
    F = np.fft.fft2(r.standard_normal((N, N))) / FREQ ** (beta / 2)
    F[0, 0] = 0
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / o.std()


YY, XX = np.mgrid[0:N, 0:N].astype(np.float32)


def sample(field, dx, dy):
    """Amostragem bilinear com wrap (mantém a imagem seamless)."""
    x = XX + dx
    y = YY + dy
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fxr = x - x0
    fyr = y - y0
    x0 %= N
    y0 %= N
    x1 = (x0 + 1) % N
    y1 = (y0 + 1) % N
    a = field[y0, x0] * (1 - fxr) + field[y0, x1] * fxr
    b = field[y1, x0] * (1 - fxr) + field[y1, x1] * fxr
    return a * (1 - fyr) + b * fyr


def warped(beta, seed, amp):
    wx = fbm(3.4, seed + 100)
    wy = fbm(3.4, seed + 200)
    return sample(fbm(beta, seed), wx * amp, wy * amp)


def shape(f, t, w, g):
    return np.clip((f - t) / w, 0, 1) ** g


detail = fbm(2.6, 3)
detail = (detail - detail.min()) / (detail.max() - detail.min())


def soft(f, k):
    d = np.exp(f * k)
    return d / np.percentile(d, 99.7)


def ridge(beta, seed):
    return (1 - np.abs(fbm(beta, seed)) / 3) ** 6


# Camadas de gás: H-alfa (vermelho profundo), OIII (azul-petróleo), reflexão azul difusa
gas_h = np.clip(soft(warped(3.0, 1, 110), 0.85), 0, 1.4) * (0.7 + 0.3 * detail)
gas_o = np.clip(soft(warped(3.2, 2, 140), 0.85), 0, 1.4) * (0.7 + 0.3 * detail)
gas_v = np.clip(soft(fbm(3.7, 6), 0.9), 0, 1.2)
fil = ridge(2.7, 7) * np.clip(gas_h + gas_o, 0, 1)
dust = shape(warped(2.9, 4, 80), 0.1, 1.7, 1.2)

img = np.zeros((N, N, 3), np.float32)
img += np.array([0.008, 0.010, 0.022])
img += gas_v[..., None] * np.array([0.05, 0.06, 0.16]) * 0.8
img += gas_h[..., None] * np.array([0.42, 0.07, 0.10]) * 0.55
img += (gas_h ** 2.5)[..., None] * np.array([0.85, 0.32, 0.22]) * 0.22
img += gas_o[..., None] * np.array([0.04, 0.24, 0.36]) * 0.55
img += (gas_o ** 2.5)[..., None] * np.array([0.35, 0.75, 0.85]) * 0.18
img += fil[..., None] * np.array([0.30, 0.20, 0.30]) * 0.18
# Faixas de poeira escura absorvem a luz do gás
img *= (1 - 0.9 * dust)[..., None]
img += (dust * (1 - dust))[..., None] * np.array([0.03, 0.016, 0.012])

# Estrelas com densidade irregular (aglomerados) e cores por temperatura
rng = np.random.default_rng(SEED)
dens = fbm(3.5, 5)
dens = np.exp(dens * 0.9)
dens /= dens.max()
TEMPS = np.array([[0.62, 0.74, 1.00], [0.82, 0.88, 1.00], [1.00, 1.00, 1.00],
                  [1.00, 0.93, 0.80], [1.00, 0.78, 0.55], [1.00, 0.62, 0.45]])
TW = np.array([0.12, 0.2, 0.3, 0.2, 0.12, 0.06])


def add_star(x, y, color, amp, sigma, rad):
    r = int(np.ceil(rad))
    k = np.arange(-r, r + 1)
    fxs = x - np.floor(x)
    fys = y - np.floor(y)
    gx = np.exp(-((k - fxs) ** 2) / (2 * sigma ** 2))
    gy = np.exp(-((k - fys) ** 2) / (2 * sigma ** 2))
    ker = np.outer(gy, gx) * amp
    ys = (int(y) + k) % N
    xs = (int(x) + k) % N
    img[np.ix_(ys, xs)] += ker[..., None] * color


def pick_color():
    return TEMPS[rng.choice(len(TEMPS), p=TW)]


placed = 0
while placed < 14000:
    x, y = rng.uniform(0, N, 2)
    if rng.random() > dens[int(y), int(x)] * 0.9 + 0.1:
        continue
    b = rng.pareto(2.6) * 0.18 + 0.05
    add_star(x, y, pick_color(), min(b, 1.6), 0.55 + min(b, 1.5) * 0.35, 3)
    placed += 1

# Estrelas brilhantes: halo largo e picos de difração subtis
for _ in range(34):
    x, y = rng.uniform(0, N, 2)
    c = pick_color()
    b = rng.uniform(0.6, 1.6)
    add_star(x, y, c, b * 2.2, 1.1, 5)
    add_star(x, y, c, b * 0.18, 5.0, 16)
    add_star(x, y, c, b * 0.035, 16.0, 46)
    L = int(18 + b * 26)
    k = np.arange(-L, L + 1)
    fall = np.exp(-np.abs(k) / (L * 0.35)) * b * 0.35
    ys = (int(y) + k) % N
    xs = (int(x) + k) % N
    img[ys, int(x) % N] += fall[:, None] * c
    img[int(y) % N, xs] += fall[:, None] * c

# Tone mapping suave; o jogo precisa de um fundo escuro para os néons sobressaírem
img = 1 - np.exp(-img * 1.35)
img = np.clip(img, 0, 1) ** (1 / 1.1)
Image.fromarray((img * 255 + 0.5).astype(np.uint8)).save(out_path, quality=84, optimize=True, progressive=True)
lum = (img @ np.array([0.2126, 0.7152, 0.0722])).mean()
print(out_path, 'mean luminance %.3f' % lum)
