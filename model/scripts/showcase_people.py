"""Showcase: 10 participants who differ in demographics and whose day-8+ predictions agree best with the recorded CGM.
Per person: correlation between predicted and recorded glucose over every 5-min point of all their day-8+ meals (0-120 min),
peak-rise error. Candidates = the better half by correlation; then a greedy pick that spreads age, sex, BMI and group.
This is a curated selection for a demo, not the typical accuracy (see the report for that).
usage: python -I showcase_people.py <CGMacros dir> <stage1 dir> <blend dir> <out dir>
"""
import sys, os, json, pickle
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pmrf.data import load_cgmacros

DATA, S1, BL, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
st = pickle.load(open(os.path.join(S1, "stage1.pkl"), "rb")); fp = pickle.load(open(os.path.join(BL, "final_preds.pkl"), "rb"))
TE = st["TE"]; CURV = st["outer"]["CURV"]
assert (fp["te_index"] == TE.index.to_numpy()).all()
bio = pd.read_csv(os.path.join(DATA, "bio.csv")); bio.columns = [c.strip() for c in bio.columns]
bio["pid"] = bio.subject.map(lambda x: f"{int(x):03d}")
bio = bio.set_index("pid")
persons = load_cgmacros(DATA)
t = np.arange(0, 121, 5)

rows = []
for pid, g in TE.groupby("pid"):
    k = np.flatnonzero(TE.pid.to_numpy() == pid)
    g0 = TE.G0.to_numpy()[k][:, None]
    pred = g0 + fp["curve"][k]; obs = g0 + CURV[TE.index.to_numpy()[k]]
    ok = np.isfinite(obs)
    r = float(np.corrcoef(pred[ok], obs[ok])[0, 1])
    b = bio.loc[pid]
    a1c = float(b["A1c PDL (Lab)"])
    rows.append(dict(pid=pid, meals=len(k), r_curve=round(r, 3), curve_mae=round(float(np.mean(np.abs(pred[ok] - obs[ok]))), 1),
                     peak_rise_mae=round(float(np.mean(np.abs(fp["blend"]["dpeak"][k] - TE.dpeak.to_numpy()[k]))), 1),
                     age=int(b["Age"]), sex=str(b["Gender"]).strip(), bmi=round(float(b["BMI"]), 1), ethnicity=str(b["Self-identify"]).strip(),
                     hba1c=a1c, group="Healthy" if a1c < 5.7 else ("Prediabetes" if a1c < 6.5 else "Type 2 diabetes")))
P = pd.DataFrame(rows).sort_values("r_curve", ascending=False).reset_index(drop=True)

# Correlation is lower for healthy people at the same accuracy (their glucose varies less), so the pick is per group:
# 5 prediabetes and 5 type 2 diabetes (no healthy participants), each from the better half of its group by correlation, spread over age,
# BMI, sex and ethnicity across the whole selection.
QUOTA = {"Prediabetes": 5, "Type 2 diabetes": 5}          # no healthy participants (team decision)
cand = pd.concat([g[g.r_curve >= g.r_curve.median()] for _, g in P.groupby("group")]).reset_index(drop=True)
Z = np.column_stack([cand.age / 12, cand.bmi / 5, (cand.sex == "F").astype(float) * 1.5, (cand.ethnicity != "Hispanic/Latino").astype(float) * 1.5])
chosen = []
for grp, q in QUOTA.items():
    idx = np.flatnonzero(cand.group.to_numpy() == grp)
    for _ in range(q):
        if chosen:
            dmin = np.min(np.linalg.norm(Z[idx][:, None, :] - Z[None, chosen, :], axis=2), axis=1)
        else:
            dmin = np.zeros(len(idx))
        score = dmin + 3.0 * (cand.r_curve.to_numpy()[idx] - cand.r_curve.to_numpy()[idx].min())
        score[np.isin(idx, chosen)] = -np.inf
        chosen.append(int(idx[np.argmax(score)]))
S = cand.iloc[chosen].sort_values(["group", "age"]).reset_index(drop=True)
S.to_csv(os.path.join(OUT, "showcase_10.csv"), index=False)
P.to_csv(os.path.join(OUT, "all_44_ranked.csv"), index=False)

# ---------------------------------------------------------------- figure 1: days 8+ CGM with every predicted curve
plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
fig, axs = plt.subplots(10, 1, figsize=(13, 26))
for ax, (_, s) in zip(axs, S.iterrows()):
    p = persons[s.pid]
    k = np.flatnonzero(TE.pid.to_numpy() == s.pid)
    times = pd.to_datetime(TE.time.to_numpy()[k])
    t0, t1 = times.min() - pd.Timedelta("3h"), times.max() + pd.Timedelta("3h")
    c = p.cgm[(p.cgm.index >= t0) & (p.cgm.index <= t1)]
    ax.plot(c.index, c.values, color="#222", lw=1.1, label="recorded CGM (Dexcom)")
    for j, i in enumerate(k):
        tt = pd.to_datetime(TE.time.iloc[i]) + pd.to_timedelta(t, unit="min")
        g0 = TE.G0.iloc[i]
        ax.fill_between(tt, g0 + fp["band_lo"][i], g0 + fp["band_hi"][i], color="#2b6cb0", alpha=0.15, lw=0)
        ax.plot(tt, g0 + fp["curve"][i], color="#2b6cb0", lw=2, label="predicted (80% band)" if j == 0 else None)
        ax.axvline(tt[0], color="#999", lw=0.6, ls=":")
    ax.set_title(f"Participant {s.pid} · {s.group} · {s.sex}, {s.age} y, BMI {s.bmi}, HbA1c {s.hba1c}% · {s.meals} new meals · "
                 f"r = {s.r_curve:.2f}, peak-rise error {s.peak_rise_mae} mg/dL", fontsize=9.5, loc="left")
    ax.set_ylabel("mg/dL")
axs[0].legend(frameon=False, fontsize=8, loc="upper right")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "showcase_traces.png"), dpi=130); plt.close(fig)

# ---------------------------------------------------------------- figure 2: predicted vs recorded, every 5-min point
fig, axs = plt.subplots(2, 5, figsize=(16, 7))
for ax, (_, s) in zip(axs.ravel(), S.iterrows()):
    k = np.flatnonzero(TE.pid.to_numpy() == s.pid)
    g0 = TE.G0.to_numpy()[k][:, None]
    pred = (g0 + fp["curve"][k]).ravel(); obs = (g0 + CURV[TE.index.to_numpy()[k]]).ravel()
    ok = np.isfinite(obs)
    lo, hi = np.nanmin([pred[ok].min(), obs[ok].min()]) - 5, np.nanmax([pred[ok].max(), obs[ok].max()]) + 5
    ax.plot([lo, hi], [lo, hi], color="#aaa", lw=1, ls="--")
    ax.scatter(obs[ok], pred[ok], s=7, alpha=0.6, color="#2b6cb0")
    ax.set_xlim(lo, hi); ax.set_ylim(lo, hi)
    ax.set_title(f"{s.pid} · {s.sex}, {s.age} y, BMI {s.bmi}\n{s.group} · r = {s.r_curve:.2f}", fontsize=9)
    ax.set_xlabel("recorded (mg/dL)", fontsize=8); ax.set_ylabel("predicted (mg/dL)", fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(OUT, "showcase_scatter.png"), dpi=130); plt.close(fig)
summary = dict(all_people=len(P), median_r_all=float(P.r_curve.median()), showcase=S.to_dict("records"))
json.dump(summary, open(os.path.join(OUT, "summary.json"), "w"), indent=1)
print(S.to_string(index=False)); print("median r over all 44:", round(P.r_curve.median(), 3), "| range", P.r_curve.min(), "-", P.r_curve.max())

# ---------------------------------------------------------------- one meal per showcase person (10 meals)
# Per meal: correlation over its 25 points, curve MAE and peak-rise error; only meals with a visible recorded rise (>= 25 mg/dL) and a photo.
# Greedy over people with a penalty for repeating a recipe (same logged carbs and kcal) so the 10 meals show different foods.
# Meal id = m<pid>_<row> as in the demo data and the API examples.
from PIL import Image, ImageOps
mrows = []
for k, i in enumerate(TE.index):
    r = TE.loc[i]
    if r.pid not in set(S.pid) or not isinstance(r.photo, str): continue
    pred = r.G0 + fp["curve"][k]; obs = r.G0 + CURV[i]; ok = np.isfinite(obs)
    if ok.sum() < 20 or r.dpeak < 25: continue
    mrows.append(dict(meal_id=f"m{r.pid}_{i}", pid=r.pid, k=k, i=i, meal_type=r.meal_type, time=str(r.time), carbs_g=r.carbs, protein_g=r.protein,
                      fat_g=r.fat, fiber_g=r.fiber, kcal=r.kcal, kcal_logged=r.meal_kcal_logged, photo=r.photo, recipe_seen_in_week1=bool(r.seen), G0=round(float(r.G0), 1),
                      rise_recorded=round(float(r.dpeak), 1), rise_predicted=round(float(fp["blend"]["dpeak"][k]), 1),
                      peak_recorded=round(float(r.Gmax), 1), peak_predicted=round(float(r.G0 + fp["blend"]["dpeak"][k]), 1),
                      r_curve=round(float(np.corrcoef(pred[ok], obs[ok])[0, 1]), 3), curve_mae=round(float(np.mean(np.abs(pred[ok] - obs[ok]))), 1)))
MM = pd.DataFrame(mrows)
MM["peak_err"] = (MM.rise_predicted - MM.rise_recorded).abs().round(1)
MM["score"] = MM.r_curve - MM.curve_mae / 20 - MM.peak_err / 20
used, pick = set(), []
for pid in S.sort_values("r_curve", ascending=False).pid:          # best-correlated people choose first
    g = MM[MM.pid == pid].copy()
    g["adj"] = g.score - 0.3 * g.apply(lambda x: (x.carbs_g, x.kcal) in used, axis=1)
    b = g.sort_values("adj", ascending=False).iloc[0]
    used.add((b.carbs_g, b.kcal)); pick.append(b)
MS = pd.DataFrame(pick).merge(S[["pid", "group", "age", "sex", "bmi", "ethnicity", "hba1c"]], on="pid").sort_values(["group", "age"]).reset_index(drop=True)
MS.drop(columns=["k", "i", "score", "adj"]).to_csv(os.path.join(OUT, "showcase_10_meals.csv"), index=False)
# input of scripts/export_ui_package.py (the UI package with the live API responses)
pd.DataFrame(dict(pid=MS.pid, meal_index=MS.i.astype(int), time=MS.time, meal_type=MS.meal_type, curve_mae=MS.curve_mae,
                  pred_dpeak=MS.rise_predicted, logged_dpeak=MS.rise_recorded)).to_csv(os.path.join(OUT, "showcase_meals.csv"), index=False)

fig = plt.figure(figsize=(17, 13.5))
gs = fig.add_gridspec(4, 5, height_ratios=[1, 1.15, 1, 1.15], hspace=0.42, wspace=0.28)
for n, (_, m) in enumerate(MS.iterrows()):
    row, col = 2 * (n // 5), n % 5
    axp = fig.add_subplot(gs[row, col]); axc = fig.add_subplot(gs[row + 1, col])
    im = ImageOps.fit(ImageOps.exif_transpose(Image.open(m.photo)).convert("RGB"), (400, 300))
    axp.imshow(im); axp.set_xticks([]); axp.set_yticks([])
    for sp in axp.spines.values(): sp.set_visible(False)
    axp.set_title(f"{m.pid}_{pd.Timestamp(m.time):%m%d_%H%M}_{m.meal_type}\n{m.sex}, {m.age} y, BMI {m.bmi} · {m.group.replace('Type 2 diabetes', 'T2D')}", fontsize=9.5)
    p = persons[m.pid]; t_meal = pd.Timestamp(m.time)
    c = p.cgm[(p.cgm.index >= t_meal - pd.Timedelta("60min")) & (p.cgm.index <= t_meal + pd.Timedelta("120min"))]
    mins = (c.index - t_meal).total_seconds() / 60
    kk = int(m.k)
    axc.fill_between(t, m.G0 + fp["band_lo"][kk], m.G0 + fp["band_hi"][kk], color="#2b6cb0", alpha=0.15, lw=0)
    axc.plot(mins, c.values, color="#222", lw=1.3, label="recorded")
    axc.plot(t, m.G0 + fp["curve"][kk], color="#2b6cb0", lw=2.2, label="predicted (80% band)")
    axc.axvline(0, color="#999", lw=0.8, ls=":")
    axc.set_xlim(-60, 125); axc.set_xticks([-60, 0, 30, 60, 90, 120]); axc.set_xlabel("min from meal", fontsize=8)
    axc.set_title(f"{m.carbs_g:.0f} g carbs, {m.kcal_logged:.0f} kcal · rise {m.rise_recorded:.0f} rec / {m.rise_predicted:.0f} pred\n"
                  f"r = {m.r_curve:.2f}, curve error {m.curve_mae:.0f} mg/dL", fontsize=8.5)
    if col == 0: axc.set_ylabel("glucose (mg/dL)", fontsize=8)
    if n == 0: axc.legend(frameon=False, fontsize=7.5, loc="upper left")
fig.savefig(os.path.join(OUT, "showcase_best_meals.png"), dpi=120, bbox_inches="tight"); plt.close(fig)
print(MS[["meal_id", "pid", "group", "sex", "age", "bmi", "meal_type", "carbs_g", "kcal", "rise_recorded", "rise_predicted", "r_curve", "curve_mae"]].to_string(index=False))
