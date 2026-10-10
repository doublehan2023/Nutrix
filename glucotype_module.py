"""M1 — CGM → glucotype (Hall et al. 2018). Public API:

    gm = GlucotypeModule()                       # authors' model; or GlucotypeModule(model="path/model.npz")
    windows = gm.classify_windows(cgm)           # pid, start, glucotype, window_mean
    persons = gm.classify_persons(cgm)           # pid, frac_low/moderate/severe, n_windows, glucotype
    fields  = gm.profile_fields(persons)         # {pid: {"glucotype": {...}}} for profile.json
    gm.run(cfg)                                  # offline: S0 cgm (or canonical) -> processed/m1_glucotype/
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ..config import Config
from ..glucotype.core import GlucotypeModel
from ..glucotype.pipeline import classify, load_hall2018, summarize, windows_from_cgm
from .base import AddOnModule, ModuleInfo

INFO = ModuleInfo(
    key="m1", name="glucotype",
    spec="file.pdf — Hall H et al. Glucotypes reveal new patterns of glucose dysregulation. PLoS Biol 2018",
    attaches_to="S0 (clean CGM) → S3 (person features / metabolic position); profile.json",
    inputs=["processed/s0/cgm.parquet", "interim/canonical/{source}/cgm.parquet"],
    outputs=["processed/m1_glucotype/windows.parquet", "processed/m1_glucotype/persons.csv",
             "processed/m1_glucotype/profile_glucotype.json"],
    contributes={"profile.json": "glucotype {class, frac, n_windows, model}"},
    notes=["glucotype describes a variability pattern, not a diagnosis (workflow rule 4)",
           "level-sensitive: calibrate per device/cohort (see docs/glucotype.md)"],
)


class GlucotypeModule(AddOnModule):
    info = INFO

    def __init__(self, model: str | Path | GlucotypeModel | None = None, device: str | None = "dexcom",
                 data_root: Path | None = None):
        self._model_spec, self.device, self._root = model, device, data_root
        self._model: GlucotypeModel | None = model if isinstance(model, GlucotypeModel) else None

    @property
    def model(self) -> GlucotypeModel:
        if self._model is None:
            if self._model_spec is None:
                from ..config import load_config
                self._model = load_hall2018(self._root or load_config().data_root)
            else:
                self._model = GlucotypeModel.load(Path(self._model_spec))
        return self._model

    def classify_windows(self, cgm: pd.DataFrame) -> pd.DataFrame:
        return classify(self.model, windows_from_cgm(cgm, device=self.device))

    def classify_persons(self, cgm: pd.DataFrame) -> pd.DataFrame:
        return summarize(self.classify_windows(cgm))

    def profile_fields(self, persons: pd.DataFrame) -> dict:
        return {r.pid: {"glucotype": {"class": r.glucotype, "n_windows": int(r.n_windows), "model": self.model.source,
                                      "frac": {"low": round(r.frac_low, 3), "moderate": round(r.frac_moderate, 3),
                                               "severe": round(r.frac_severe, 3)}}}
                for r in persons.itertuples()}

    def run(self, cfg: Config) -> dict:
        self._root = cfg.data_root
        mc = cfg.raw.get("modules", {}).get("m1", {})
        self.device = mc.get("device", self.device)
        if mc.get("model") not in (None, "hall2018") and self._model is None:
            self._model_spec = cfg.data_root / mc["model"]
        src, cgm = None, None
        for rel in self.info.inputs:          # S0 keeps one device per person; fall back if it is not ours
            p = self.resolve(cfg, rel)
            if p.exists():
                df = pd.read_parquet(p)
                if not self.device or "device" not in df or (df["device"] == self.device).any():
                    src, cgm = p, df
                    break
        if cgm is None:
            raise FileNotFoundError(f"m1: no CGM input with device={self.device} in {self.info.inputs}")
        win = self.classify_windows(cgm)
        persons = summarize(win)
        od = self.out_dir(cfg)
        win.to_parquet(od / "windows.parquet", index=False)
        persons.to_csv(od / "persons.csv", index=False)
        fields = self.profile_fields(persons)
        (od / "profile_glucotype.json").write_text(json.dumps(fields, indent=2, ensure_ascii=False))
        summary = {"input": str(src), "device": self.device, "model": self.model.source, "participants": len(persons), "windows": len(win),
                   "person_glucotypes": persons.glucotype.value_counts().to_dict()}
        print(json.dumps(summary, indent=2))
        return summary
