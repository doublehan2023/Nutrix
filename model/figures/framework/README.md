# Training framework figure

`out/training_framework.{png,pdf,svg,pptx}`: which dataset supplies which inputs, which inputs train which model, and the
prediction. The PPTX uses native, editable shapes grouped by panel; the font is Inter.

To change it, edit `draw_framework.py` and run `bash render.sh` (needs Pillow, python-pptx, headless Chrome, the Inter TTF
files in `fonts/` and the CGMacros photos named in `assets.json`).

Meal photos and glucose curves come from CGMacros (Gutierrez-Osuna et al., PhysioNet 2025, doi:10.13026/3z8q-x658,
CC BY-NC-SA 4.0).
