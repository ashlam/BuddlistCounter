# -*- coding: utf-8 -*-
"""
从 backups/emblem-source-crop.png（参考图抠出的金色徽章）生成 Android 启动图标。

产出：
  res/mipmap-<dpi>/ic_launcher.png        传统方图（圆角）
  res/mipmap-<dpi>/ic_launcher_round.png  圆形图
  res/mipmap-xxxhdpi/ic_launcher_fg.png   自适应图标前景（108dp 画布，透明底）
  res/mipmap-anydpi-v26/ic_launcher*.xml  自适应图标描述
  res/values/ic_launcher_bg.xml           自适应图标背景色

用法：python android/make_icons.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'backups', 'emblem-source-crop.png')
RES = os.path.join(ROOT, 'android', 'project', 'res')

GOLD = (201, 160, 99)      # 素金 --gold
BG = (250, 246, 239)       # 米白 --bg
SS = 4                     # 超采样倍数


def emblem_rgba():
    """把原图转成「金色 + alpha」的 RGBA，alpha 取自原图墨色浓度。"""
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape

    # 四角 12x12 采样求背景色，避开图案
    k = 12
    corners = np.concatenate([
        a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3),
        a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3),
    ])
    bg = corners.mean(axis=0)

    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    bg_lum = float(bg @ np.array([0.299, 0.587, 0.114], dtype=np.float32))
    fg_lum = float(np.array(GOLD, dtype=np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32))

    alpha = (bg_lum - lum) / (bg_lum - fg_lum)
    # 去掉背景噪点，同时保住抗锯齿过渡
    alpha = np.clip((alpha - 0.06) / 0.90, 0, 1) ** 0.92

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, 0] = GOLD[0]
    out[:, :, 1] = GOLD[1]
    out[:, :, 2] = GOLD[2]
    out[:, :, 3] = (alpha * 255).astype(np.uint8)
    print('背景色采样 %.0f,%.0f,%.0f  有效像素占比 %.1f%%'
          % (bg[0], bg[1], bg[2], (alpha > 0.15).mean() * 100))
    return Image.fromarray(out, 'RGBA')


def trimmed(em):
    """裁掉四周透明边，得到紧凑的正方形徽章。"""
    bbox = em.split()[3].getbbox()
    em = em.crop(bbox)
    side = max(em.size)
    pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    pad.paste(em, ((side - em.width) // 2, (side - em.height) // 2))
    return pad


def square_icon(em, size, radius_ratio=0.235, inset=0.80, round_=False):
    """圆角方形 / 圆形底 + 居中徽章，4x 超采样后缩小。"""
    big = size * SS
    canvas = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    if round_:
        d.ellipse((0, 0, big - 1, big - 1), fill=BG + (255,))
    else:
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=BG + (255,))

    inner = int(big * inset)
    mark = em.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(mark, ((big - inner) // 2, (big - inner) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def adaptive_fg(em, size=432, ratio=0.62):
    """自适应图标前景：108dp 画布，图案落在安全区内。"""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = int(size * ratio)
    mark = em.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(mark, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def save(img, rel):
    path = os.path.join(RES, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print('  %-46s %dx%d' % (rel, img.width, img.height))


def main():
    em = trimmed(emblem_rgba())
    print('徽章紧凑尺寸', em.size)

    dens = [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]
    for dpi, size in dens:
        save(square_icon(em, size), 'mipmap-%s/ic_launcher.png' % dpi)
        save(square_icon(em, size, round_=True, inset=0.76), 'mipmap-%s/ic_launcher_round.png' % dpi)

    save(adaptive_fg(em), 'mipmap-xxxhdpi/ic_launcher_fg.png')

    v26 = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(v26, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@color/ic_launcher_bg" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_fg" />\n'
           '</adaptive-icon>\n')
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        with open(os.path.join(v26, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(xml)
        print('  mipmap-anydpi-v26/%s' % name)

    values = os.path.join(RES, 'values')
    os.makedirs(values, exist_ok=True)
    with open(os.path.join(values, 'ic_launcher_bg.xml'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_bg">#%02X%02X%02X</color>\n</resources>\n' % BG)
    print('  values/ic_launcher_bg.xml  #%02X%02X%02X' % BG)

    # 预览用：把 192 的方形图放大到 512 便于肉眼检查
    square_icon(em, 512).save(os.path.join(ROOT, 'shots', 'icon-preview-512.png'))
    print('预览 shots/icon-preview-512.png')

    # 小尺寸实际观感对比（原尺寸并排，不放大）
    strip = Image.new('RGBA', (48 + 72 + 96 + 192 + 40, 192), (235, 232, 226, 255))
    x = 8
    for sz in (48, 72, 96, 192):
        strip.alpha_composite(square_icon(em, sz), (x, 192 - sz - 8))
        x += sz + 8
    strip.save(os.path.join(ROOT, 'shots', 'icon-sizes.png'))
    print('预览 shots/icon-sizes.png')


if __name__ == '__main__':
    main()
