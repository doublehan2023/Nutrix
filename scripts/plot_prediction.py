"""Plot the predicted 0-120 min glucose curve of a /predict response, with its 80% band.
usage: python scripts/plot_prediction.py [prediction.json] [out.png]
Defaults: the newest tests/integration/out/predict_*.json (written by scripts/predict.sh), PNG next to it.
"""
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

out_dir = Path(__file__).resolve().parents[1] / "tests" / "integration" / "out"
src = Path(sys.argv[1]) if len(sys.argv) > 1 else max(out_dir.glob("predict_*.json"), key=lambda f: f.stat().st_mtime)
png = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".png")

d = json.loads(src.read_text(encoding="utf8"))
p, c = d["prediction"], d["prediction"]["curve"]
m = c["minutes"]

fig, ax = plt.subplots(figsize=(8, 4.5))
ax.fill_between(m, c["lower80"], c["upper80"], color="tab:blue", alpha=0.18, label="80% band")
ax.plot(m, c["glucose_mgdl"], color="tab:blue", lw=2.5, label="predicted glucose")
for v, col in [(140, "tab:orange"), (180, "tab:red")]:
    ax.axhline(v, color=col, ls="--", lw=1)
    ax.text(m[-1], v, f" {v}  P={p['prob_peak_above_mgdl'][str(v)]:.0%}", color=col, va="center", fontsize=9)
# The peak is predicted on its own, not read off the curve: the mean curve is smoother, so its top is lower
ax.plot(p["time_to_peak_min"], p["peak_glucose_mgdl"], "D", color="tab:purple",
        label=f"predicted peak {p['peak_glucose_mgdl']:.0f} (+{p['peak_rise_mgdl']:.0f}) at {p['time_to_peak_min']:.0f} min")

n = d["meal"]["estimated_nutrition"]
ax.set_title(f"{d['person_id']}  {d['meal']['time']} ({d['meal']['meal_type']})  "
             f"carbs {n['carbs_g']:.0f} g  confidence {d['confidence']['level']}", fontsize=10)
ax.set_xlabel("minutes after the meal")
ax.set_ylabel("glucose (mg/dL)")
ax.set_xticks(range(0, 121, 15))
ax.set_xlim(0, 120)
ax.grid(alpha=0.3)
ax.legend(loc="upper left")
fig.tight_layout()
fig.savefig(png, dpi=130)
print(png)
