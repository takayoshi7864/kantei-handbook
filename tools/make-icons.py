"""鑑定ハンドブックのアイコン(開いた本)を作る。使い方: python tools/make-icons.py  (Pillow が必要: pip install pillow)
icon-512.png / icon-192.png / icon-180.png / icon.svg を、リポジトリ直下に書き出す。
背景は全面を塗る(OSが角を丸める。maskable に対応するため、図は中央の約55%に収める)。"""
from pathlib import Path
from PIL import Image, ImageDraw

BG, GOLD = (0x0b, 0x10, 0x20), (0xd6, 0xb2, 0x6a)
ROOT = Path(__file__).resolve().parent.parent
S = 8  # 作図は8倍の大きさで行い、縮小してなめらかにする
LEFT = [(248, 214), (120, 196), (120, 372), (248, 392)]
RIGHT = [(512 - x, y) for x, y in LEFT]

def render(size):
    n = 512 * S
    im = Image.new('RGB', (n, n), BG)
    d = ImageDraw.Draw(im)
    def circle(cx, cy, r, fill=None, outline=None, width=0):
        d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=fill, outline=outline, width=width * S)
    circle(256, 150, 34, outline=GOLD, width=8)                          # 上の輪
    circle(256, 150, 10, fill=GOLD)                                      # 中心の点
    d.polygon([(x * S, y * S) for x, y in LEFT], fill=GOLD)              # 左のページ
    d.polygon([(x * S, y * S) for x, y in RIGHT], fill=GOLD)             # 右のページ
    return im.resize((size, size), Image.LANCZOS)

HEX = lambda c: '#%02x%02x%02x' % c
SVG = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{HEX(BG)}"/>'
       f'<circle cx="256" cy="150" r="34" fill="none" stroke="{HEX(GOLD)}" stroke-width="8"/><circle cx="256" cy="150" r="10" fill="{HEX(GOLD)}"/>'
       f'<path d="M248 214 L120 196 L120 372 L248 392 Z" fill="{HEX(GOLD)}"/><path d="M264 214 L392 196 L392 372 L264 392 Z" fill="{HEX(GOLD)}"/></svg>\n')

if __name__ == '__main__':
    for name, size in (('icon-512.png', 512), ('icon-192.png', 192), ('icon-180.png', 180)):
        render(size).save(ROOT / name, optimize=True)
        print('wrote', name, size)
    (ROOT / 'icon.svg').write_text(SVG, encoding='utf-8')
    print('wrote icon.svg')
