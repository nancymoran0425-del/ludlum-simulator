"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ---------------- Helpers ----------------
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

// Poisson (Knuth)
function randomPoisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// erf approximation
function erf(x: number) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normCdf(x: number, mu: number, sigma: number) {
  const z = (x - mu) / (sigma * Math.SQRT2);
  return 0.5 * (1 + erf(z));
}

// ---------------- UI bits ----------------
function LedDisplay({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#0b0b0b",
        border: "2px solid #2b2b2b",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "inset 0 0 18px rgba(0,0,0,.9)",
      }}
    >
      <div
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: 34,
          letterSpacing: 6,
          color: "#ff3b30",
          textShadow: "0 0 12px rgba(255,59,48,.35)",
          userSelect: "none",
        }}
      >
        {text}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, fontSize: 12, opacity: 0.8 }}>
        <span>6-DIGIT</span>
        <span>LED</span>
      </div>
    </div>
  );
}

function PanelButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid #1b1b1b",
        background: active ? "#cfd3d6" : "#e6e7e8",
        borderRadius: 12,
        padding: "14px 16px",
        fontWeight: 900,
        letterSpacing: 0.5,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active ? "inset 0 3px 6px rgba(0,0,0,.25)" : "0 4px 10px rgba(0,0,0,.25)",
        opacity: disabled ? 0.6 : 1,
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  on,
  setOn,
  disabled,
}: {
  label: string;
  on: boolean;
  setOn: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && setOn(!on)}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: 170,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #131313",
        background: "#2f2f2f",
        boxShadow: "inset 0 0 12px rgba(0,0,0,.55)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        userSelect: "none",
      }}
    >
      <span style={{ color: "#e9e9e9", fontWeight: 800, fontSize: 12 }}>{label}</span>
      <span
        style={{
          width: 42,
          height: 22,
          borderRadius: 999,
          border: "1px solid #0f0f0f",
          background: on ? "#19c37d" : "#6b6b6b",
          position: "relative",
          boxShadow: on ? "0 0 10px rgba(25,195,125,.25)" : "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#f5f5f5",
            transition: "left .12s ease",
          }}
        />
      </span>
    </button>
  );
}

function Knob({
  label,
  value,
  setValue,
  min,
  max,
  step,
  units,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
  units?: string;
}) {
  const dragging = useRef(false);
  const lastY = useRef(0);

  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dy = lastY.current - e.clientY;
      lastY.current = e.clientY;

      // speed: dy pixels -> value
      const delta = dy * step * 0.6;
      const raw = value + delta;

      const snapped = Math.round((raw - min) / step) * step + min;
      setValue(clamp(snapped, min, max));
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [value, setValue, min, max, step]);

  const display =
    step < 1 ? value.toFixed(1) : Number.isInteger(step) ? Math.round(value).toString() : value.toFixed(0);

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <div
        onPointerDown={(e) => {
          dragging.current = true;
          lastY.current = e.clientY;
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        title="Drag up/down to turn"
        style={{
          width: 86,
          height: 86,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, #6b6b6b 0%, #3a3a3a 40%, #2b2b2b 70%, #232323 100%)",
          border: "2px solid #121212",
          boxShadow: "inset 0 0 18px rgba(0,0,0,.65), 0 10px 18px rgba(0,0,0,.35)",
          position: "relative",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: 34,
            background: "#f2f2f2",
            borderRadius: 2,
            transformOrigin: "50% 90%",
            transform: `translate(-50%, -90%) rotate(${angle}deg)`,
            boxShadow: "0 0 10px rgba(255,255,255,.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 28,
            height: 28,
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
            background: "#1d1d1d",
            border: "1px solid #0f0f0f",
          }}
        />
      </div>

      <div style={{ textAlign: "center", lineHeight: 1.1 }}>
        <div style={{ fontSize: 11, color: "#f2f2f2", fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#cfcfcf", fontFamily: "ui-monospace, monospace" }}>
          {display}
          {units ? ` ${units}` : ""}
        </div>
      </div>
    </div>
  );
}

function SegButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 10px",
        borderRadius: 12,
        border: "1px solid #121212",
        background: active ? "#cfd3d6" : "#2a2a2a",
        color: active ? "#111" : "#f2f2f2",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: active ? "inset 0 3px 6px rgba(0,0,0,.25)" : "inset 0 0 10px rgba(0,0,0,.4)",
      }}
    >
      {label}
    </button>
  );
}

// ---------------- Main ----------------
type RangeKey = "X1" | "X10" | "X100" | "X1K";
type SelectKey = "RATE" | "HV" | "BAT";

type SourceKey = "cs137" | "ba133" | "co60" | "background";

const SOURCES: Record<SourceKey, { label: string; energyKeV: number; strength: number }> = {
  cs137: { label: "Cs-137 (662 keV)", energyKeV: 662, strength: 9 },
  ba133: { label: "Ba-133 (356 keV)", energyKeV: 356, strength: 6 },
  co60: { label: "Co-60 (~1250 keV)", energyKeV: 1250, strength: 12 },
  background: { label: "Background", energyKeV: 60, strength: 1 },
};

export default function Ludlum2200Sim() {
  const [powerOn, setPowerOn] = useState(true);
  const [audioOn, setAudioOn] = useState(false);

  // knobs (your lab)
  const [hv, setHv] = useState(900);
  const [minutes, setMinutes] = useState(1.0);
  const [thr, setThr] = useState(652); // LLD keV
  const [win, setWin] = useState(20); // window width keV; 0 = OFF

  const [range, setRange] = useState<RangeKey>("X10");
  const [selector, setSelector] = useState<SelectKey>("RATE");

  // training controls
  const [sourceKey, setSourceKey] = useState<SourceKey>("cs137");
  const [distance, setDistance] = useState(10);

  // COUNT mode
  const [counting, setCounting] = useState(false);
  const [countTotal, setCountTotal] = useState(0);
  const [countRemainingMs, setCountRemainingMs] = useState(0);

  // readouts
  const [rateCpm, setRateCpm] = useState(0);
  const [battery, setBattery] = useState(92);

  // chi-square collection
  const [chiRuns, setChiRuns] = useState<number[]>([]);

  const rangeMult = useMemo(() => {
    const map: Record<RangeKey, number> = { X1: 1, X10: 10, X100: 100, X1K: 1000 };
    return map[range];
  }, [range]);

  // HV affects gain & resolution.
  // Gain crosses 1.0 near ~830V => window centered at 662 will peak there (HV calibration behavior).
  const gainFactor = useMemo(() => {
    const g = 0.7 + ((hv - 500) / 1000) * 0.9; // 0.7 -> 1.6
    // mild penalty if too high
    const highPenalty = hv <= 1200 ? 1 : clamp(1 - (hv - 1200) / 700, 0.55, 1);
    return clamp(g * highPenalty, 0.5, 1.6);
  }, [hv]);

  // "hvFactor" used only for resolution (sigma); best resolution near gain ~1
  const hvFactor = useMemo(() => {
    const near = 1 - clamp(Math.abs(gainFactor - 1) / 0.6, 0, 1); // 1 at gain=1, 0 when far
    return clamp(near, 0, 1);
  }, [gainFactor]);

  // REAL keV window model:
  // pulses distributed ~ N(mu, sigma) in keV scale
  const acceptance = useMemo(() => {
    const src = SOURCES[sourceKey];

    // sigma keV: better when HV is "good"
    const sigma = 25 + (1 - hvFactor) * 35; // ~25..60 keV

    // pulse height shifts with HV gain
    const mu = src.energyKeV * gainFactor;

    const low = clamp(thr, 0, 700);
    const high = clamp(thr + win, 0, 700);

    // window OFF: accept everything above LLD
    if (win <= 0) {
      return clamp(1 - normCdf(low, mu, sigma), 0, 1);
    }

    return clamp(normCdf(high, mu, sigma) - normCdf(low, mu, sigma), 0, 1);
  }, [sourceKey, thr, win, gainFactor, hvFactor]);

  // PEAK FOUND: for Cs-137, want THR=652 and WIN=20 => center=662
  const peakFound = useMemo(() => {
    if (sourceKey !== "cs137") return false;
    if (win <= 0) return false;
    const center = thr + win / 2;
    return Math.abs(center - 662) <= 10;
  }, [sourceKey, thr, win]);

  // True event rate (before window): source strength & inverse square
  const rawRateCpm = useMemo(() => {
    if (!powerOn) return 0;
    const src = SOURCES[sourceKey];
    const distFactor = 1 / Math.pow(Math.max(distance, 3) / 10, 2);
    const base = src.strength * 900 * distFactor;
    const bkg = 120;
    return Math.max(0, base + bkg);
  }, [powerOn, sourceKey, distance]);

  const acceptedRateCpm = useMemo(() => {
    if (!powerOn) return 0;
    return rawRateCpm * (0.15 + 0.85 * acceptance);
  }, [powerOn, rawRateCpm, acceptance]);

  // Ratemeter dynamics
  const lastRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;

      if (!powerOn) {
        setRateCpm(0);
        return;
      }

      // pulses that pass window (Poisson)
      const pulses = randomPoisson((acceptedRateCpm / 60) * dt);
      const instCpm = dt > 0 ? (pulses / dt) * 60 : 0;

      // smooth based on minutes knob
      const tau = clamp(0.4 + minutes * 0.6, 0.4, 6);
      const alpha = 1 - Math.exp(-dt / tau);
      setRateCpm((prev) => prev + alpha * (instCpm - prev));

      // COUNT mode accumulates accepted pulses
      if (counting) {
        setCountTotal((prev) => prev + pulses);
        setCountRemainingMs((prev) => prev - dt * 1000);
      }

      // battery drain (toy)
      setBattery((b) => clamp(b - (audioOn ? 0.0008 : 0.0003) * dt, 5, 100));
    }, 120);

    return () => clearInterval(id);
  }, [powerOn, acceptedRateCpm, minutes, counting, audioOn]);

  useEffect(() => {
    if (!counting) return;
    if (countRemainingMs <= 0) {
      setCounting(false);
      setCountRemainingMs(0);
    }
  }, [countRemainingMs, counting]);

  const remainingSec = Math.max(0, Math.round(countRemainingMs / 1000));

  const displayText = useMemo(() => {
    if (!powerOn) return "------";

    if (counting) {
      return String(Math.round(countTotal)).padStart(6, "0").slice(-6);
    }

    if (selector === "HV") return String(Math.round(hv)).padStart(6, " ").slice(-6);
    if (selector === "BAT") return String(Math.round(battery)).padStart(6, " ").slice(-6);

    // RATE: show CPM * range multiplier (like panel scaling)
    const shown = Math.round(rateCpm * rangeMult);
    return String(shown).padStart(6, "0").slice(-6);
  }, [powerOn, counting, countTotal, selector, hv, battery, rateCpm, rangeMult]);

  // meter needle
  const meterFullScale = 1000 * rangeMult;
  const needleAngle = useMemo(() => {
    const ratio = clamp(rateCpm / meterFullScale, 0, 1);
    return -90 + ratio * 180;
  }, [rateCpm, meterFullScale]);

  const countBtnLabel = counting ? "COUNTING" : "COUNT";

  function resetCountState() {
    setCounting(false);
    setCountRemainingMs(0);
    setCountTotal(0);
  }

  // Presets from your lab PDFs
  function presetHvCalibration() {
    setSourceKey("cs137");
    setThr(652);
    setWin(20);
    setMinutes(1.0);
    setSelector("RATE");
    resetCountState();
    setChiRuns([]);
  }
  function presetEnergyResolution() {
    setSourceKey("cs137");
    setThr(560);
    setWin(20);
    setMinutes(1.0);
    setSelector("RATE");
    resetCountState();
    setChiRuns([]);
  }
  function presetEfficiency() {
    setSourceKey("cs137");
    setThr(30);
    setWin(0); // window OFF
    setMinutes(1.0);
    setSelector("RATE");
    resetCountState();
    setChiRuns([]);
  }
  function presetChiSquare() {
    setSourceKey("cs137");
    setThr(652);
    setWin(20);
    setMinutes(1.0);
    setSelector("RATE");
    resetCountState();
    setChiRuns([]);
  }

  function addChiRun(count: number) {
    setChiRuns((prev) => (prev.length >= 10 ? prev : [...prev, count]));
  }

  const chiMean = useMemo(() => {
    if (chiRuns.length === 0) return 0;
    return chiRuns.reduce((a, b) => a + b, 0) / chiRuns.length;
  }, [chiRuns]);

  const chiValue = useMemo(() => {
    if (chiRuns.length < 2) return 0;
    const mean = chiMean;
    if (mean <= 0) return 0;
    return chiRuns.reduce((sum, x) => sum + Math.pow(x - mean, 2) / mean, 0);
  }, [chiRuns, chiMean]);

  return (
    <div style={{ width: "min(1020px, 100%)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#f2f2f2", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Scaler-Ratemeter Simulator (2200-style)</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Matches lab settings: THR=LLD keV (0–700), WIN keV width (0=OFF), Cs-137 peak 662.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* POWER */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: powerOn ? "#19c37d" : "#6b6b6b",
                boxShadow: powerOn ? "0 0 10px rgba(25,195,125,.35)" : "none",
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.85 }}>POWER</div>
          </div>

          {/* PEAK */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: peakFound ? "#19c37d" : "#6b6b6b",
                boxShadow: peakFound ? "0 0 10px rgba(25,195,125,.35)" : "none",
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.85 }}>PEAK {peakFound ? "FOUND" : "SEARCH"}</div>
          </div>
        </div>
      </div>

      {/* Device */}
      <div
        style={{
          background: "#2b2b2b",
          border: "2px solid #1a1a1a",
          borderRadius: 18,
          boxShadow: "0 18px 60px rgba(0,0,0,.55)",
          padding: 18,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.85fr",
          gap: 16,
          color: "#f2f2f2",
        }}
      >
        {/* Left */}
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 12, alignItems: "center" }}>
            <LedDisplay text={displayText} />

            <div style={{ display: "grid", gap: 10 }}>
              <PanelButton
                label={countBtnLabel}
                active={counting}
                disabled={!powerOn}
                onClick={() => {
                  if (!powerOn) return;
                  if (counting) {
                    // stop
                    resetCountState();
                    return;
                  }
                  setCountTotal(0);
                  setCountRemainingMs(minutes * 60 * 1000);
                  setCounting(true);
                }}
              />

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.9,
                  background: "#1f1f1f",
                  border: "1px solid #151515",
                  borderRadius: 12,
                  padding: "10px 12px",
                  boxShadow: "inset 0 0 12px rgba(0,0,0,.55)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 900 }}>SELECT</span>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>{selector}</span>
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>{counting ? "TIME" : "RANGE"}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>{counting ? `${remainingSec}s` : range}</span>
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>LLD/WIN</span>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>
                    {thr}/{win > 0 ? win : "OFF"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Analog meter */}
          <div
            style={{
              background: "#e9e9ea",
              borderRadius: 14,
              padding: 14,
              color: "#111",
              border: "2px solid #1c1c1c",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 900 }}>COUNTS / MIN</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>FS: {meterFullScale.toLocaleString()} CPM</div>
            </div>

            <div style={{ position: "relative", height: 150, marginTop: 10 }}>
              {/* ticks */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 140 }}>
                {Array.from({ length: 11 }).map((_, i) => {
                  const a = -90 + (i / 10) * 180;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 0,
                        width: 2,
                        height: i % 5 === 0 ? 20 : 12,
                        background: "#111",
                        transformOrigin: "bottom center",
                        transform: `translateX(-50%) rotate(${a}deg) translateY(-110px)`,
                      }}
                    />
                  );
                })}
              </div>

              {/* needle */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 8,
                  width: 3,
                  height: 120,
                  background: "#d10000",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${needleAngle}deg)`,
                  boxShadow: "0 0 10px rgba(209,0,0,.25)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 0,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  transform: "translateX(-50%)",
                  background: "#111",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85 }}>
              <span>0</span>
              <span>{Math.round(meterFullScale / 2)}</span>
              <span>{meterFullScale}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* RANGE */}
          <div
            style={{
              background: "#1f1f1f",
              border: "1px solid #141414",
              borderRadius: 14,
              padding: 12,
              boxShadow: "inset 0 0 12px rgba(0,0,0,.55)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>RANGE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["X1", "X10", "X100", "X1K"] as RangeKey[]).map((r) => (
                <SegButton key={r} label={r} active={range === r} onClick={() => setRange(r)} disabled={!powerOn} />
              ))}
            </div>
          </div>

          {/* SELECT */}
          <div
            style={{
              background: "#1f1f1f",
              border: "1px solid #141414",
              borderRadius: 14,
              padding: 12,
              boxShadow: "inset 0 0 12px rgba(0,0,0,.55)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>SELECT</div>
            <div style={{ display: "grid", gap: 8 }}>
              {(["RATE", "HV", "BAT"] as SelectKey[]).map((s) => (
                <SegButton key={s} label={s} active={selector === s} onClick={() => setSelector(s)} disabled={!powerOn} />
              ))}
            </div>
          </div>

          {/* Knobs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Knob label="MINUTES" value={minutes} setValue={setMinutes} min={0.1} max={10} step={0.1} units="min" />
            <Knob label="HV" value={hv} setValue={setHv} min={500} max={1500} step={2} units="V" />
            <Knob label="WIN" value={win} setValue={setWin} min={0} max={200} step={1} units="keV" />
            <Knob label="THR" value={thr} setValue={setThr} min={0} max={700} step={1} units="keV" />
          </div>

          {/* Power + audio */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Toggle
              label="POWER"
              on={powerOn}
              setOn={(v) => {
                setPowerOn(v);
                if (!v) {
                  resetCountState();
                  setChiRuns([]);
                }
              }}
            />
            <Toggle label="AUDIO" on={audioOn} setOn={setAudioOn} disabled={!powerOn} />
          </div>
        </div>
      </div>

      {/* Training controls below */}
      <div
        style={{
          marginTop: 14,
          background: "#1b1b1b",
          border: "1px solid #101010",
          borderRadius: 14,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          color: "#f2f2f2",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>LAB PRESETS</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={presetHvCalibration}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                border: "1px solid #2a2a2a",
                background: "#2a2a2a",
                color: "#f2f2f2",
              }}
            >
              HV CAL
            </button>
            <button
              onClick={presetEnergyResolution}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                border: "1px solid #2a2a2a",
                background: "#2a2a2a",
                color: "#f2f2f2",
              }}
            >
              RESOLUTION
            </button>
            <button
              onClick={presetEfficiency}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                border: "1px solid #2a2a2a",
                background: "#2a2a2a",
                color: "#f2f2f2",
              }}
            >
              EFFICIENCY
            </button>
            <button
              onClick={presetChiSquare}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                border: "1px solid #2a2a2a",
                background: "#2a2a2a",
                color: "#f2f2f2",
              }}
            >
              CHI-SQUARE
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            HV CAL uses THR 652 / WIN 20 / 1 min (peak center 662). Efficiency uses THR 30 / WIN OFF.
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>SOURCE / DISTANCE</div>
          <select
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value as SourceKey)}
            style={{
              background: "#101010",
              color: "#f2f2f2",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "10px 12px",
              outline: "none",
            }}
          >
            {Object.entries(SOURCES).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="range"
              min={3}
              max={60}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ width: 64, textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{distance} cm</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>READOUT / CHI-SQUARE</div>

          <div
            style={{
              background: "#101010",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "10px 12px",
              fontFamily: "ui-monospace, monospace",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.75 }}>Raw rate</span>
              <span>{Math.round(rawRateCpm).toLocaleString()} CPM</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.75 }}>Accepted</span>
              <span>{Math.round(acceptance * 100)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.75 }}>Shown CPM</span>
              <span>{Math.round(rateCpm).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.75 }}>Gain</span>
              <span>{gainFactor.toFixed(2)}</span>
            </div>

            <div style={{ height: 1, background: "#2a2a2a", margin: "6px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ opacity: 0.75 }}>Chi runs</span>
              <span>{chiRuns.length}/10</span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => addChiRun(countTotal)}
                disabled={counting || !powerOn || chiRuns.length >= 10}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "1px solid #2a2a2a",
                  background: chiRuns.length >= 10 ? "#1f1f1f" : "#2a2a2a",
                  color: "#f2f2f2",
                  opacity: counting ? 0.6 : 1,
                }}
              >
                SAVE COUNT
              </button>

              <button
                onClick={() => setChiRuns([])}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "1px solid #2a2a2a",
                  background: "#2a2a2a",
                  color: "#f2f2f2",
                }}
              >
                CLEAR
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Mean: {chiMean ? chiMean.toFixed(1) : "—"} | χ²: {chiRuns.length >= 2 ? chiValue.toFixed(2) : "—"}
            </div>

            {chiRuns.length > 0 && (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Runs: {chiRuns.map((x) => Math.round(x)).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

<div
  style={{
    marginTop: 24,
    textAlign: "center",
    fontFamily: "var(--font-press-start), ui-monospace, monospace",
    fontSize: 16,
    letterSpacing: "0.08em",
    color: "#ad73d1",
    textShadow: "0 0 10px rgba(173,115,209,0.45)",
    userSelect: "none",
  }}
>
  ⋆୨୧ Made by Nancy ୨୧⋆
</div>
    </div>
  );
}