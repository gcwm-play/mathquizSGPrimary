"""Turn the magenta-background dino sheets into clean game sprite strips.

    python3 src/dinodash/sprites/slice.py

Reads source/<name>-sheet.png (4 running frames side by side on #FF00FF) and writes
<name>.png (4 equal frames in a row, transparent background) plus frames.json with
each frame's anchor: feet on the bottom row, snout lined up, and the top of the head
(where hats go). Needs Pillow + numpy.
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
SHRINK = 2  # sheets are drawn ~4 px per art pixel; halve them to keep files small
PAD = 2


def key_magenta(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.sqrt((255 - r) ** 2 + g**2 + (255 - b) ** 2)
    fg = d > 130
    # the dashed ground line under the feet is dark purple; keep only true black there
    h = rgb.shape[0]
    low = np.zeros_like(fg)
    ys = np.where(fg.any(1))[0]
    bottom = ys.max()
    low[bottom - 5 :, :] = True
    purple = (r + g + b > 60) & (b > g + 12) & (r > g + 8)
    fg &= ~(low & purple)
    fg &= ~(low & (r + g + b > 60) & (np.abs(r - b) < 25) & (g < 60))
    # anything in the bottom rows that is not right under a leg is ground line, not foot
    support = fg[bottom - 6].copy()
    for _ in range(3):
        support[1:] |= support[:-1].copy()
        support[:-1] |= support[1:].copy()
    fg[bottom - 5 :, :] &= support[None, :]
    # pull magenta tint out of the edge pixels → dark outline
    tinted = fg & (r > g + 50) & (b > g + 50)
    out = rgb.copy()
    out[tinted] = [24, 20, 24]
    return fg, out


def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    sizes = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        q = deque([(y0, x0)])
        lab[y0, x0] = n
        cnt = 0
        while q:
            y, x = q.popleft()
            cnt += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        q.append((yy, xx))
        sizes.append(cnt)
    return lab, sizes


def slice_sheet(name, frames=4):
    rgb = np.array(Image.open(HERE / "source" / f"{name}-sheet.png").convert("RGB")).astype(int)
    fg, rgb = key_magenta(rgb)
    lab, sizes = components(fg)
    big = [i + 1 for i, s in enumerate(sizes) if s > 3000]
    if len(big) != frames:
        sys.exit(f"{name}: expected {frames} dinos, found {len(big)} big shapes {sorted(sizes)[-6:]}")
    cx = {i: np.nonzero(lab == i)[1].mean() for i in big}
    big.sort(key=lambda i: cx[i])
    # small bits (spots, claws) go to the nearest dino
    owner = np.zeros_like(lab)
    for k, i in enumerate(big):
        owner[lab == i] = k + 1
    for i in range(1, len(sizes) + 1):
        if i in big or sizes[i - 1] < 6:
            continue
        mx = np.nonzero(lab == i)[1].mean()
        owner[lab == i] = 1 + min(range(frames), key=lambda k: abs(cx[big[k]] - mx))

    crops = []
    for k in range(frames):
        m = owner == k + 1
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        rgba = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), np.uint8)
        sub = m[y0 : y1 + 1, x0 : x1 + 1]
        rgba[..., :3] = rgb[y0 : y1 + 1, x0 : x1 + 1]
        rgba[..., 3] = sub * 255
        rgba[~sub] = 0
        crops.append(rgba)

    # line frames up on their snouts (right edge) and feet (bottom row)
    W = max(c.shape[1] for c in crops) + PAD * 2
    H = max(c.shape[0] for c in crops) + PAD
    W += (-W) % SHRINK
    H += (-H) % SHRINK
    sheet = np.zeros((H, W * frames, 4), np.uint8)
    heads = []
    for k, c in enumerate(crops):
        h, w = c.shape[:2]
        ox = k * W + W - PAD - w
        oy = H - h
        sheet[oy : oy + h, ox : ox + w] = c
        # top of the head = highest opaque pixel in the front third of the frame
        front = sheet[:, k * W + W * 2 // 3 : (k + 1) * W, 3] > 0
        hy = int(np.nonzero(front.any(1))[0].min())
        hxs = np.nonzero(front[hy])[0]
        heads.append([int((W * 2 // 3 + hxs.mean()) / SHRINK), hy // SHRINK])

    img = Image.fromarray(sheet, "RGBA").resize((W * frames // SHRINK, H // SHRINK), Image.BOX)
    a = np.array(img)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)  # crisp edges: alpha is 0 or 255
    a[a[..., 3] == 0] = 0
    Image.fromarray(a, "RGBA").save(HERE / f"{name}.png", optimize=True)
    return {"frame": [W // SHRINK, H // SHRINK], "frames": frames, "heads": heads}


def check(name, meta):
    a = np.array(Image.open(HERE / f"{name}.png"))
    fw, fh = meta["frame"]
    assert a.shape[1] == fw * meta["frames"] and a.shape[0] == fh, "wrong size"
    assert set(np.unique(a[..., 3])) <= {0, 255}, "alpha must be 0 or 255"
    assert not a[a[..., 3] == 0].any(), "transparent pixels must be 0,0,0,0"
    for k in range(meta["frames"]):
        cell = a[:, k * fw : (k + 1) * fw, 3]
        assert cell[-1].any(), f"frame {k}: feet must touch the bottom row"
        assert cell[:, -1].sum() == 0 and cell[:, 0].sum() == 0, f"frame {k}: art touches the cell edge"


if __name__ == "__main__":
    out = {}
    for name in ("trex", "raptor"):
        out[name] = slice_sheet(name)
        check(name, out[name])
        print(name, out[name])
    (HERE / "frames.json").write_text(json.dumps(out, indent=2) + "\n")
