# Gera os ícones pequenos (silhueta branca) do Ping a partir do logo novo: sino inclinado + raios.
# O Android exige ícone pequeno monocromático; a cor vem do campo `color` de cada aviso.
# Uso: python scripts/make-notification-icons.py <pasta-de-saída>   (requer Pillow)
# Depois copie notification-icon.png para assets/ e ping_notif_*.png para assets/notification-icons/.
from PIL import Image, ImageDraw
import sys, os
OUT = sys.argv[1]
S = 4 * 96  # desenha em 4x e reduz para 96 px (24 dp em xxxhdpi)

def cubic(p0, p1, p2, p3, n=24):
    return [(((1-t)**3)*p0[0]+3*((1-t)**2)*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],
             ((1-t)**3)*p0[1]+3*((1-t)**2)*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]

def bell_points(k, ox, oy):
    P = lambda x, y: (ox + x*k, oy + y*k)
    pts = []
    pts += cubic(P(60,20), P(37,20), P(29,38), P(29,58))
    pts += [P(29,70)]
    pts += cubic(P(29,70), P(29,79), P(22,83), P(17,87))
    pts += cubic(P(17,87), P(14,89.5), P(16,93), P(20,93))
    pts += [P(100,93)]
    pts += cubic(P(100,93), P(104,93), P(106,89.5), P(103,87))
    pts += cubic(P(103,87), P(98,83), P(91,79), P(91,70))
    pts += [P(91,58)]
    pts += cubic(P(91,58), P(91,38), P(83,20), P(60,20))
    return pts

def bell_layer(face):
    k = 2.5; ox, oy = 192 - 60*k, 30
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    d.polygon(bell_points(k, ox, oy), fill=255)
    X = lambda x: ox + x*k; Y = lambda y: oy + y*k
    d.ellipse((X(53), Y(8), X(67), Y(22)), fill=255)                          # alça
    d.rounded_rectangle((X(51), Y(90), X(69), Y(104)), radius=9*k/2, fill=255)  # badalo
    w = int(6.8*k)
    if face == 'happy':
        for cx in (46, 74):
            d.arc((X(cx-7), Y(50), X(cx+7), Y(64)), 195, 345, fill=0, width=w)
        d.chord((X(47), Y(60), X(73), Y(84)), 0, 180, fill=0)
    elif face == 'flat':
        for cx in (46, 74):
            d.line((X(cx-7), Y(56), X(cx+7), Y(56)), fill=0, width=w)
        d.line((X(51), Y(74), X(69), Y(74)), fill=0, width=w)
    elif face == 'alert':
        d.rounded_rectangle((X(54), Y(38), X(66), Y(68)), radius=6*k, fill=0)
        d.ellipse((X(54), Y(72), X(66), Y(84)), fill=0)
    return m

def ray(d, a, b, w):
    d.line((a, b), fill=255, width=w)
    r = w/2
    for (x, y) in (a, b):
        d.ellipse((x-r, y-r, x+r, y+r), fill=255)

def icon(face, tilt, left_rays):
    m = bell_layer(face).rotate(tilt, resample=Image.BICUBIC, center=(192, 200))
    canvas = Image.new('L', (S, S), 0)
    canvas.paste(m, (-14, 12))
    d = ImageDraw.Draw(canvas)
    w = 26
    # Raios à direita, como no logo (curtos, para o sino ocupar mais espaço no ícone).
    ray(d, (292, 74), (308, 40), w)
    ray(d, (312, 116), (344, 96), w)
    ray(d, (320, 162), (354, 160), w)
    if left_rays:
        ray(d, (74, 110), (46, 88), w)
        ray(d, (64, 156), (30, 150), w)
        if left_rays > 2:
            ray(d, (96, 70), (80, 38), w)
    # Recorta o desenho e encaixa em 90 px, centralizado: o Android mostra o ícone em 24 dp.
    box = canvas.getbbox(); crop = canvas.crop(box)
    side = max(crop.size); sq = Image.new('L', (side, side), 0)
    sq.paste(crop, ((side-crop.size[0])//2, (side-crop.size[1])//2))
    small = Image.new('L', (96, 96), 0)
    small.paste(sq.resize((90, 90), Image.LANCZOS), (3, 3))
    out = Image.new('RGBA', (96, 96), (255, 255, 255, 0))
    out.putalpha(small)
    return out

variants = {
    'notification-icon.png': ('happy', 10, 0),
    'ping_notif_no_horario.png': ('happy', 10, 0),
    'ping_notif_atraso_1h.png': ('flat', 14, 2),
    'ping_notif_atraso_3h.png': ('alert', 18, 3),
}
for name, (face, tilt, left) in variants.items():
    icon(face, tilt, left).save(os.path.join(OUT, name), optimize=True)
    print('ok', name)
