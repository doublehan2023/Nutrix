# M1 Glucotype Add-on · `GlucotypeModule`

> Method: Hall H, et al. *Glucotypes reveal new patterns of glucose dysregulation.* PLoS Biol 2018;16:e2005143 (`file.pdf`)
> Reference code: github.com/abreschi/shinySpecClust (cloned to `~/resource/shinySpecClust`)
> Code: `src/ehrrn/modules/glucotype_module.py` (public API), `src/ehrrn/glucotype/` (implementation)
> Status: runs end to end. The authors' trained model is reproduced at 98.5% window-level agreement.

---

## 1. What it does

It classifies a person's CGM trace into **glycemic signatures**: overlapping 2.5-hour windows, each labelled
**low / moderate / severe** variability. It then assigns the person a **glucotype**, the class they spend most of their
time in, along with the time fraction for each class.

| Output | Use in the workflow |
|---|---|
| Per-window class | timeline view; can be lined up with meals (paper: windows starting ±20 min around a meal; the most severe overlapping window is the meal's class) |
| Per-person fractions `frac_low/moderate/severe` | S3 person features (metabolic position, kNN distance); profile |
| Person glucotype | `profile.json → glucotype` |

A glucotype describes a pattern of glucose variability. **It is not a diagnosis** (workflow rule 4). UI wording:
"your glucose pattern is similar to the … group".

## 2. Place in the workflow

```
S0 clean CGM (processed/s0/cgm.parquet; falls back to interim/canonical/<source>/cgm.parquet)
        │
        ▼
 GlucotypeModule ──► processed/m1_glucotype/{windows.parquet, persons.csv, profile_glucotype.json}
        │
        ├──► S3  person features: frac_severe etc. → type probability / pseudotime / neighbour distance
        └──► S8/S10  profile.json "glucotype" field; clinician AGP page
```

- **Attaches:** after S0, feeding S3.
- **Reads:** only CGM.
- **Writes:** only its own directory. The main prediction is unchanged.

## 3. Run process, step by step

Each step mirrors the authors' R code (`train.spectral.R`, `classify.R`). Deviations are listed in §3.9.

### 3.1 Resample to a 5-min grid
`to_grid`:
- Readings are binned to 5 minutes; with CGMacros' 1-min interpolated data, each bin is the mean.
- Gaps of 15 min or less (3 points or fewer) are linearly interpolated (paper: "linear imputation for gaps under 15 minutes").
- Longer gaps stay missing.
- Device: `dexcom` by default, because the model was trained on Dexcom G4. Set with `device=`.

### 3.2 Sliding windows
`make_windows`:
- Windows are 2.5 h = 30 points.
- Overlap is 75%, so a window starts every 37.5 min. Starts are rounded to the grid and alternate 35 / 40 min, the same
  as the authors' training windows.
- Any window containing a missing value is dropped (paper: "windows with larger gaps were excluded").

### 3.3 Global scaling
`prepare`: z = (x − 102.1) / 23.3, using the mean and SD of **all training windows**. This is not a per-window z-score,
so the absolute glucose level is kept. That is intended, because the classes differ in level as well as in variability.

### 3.4 Smoothing
`smooth_windows`:
- Weighted moving average with weights 1, 2, 4, 8, 16, 8, 4, 2, 1.
- Edges match R: the first 4 and last 5 points are left raw.
- A constant window gets +1 on its first value, so its complexity is not 0.

### 3.5 CID-DTW distance
`cid_dtw` is DTW multiplied by a complexity correction:
- **DTW:** R `dtw` with step pattern `symmetric2` and a Sakoe-Chiba band of 3 (10% of the window).
- **Complexity correction:** max(CE_a, CE_b) / min(CE_a, CE_b), where CE = √Σ(Δx)².
- **Implementation:** vectorised NumPy over (test × training) pairs, in chunks. Unit tests check it against a naive DTW
  that follows the R recursion literally.

### 3.6 Affinity and Nyström projection (prediction)
`GlucotypeModel.predict` classifies a new window by projecting it onto the training eigenvectors:
1. Compute the CID-DTW distance from the new window to **all** 13,566 training windows.
2. Compute μ, the window's mean distance to its K = √n ≈ 116 nearest training windows.
3. Compute the affinity with SNFtool's `affinityMatrix`: A = dnorm(d, 0, 0.5·((μ_i + μ_j)/3 + d/3)).
4. Project onto the training eigenvectors: f = A·Y.
5. Normalise f by row.
6. Assign the class whose centroid c has the largest f·c.

### 3.7 Class naming
Clusters are ordered by the median of their window means and named low → moderate → severe, as in R `define_glucotypes`.
In the authors' training data:

| Class | Windows | Mean glucose (mg/dL) | Within-window SD |
|---|---|---|---|
| low | 2,541 | 77 | 6.5 |
| moderate | 6,106 | 96 | 7.7 |
| severe | 4,919 | 122 | 13.7 |

### 3.8 Person level
`summarize`:
- The fraction of each class is the share of the person's windows in that class.
- The glucotype is the class with the largest fraction, as in the paper.

### 3.9 Deviations from the authors' Shiny app
1. **All training windows are used for prediction.** The app used a random subset of 200 or more, only to save time.
2. **μ for a new window is its own mean distance to its K nearest neighbours.** The app indexed `train_means` by the test
   row number, which is a bug.
3. **Preprocessing follows the paper text:** linear imputation for gaps of 15 min or less, then windows with gaps are
   dropped. The app instead used Stineman imputation, then circular smoothing, then masked gaps of 90 min or more.

### 3.10 Training a cohort-specific model (optional)
`fit` / `ehrrn glucotype fit` reruns the paper's training procedure on our own cohort:
1. Take the first N windows of each person, where N is the smallest count across people.
2. Compute the full CID-DTW matrix, the affinity matrix (K = √n), and the normalised Laplacian.
3. Take the k = 3 smallest eigenvectors and normalise them by row.
4. Get labels with the SNFtool discretisation (Yu & Shi).
5. Compute the centroids and name the clusters.

The eigengap heuristic for k is reported.

## 4. Interface

### Python
```python
from ehrrn.modules import GlucotypeModule
gm = GlucotypeModule()                                  # authors' model (exported to data/external/glucotype_hall2018/)
gm = GlucotypeModule(model="data/processed/glucotype/model_fit_cgmacros.npz", device="dexcom")  # cohort model
windows = gm.classify_windows(cgm)    # cgm: pid, ts (tz-aware), glucose_mgdl[, device] -> pid, start, glucotype, window_mean
persons = gm.classify_persons(cgm)    # pid, frac_low, frac_moderate, frac_severe, n_windows, glucotype
fields  = gm.profile_fields(persons)  # {pid: {"glucotype": {"class", "frac", "n_windows", "model"}}}
gm.run(cfg)                           # offline run on the configured source
```

### CLI (compute node; one person takes about 30 s)
```bash
ehrrn module run m1                          # packaged run -> processed/m1_glucotype/
ehrrn glucotype validate                     # reproduce the authors' labels
ehrrn glucotype classify [--device libre] [--model X.npz --tag T]   # + association report vs labels
ehrrn glucotype fit                          # cohort-specific model
sbatch slurm/glucotype.sbatch                # validate + classify on Slurm
```

### Output files under `data/processed/`
| File | Content |
|---|---|
| `m1_glucotype/windows.parquet` | pid, start, glucotype, window_mean |
| `m1_glucotype/persons.csv` | per-person fractions and glucotype |
| `m1_glucotype/profile_glucotype.json` | the `glucotype` field for `profile.json` (schema in `profile.schema.json`) |
| `glucotype/validate_hall2018.json` | reproduction check |
| `glucotype/report_<source>_<tag>.txt`, `persons_<source>_<tag>.csv` | association with clinical labels |
| `glucotype/model_hall2018.npz`, `model_fit_<source>.npz` | saved models |

## 5. Performance

### 5.1 Reproducing the paper's classifier
- **Test:** re-classify 2,000 random training windows of the authors and compare with their labels.
- **Result:** **98.5%** agreement whether or not each window is allowed to match itself. The paper reports 95%.
- **Meaning:** the Python port, including DTW, affinity and projection, matches the original method.

### 5.2 CGMacros (45 people: 15 healthy / 16 prediabetes / 14 T2D by A1c), authors' model, Dexcom
Data: 16,748 windows, a median of 377 per person.

**Ranking works.** frac_severe tracks the clinical measures:

| Group | frac_severe, median [IQR] |
|---|---|
| healthy | 0.80 [0.63, 0.95] |
| prediabetes | 0.90 [0.88, 0.97] |
| T2D | 0.99 [0.96, 1.00] |

- Difference between groups: Kruskal-Wallis p = 0.004.
- Spearman correlation with frac_severe: A1c ρ = +0.62 (p = 5e-6), fasting glucose ρ = +0.64, BMI ρ = +0.39,
  fasting insulin ρ = +0.33, age ρ = +0.08 (n.s.).

**Absolute calibration does not transfer.** 42 of 45 people come out "severe", including 12 of the 15 healthy people.
The cause is a level shift between sensor and cohort:

| Data | Mean window glucose (mg/dL) |
|---|---|
| CGMacros healthy | 122 |
| CGMacros all | 141 |
| Authors' training windows | 102 |
| Authors' severe class | 122 |

CGMacros' Dexcom readings run 20–40 mg/dL above its Libre at the same time points. Global scaling is level-sensitive by
design, so the whole cohort is pushed toward "severe".

### 5.3 CGMacros, authors' model, **Libre** sensor (`report_cgmacros_hall2018_libre.txt`)
18,299 windows (median 392 per person). The level matches the training data, and the classes become informative:

| A1c label | low | moderate | severe | frac_severe median [IQR] |
|---|---|---|---|---|
| healthy (15) | **9** | 5 | 1 | 0.06 [0.02, 0.11] |
| prediabetes (16) | 3 | 4 | 9 | 0.48 [0.21, 0.62] |
| T2D (14) | 0 | 1 | **13** | 0.82 [0.49, 0.96] |

- Group difference: Kruskal-Wallis p = 8e-6.
- Spearman correlation with frac_severe: A1c **ρ = +0.82** (p = 8e-12), fasting glucose **ρ = +0.83**, BMI +0.31,
  age +0.33, fasting insulin +0.25 (n.s.).
- If glucotype is read naively as diagnosis (low → healthy, moderate → prediabetes, severe → T2D), 26/45 = **58%** match
  (chance 36%). T2D is recognised well (13/14). Healthy and prediabetes overlap, as the paper also reports: some
  normoglycemic people are "severe".

### 5.4 Cohort-specific model (`fit` on CGMacros Dexcom)
> Pending: still running in job 1395735, step 3. Results will be in `report_cgmacros_fit_cgmacros.txt`.

### 5.5 Summary
| Setting | Agreement with authors | A1c ρ | Healthy → low | T2D → severe |
|---|---|---|---|---|
| Authors' training windows | 98.5% | — | — | — |
| CGMacros, Dexcom | — | 0.62 | 0/15 | 14/14 |
| CGMacros, Libre | — | **0.82** | 9/15 | 13/14 |

### 5.6 Recommendation
- For CGMacros, use the **Libre** trace with the authors' model. Its glucose level matches the training data. CGMacros'
  Dexcom reads 20–40 mg/dL higher.
- On competition data, first compare the cohort's window-mean distribution with the training data (102 ± 23 mg/dL).
  If it is shifted, use a model fitted on that cohort.
- Always pass **frac_severe as a continuous feature to S3**. Its ranking held up on both sensors.

## 6. Open items
1. Line windows up with meals (paper: ±20 min around the meal, most severe class). This gives a per-meal response class
   that S1 can use as a feature.
2. Measure the CGMacros Dexcom–Libre offset per person and decide which device the competition data matches.
3. Speed: one person takes about 30 s against the full training set. For an online service, add the training-subset
   option of the authors' app.

## 7. Rules
- Wording is "similar to the … group", never a diagnosis.
- The module only adds the `glucotype` field to `profile.json` and does not affect the main prediction.
- CGMacros is CC BY-NC-SA 4.0: non-commercial use only.
