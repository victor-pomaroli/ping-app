# Gera o ícone principal do app a partir do logo (assets/brand/ping-logo.png):
#   - assets/icon.png           quadrado 1024 sem transparência (iOS e ícone legado do Android)
#   - assets/adaptive-icon.png  frente do ícone adaptativo do Android, com o logo dentro da zona segura
# O logo vem num quadro verde com cantos pretos; aqui o desenho é separado do quadro e remontado
# sobre o mesmo degradê verde ocupando o quadrado inteiro, para o Android aplicar a própria máscara.
# Uso: python scripts/make-app-icon.py   (requer Pillow; rode na raiz do projeto)
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'brand', 'ping-logo.png')

logo = Image.open(SRC).convert('RGB')
W, H = logo.size
px = logo.load()


def is_tile(c):
    r, g, b = c
    return 25 < g < 80 and g > r + 15 and g > b + 10 and r < 45


# Quadro verde: maior faixa de linhas/colunas com fundo verde no centro.
mid = W // 2
xs = [x for x in range(W) if is_tile(px[x, H//2])]
ys = [y for y in range(H) if is_tile(px[mid, y])]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
inset = 60  # evita a borda chanfrada e os cantos arredondados do quadro

# Cor do fundo em cada linha, medida nas margens laterais (onde não há desenho).
row_bg = {}
for y in range(y0 + inset, y1 - inset):
    samples = [px[x, y] for x in list(range(x0 + inset, x0 + inset + 70)) + list(range(x1 - inset - 70, x1 - inset)) if is_tile(px[x, y])]
    if samples:
        samples.sort(key=sum)
        row_bg[y] = samples[len(samples)//2]
known = sorted(row_bg)


def bg_at(y):
    y = min(max(y, known[0]), known[-1])
    while y not in row_bg:
        y += 1
    return row_bg[y]


# Máscara do desenho: o que difere do fundo da própria linha.
mask = Image.new('L', logo.size, 0)
mp = mask.load()
for y in range(y0 + inset, y1 - inset):
    br, bgc, bb = bg_at(y)
    for x in range(x0 + inset, x1 - inset):
        r, g, b = px[x, y]
        d = ((r-br)**2 + (g-bgc)**2 + (b-bb)**2) ** 0.5
        if d > 22:
            mp[x, y] = 255 if d > 40 else int((d-22) / 18 * 255)
# Cantos arredondados do quadro (preto por fora) não são desenho.
R = 240
for cx, cy in ((x0+R, y0+R), (x1-R, y0+R), (x0+R, y1-R), (x1-R, y1-R)):
    for y in range(max(y0, cy-R), min(y1, cy+R)):
        for x in range(max(x0, cx-R), min(x1, cx+R)):
            outside_x = x < x0+R or x > x1-R
            outside_y = y < y0+R or y > y1-R
            if outside_x and outside_y and ((x-cx)**2 + (y-cy)**2) ** 0.5 > R - inset - 10:
                mp[x, y] = 0
mask = mask.filter(ImageFilter.MedianFilter(3))
box = mask.getbbox()
content = logo.convert('RGBA')
content.putalpha(mask)
content = content.crop(box)
print('desenho', box, content.size)

# Degradê vertical do fundo, esticado para a altura do ícone.
top, bottom = bg_at(known[0] + 40), bg_at(known[-1] - 40)


def gradient(size):
    g = Image.new('RGBA', (size, size))
    gp = g.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i]*(1-t) + bottom[i]*t) for i in range(3)) + (255,)
        for x in range(size):
            gp[x, y] = c
    return g


def compose(size, content_frac):
    canvas = gradient(size)
    s = content_frac * size / max(content.size)
    im = content.resize((round(content.size[0]*s), round(content.size[1]*s)), Image.LANCZOS)
    canvas.alpha_composite(im, ((size - im.size[0])//2, (size - im.size[1])//2))
    return canvas


# Ícone adaptativo: só o centro (72 de 108 dp, ~66%) aparece, recortado por círculo ou outra forma.
# O desenho ocupa 56% do lado para os cantos (raios, "ping.") não serem cortados pelo círculo.
compose(1024, 0.56).save(os.path.join(ROOT, 'assets', 'adaptive-icon.png'), optimize=True)
compose(1024, 0.80).convert('RGB').save(os.path.join(ROOT, 'assets', 'icon.png'), optimize=True)
mid_bg = bg_at((known[0] + known[-1]) // 2)
print('fundo do adaptativo: #%02X%02X%02X' % mid_bg)
