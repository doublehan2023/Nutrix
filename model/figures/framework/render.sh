#!/bin/bash
# Draw the framework (SVG + PPTX), then render the SVG to PNG (2x) and PDF with headless Chrome (Inter installed locally).
set -e
cd "$(dirname "$0")"
~/miniconda3/bin/python draw_framework.py
OUT=$(pwd)/out
cat > "$OUT/_page.html" <<EOF
<!doctype html><html><head><meta charset="utf-8"><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block}</style></head>
<body>$(cat "$OUT/training_framework.svg")</body></html>
EOF
google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1400 --force-device-scale-factor=2 \
  --screenshot="$OUT/_full.png" "file://$OUT/_page.html" >/dev/null 2>&1
google-chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT/training_framework.pdf" \
  "file://$OUT/_page.html" >/dev/null 2>&1
~/miniconda3/bin/python -c "from PIL import Image; Image.open('$OUT/_full.png').crop((0, 0, 3840, 2160)).save('$OUT/training_framework.png')"
rm -f "$OUT/_page.html" "$OUT/_full.png"
ls -la "$OUT"
