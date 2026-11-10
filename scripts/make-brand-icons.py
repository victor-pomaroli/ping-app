# Gera os ícones do Ping a partir da arte do sino (assets/brand/ping-bell.png):
#   - assets/adaptive-icon.png   frente do ícone adaptativo (sino com contorno, fundo transparente)
#   - assets/icon.png            ícone quadrado completo (fundo verde + sino)
#   - assets/notification-icon.png e assets/notification-icons/ping_notif_*.png
#       silhuetas brancas para a barra de status: sorrindo (no horário), sério (+1 h) e exclamação (+3 h)
# Uso: python scripts/make-brand-icons.py   (requer Pillow; rode na raiz do projeto)
import math
import os
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'assets', 'brand', 'ping-bell.png')
BG = (14, 51, 32)  # verde do quadro da arte; igual ao backgroundColor do adaptiveIcon no app.json

art = Image.open(ART).convert('RGB')
W, H = art.size
px = art.load()

# Partes verde-limão (sino, alça, badalo, raios) e contorno quase preto.
lime = Image.new('L', art.size, 0)
dark = Image.new('L', art.size, 0)
lp, dp = lime.load(), dark.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        if g > 150 and r > 120 and b < 140:
            lp[x, y] = 255
        elif g < 30:
            dp[x, y] = 255
lime = lime.filter(ImageFilter.MedianFilter(5))
box = lime.getbbox()
pad = 40
box = (max(0, box[0]-pad), max(0, box[1]-pad), min(W, box[2]+pad), min(H, box[3]+pad))
art_c, lime_c, dark_c = art.crop(box), lime.crop(box), dark.crop(box)
cw, ch = lime_c.size


def components(mask):
    """Rótulos 4-conexos dos pixels acesos de uma máscara L (lista de listas de (x, y))."""
    w, h = mask.size
    m = mask.load()
    seen = bytearray(w*h)
    comps = []
    for y in range(h):
        for x in range(w):
            if m[x, y] > 127 and not seen[y*w+x]:
                q = deque([(x, y)]); seen[y*w+x] = 1; pts = []
                while q:
                    a, b = q.popleft(); pts.append((a, b))
                    for na, nb in ((a+1, b), (a-1, b), (a, b+1), (a, b-1)):
                        if 0 <= na < w and 0 <= nb < h and not seen[nb*w+na] and m[na, nb] > 127:
                            seen[nb*w+na] = 1; q.append((na, nb))
                comps.append(pts)
    return comps


def fill_holes(mask):
    """Preenche regiões apagadas que não tocam a borda."""
    inv = mask.point(lambda v: 0 if v > 127 else 255)
    out = mask.copy(); o = out.load()
    w, h = mask.size
    for pts in components(inv):
        if all(0 < x < w-1 and 0 < y < h-1 for x, y in pts):
            for x, y in pts:
                o[x, y] = 255
    return out


def centroid(pts):
    return (sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts))


# --- peças do desenho ---
parts = sorted(components(lime_c), key=len, reverse=True)
parts = [p for p in parts if len(p) > 200]
bell = parts[0]
bx, by = centroid(bell)
bxs = [p[0] for p in bell]
bell_w = max(bxs)-min(bxs)
rays = [p for p in parts[1:] if centroid(p)[0] > bx + 0.3*bell_w and centroid(p)[1] < by]
rays.sort(key=lambda p: centroid(p)[1])

# Furos do rosto dentro do corpo do sino: dois olhos e a boca.
body = Image.new('L', (cw, ch), 0); bp = body.load()
for x, y in bell:
    bp[x, y] = 255
solid_body = fill_holes(body)
diff = Image.new('L', (cw, ch), 0); df = diff.load(); sb = solid_body.load()
for y in range(ch):
    for x in range(cw):
        if sb[x, y] > 127 and bp[x, y] < 128:
            df[x, y] = 255
face = sorted([c for c in components(diff) if len(c) > 80], key=len, reverse=True)[:4]
face.sort(key=lambda p: centroid(p)[1])
mouth = max(face, key=len)
eyes = sorted([c for c in face if c is not mouth], key=lambda p: centroid(p)[0])[:2]
(e1x, e1y), (e2x, e2y) = centroid(eyes[0]), centroid(eyes[1])
mx, my = centroid(mouth)
tilt = math.atan2(e2y-e1y, e2x-e1x)
eye_w = max(p[0] for p in eyes[0]) - min(p[0] for p in eyes[0])
stroke = max(10, int(eye_w*0.38))
print(f'sino em ({bx:.0f},{by:.0f}), inclinação {math.degrees(tilt):.1f}°, {len(rays)} raios')


def rot(cx, cy, dx, dy):
    c, s = math.cos(tilt), math.sin(tilt)
    return (cx + dx*c - dy*s, cy + dx*s + dy*c)


def rounded_line(d, a, b, w, fill):
    d.line((a, b), fill=fill, width=w)
    for x, y in (a, b):
        d.ellipse((x-w/2, y-w/2, x+w/2, y+w/2), fill=fill)


def lime_only(extra_left=0):
    """Silhueta: partes limão; com extra_left, espelha os raios para o lado esquerdo."""
    big = Image.new('L', (cw*2, ch), 0)
    off = cw//2
    big.paste(lime_c, (off, 0))
    if extra_left:
        bp2 = big.load()
        for ray in rays[-extra_left:]:
            for x, y in ray:
                mxp = int(2*bx - x) + off
                if 0 <= mxp < cw*2:
                    bp2[mxp, y] = 255
    return big, off


def silhouette(face_kind, extra_left):
    m, off = lime_only(extra_left)
    if face_kind != 'happy':
        # Fecha os furos do rosto e recorta o rosto novo.
        mp = m.load()
        for y in range(ch):
            for x in range(cw):
                if df[x, y] > 127:
                    mp[x+off, y] = 255
        d = ImageDraw.Draw(m)
        ox = off
        if face_kind == 'flat':
            for ex, ey in ((e1x, e1y), (e2x, e2y)):
                rounded_line(d, rot(ex+ox, ey, -eye_w*0.28, 0), rot(ex+ox, ey, eye_w*0.28, 0), stroke, 0)
            mw = (max(p[0] for p in mouth) - min(p[0] for p in mouth))*0.36
            rounded_line(d, rot(mx+ox, my, -mw, 0), rot(mx+ox, my, mw, 0), stroke, 0)
        elif face_kind == 'alert':
            cx = (e1x+e2x)/2 + ox
            cy = (e1y+e2y)/2
            top = rot(cx, cy, 0, -eye_w*0.9)
            bottom = rot(cx, cy, 0, (my-cy)*0.55)
            rounded_line(d, top, bottom, int(stroke*1.7), 0)
            dx, dy = rot(cx, cy, 0, (my-cy)*1.15)
            r = stroke*0.95
            d.ellipse((dx-r, dy-r, dx+r, dy+r), fill=0)
    crop = m.crop(m.getbbox())
    side = max(crop.size)
    sq = Image.new('L', (side, side), 0)
    sq.paste(crop, ((side-crop.size[0])//2, (side-crop.size[1])//2))
    small = Image.new('L', (96, 96), 0)
    small.paste(sq.resize((90, 90), Image.LANCZOS), (3, 3))
    out = Image.new('RGBA', (96, 96), (255, 255, 255, 0))
    out.putalpha(small)
    return out


icons = os.path.join(ROOT, 'assets', 'notification-icons')
os.makedirs(icons, exist_ok=True)
happy = silhouette('happy', 0)
happy.save(os.path.join(ROOT, 'assets', 'notification-icon.png'), optimize=True)
happy.save(os.path.join(icons, 'ping_notif_no_horario.png'), optimize=True)
silhouette('flat', 2).save(os.path.join(icons, 'ping_notif_atraso_1h.png'), optimize=True)
silhouette('alert', 3).save(os.path.join(icons, 'ping_notif_atraso_3h.png'), optimize=True)

# --- frente do ícone adaptativo: sino colorido com contorno, sem o quadro verde ---
near = lime_c.filter(ImageFilter.MaxFilter(71))  # contorno fica até ~30 px do limão
fg = Image.new('L', (cw, ch), 0); fp = fg.load()
lc, dc, nc = lime_c.load(), dark_c.load(), near.load()
for y in range(ch):
    for x in range(cw):
        if lc[x, y] > 127 or (dc[x, y] > 127 and nc[x, y] > 127):
            fp[x, y] = 255
fg = fill_holes(fg).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
fore = art_c.convert('RGBA'); fore.putalpha(fg)
fore = fore.crop(fg.getbbox())


def place(img, canvas_px, content_px, bg=None):
    s = content_px / max(img.size)
    im = img.resize((round(img.size[0]*s), round(img.size[1]*s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (canvas_px, canvas_px), bg + (255,) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(im, ((canvas_px-im.size[0])//2, (canvas_px-im.size[1])//2))
    return canvas


# Zona segura do ícone adaptativo: círculo de 66% do lado. O desenho ocupa 60% para caber em
# qualquer máscara (círculo, gota, quadrado arredondado).
place(fore, 1024, 610).save(os.path.join(ROOT, 'assets', 'adaptive-icon.png'), optimize=True)
place(fore, 1024, 760, BG).convert('RGB').save(os.path.join(ROOT, 'assets', 'icon.png'), optimize=True)
print('ok')
