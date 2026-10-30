"""Generate the app's own two-heart mark without external assets."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
ROOT.mkdir(parents=True, exist_ok=True)


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def heart(x, y, cx, cy):
    a, b = (x - cx) / 0.155, (cy - y) / 0.155
    return (a * a + b * b - 1) ** 3 - a * a * b ** 3 <= 0


for size, filename in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    rows = bytearray()
    for row in range(size):
        rows.append(0)
        for col in range(size):
            x, y = (col + 0.5) / size, (row + 0.5) / size
            color = (121, 88, 187)
            if heart(x, y, 0.36, 0.57):
                color = (248, 221, 201)
            if heart(x, y, 0.63, 0.44):
                color = (255, 249, 242)
            rows.extend(color)
    data = b"\x89PNG\r\n\x1a\n"
    data += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(bytes(rows)))
    data += chunk(b"IEND", b"")
    (ROOT / filename).write_bytes(data)
    print(filename)
