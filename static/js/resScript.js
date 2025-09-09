// resScript.js
// - Keeps your original update logic.
// - Adds robust min/max/step normalization for sliders based on union of UCI/Framingham.
// - Clamps values during drag/scroll and updates display text live.

(function () {
  // Canonical limits derived from templates/index.html
  const LIMITS = {
    age: { min: 18, max: 100, step: 1 },

    bmi: { min: 10, max: 60, step: 0.1 },
    heartrate: { min: 40, max: 200, step: 1 },

    sysbp: { min: 80, max: 250, step: 1 },
    diabp: { min: 50, max: 150, step: 1 },
    restingbps: { min: 80, max: 200, step: 1 },   // UCI trestbps / Resting BP (Systolic)

    maxheartrate: { min: 60, max: 220, step: 1 }, // UCI thalach

    cholesterol: { min: 100, max: 400, step: 1 }, // UCI
    totchol: { min: 100, max: 400, step: 1 },     // Framingham

    oldpeak: { min: 0, max: 6, step: 0.1 },
    stslope: { min: 0, max: 2, step: 1 },

    fastingbloodsugar: { min: 0, max: 1, step: 1 }, // UCI fbs
    sex: { min: 0, max: 1, step: 1 },
    chestpaintype: { min: 0, max: 3, step: 1 },     // UCI cp
    exerciseangina: { min: 0, max: 1, step: 1 },    // UCI exang

    currentsmoker: { min: 0, max: 1, step: 1 },
    cigsperday: { min: 0, max: 60, step: 1 },
    bpmeds: { min: 0, max: 1, step: 1 },
    prevalentstroke: { min: 0, max: 1, step: 1 },
    prevalenthyp: { min: 0, max: 1, step: 1 },
    diabetes: { min: 0, max: 1, step: 1 },

    restecg: { min: 0, max: 2, step: 1 }
  };

  // Synonyms -> canonical keys (works with human-readable labels)
  const SYN = {
    // units/labels from your UI
    "cholesterolmgdl": "cholesterol",
    "restingbpmmhg": "restingbps",
    "maxheartratebpm": "maxheartrate",
    "oldpeakstdepression": "oldpeak",
    "stslope": "stslope",
    "fastingbloodsugar": "fastingbloodsugar",
    "exerciseinducedangina": "exerciseangina",

    // UCI short names
    "trestbps": "restingbps",
    "thalach": "maxheartrate",
    "fbs": "fastingbloodsugar",
    "cp": "chestpaintype",
    "exang": "exerciseangina",

    // other common variants
    "restingbps": "restingbps",
    "restingbpsystolic": "restingbps",
    "resting-bp-s": "restingbps",
    "max-heart-rate": "maxheartrate"
  };

  function normalizeKey(s) {
    if (!s) return "";
    return String(s)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\/\-\._]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function canonicalKey(raw) {
    const k = normalizeKey(raw);
    if (LIMITS[k]) return k;
    if (SYN[k]) return SYN[k];
    return k; // may resolve to nothing; caller must check LIMITS[canon]
  }

  function clamp(v, lo, hi) {
    const x = typeof v === "number" ? v : parseFloat(v);
    if (Number.isNaN(x)) return lo;
    return Math.min(hi, Math.max(lo, x));
  }

  function applyLimitsFromMap(input) {
    const featRaw = input.dataset.feat || input.id || input.name || "";
    const key = canonicalKey(featRaw);
    const lim = LIMITS[key];
    if (!lim) return; // nothing to do

    // apply if not already correct or clearly placeholder
    const curMin = parseFloat(input.min);
    const curMax = parseFloat(input.max);
    if (isNaN(curMin) || curMin < -50 || curMin > lim.min) input.min = lim.min;
    if (isNaN(curMax) || curMax > 500 || curMax < lim.max) input.max = lim.max;

    // step
    if (!input.step || input.step === "any" || parseFloat(input.step) <= 0) {
      input.step = String(lim.step || 1);
    }

    // clamp current value to valid range
    input.value = clamp(parseFloat(input.value), lim.min, lim.max);
  }

  // Find the attached <span> for showing the live value
  function findValueSpanForInput(input) {
    const prev = input.previousElementSibling;
    if (prev && prev.tagName.toLowerCase() === "label") {
      const span = prev.querySelector("span");
      if (span) return span;
    }
    const parent = input.parentElement;
    if (parent) {
      const span = parent.querySelector(".slider-value");
      if (span) return span;
    }
    return null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sliders = Array.from(document.querySelectorAll("input.slider"));

    // Normalize limits from our union map
    sliders.forEach((s) => applyLimitsFromMap(s));

    // Initialize and live-update the text values
    sliders.forEach((s) => {
      const span = findValueSpanForInput(s);
      if (span) span.textContent = s.value;

      const update = (el) => {
        // Re-apply limits (covers wheel/keyboard & any programmatic set)
        applyLimitsFromMap(el);
        const sp = findValueSpanForInput(el);
        if (sp) sp.textContent = el.value;
      };

      s.addEventListener("input", (e) => update(e.target));
      s.addEventListener("change", (e) => update(e.target));
      // Defensive: prevent stepping outside range via wheel on focused slider
      s.addEventListener("wheel", (e) => {
        // allow native, then clamp
        requestAnimationFrame(() => update(s));
      });
    });

    // Ensure an Update button exists (keeps your original behavior)
    let updateBtn = document.getElementById("update-btn");
    if (!updateBtn) {
      const left = document.querySelector(".left-panel");
      if (left) {
        updateBtn = document.createElement("button");
        updateBtn.id = "update-btn";
        updateBtn.textContent = "Update Prediction";
        left.appendChild(updateBtn);
      }
    }

    // Click -> POST modified sliders + BASE_INPUTS to /predict (original logic)
    if (updateBtn) {
      updateBtn.addEventListener("click", async () => {
        const modified = {};
        sliders.forEach((s) => {
          const featKey = s.dataset.feat || s.id || s.name || null;
          if (featKey) modified[featKey] = s.value;
        });

        if (typeof BASE_INPUTS === "undefined") {
          console.warn("BASE_INPUTS is not defined on page. Cannot send base_inputs.");
          alert("Base input values missing — update cannot run.");
          return;
        }

        const payload = { base_inputs: BASE_INPUTS, modified };

        updateBtn.disabled = true;
        updateBtn.textContent = "Updating...";

        try {
          const resp = await fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error("Server returned " + resp.status);
          const data = await resp.json();

          // Update the result display
          const target =
            document.getElementById("final-result") ||
            document.querySelector(".prediction");

          if (target) {
            if (data.final_cat) target.innerText = data.final_cat;
            else if (data.final_prob !== undefined)
              target.innerText = (data.final_prob * 100).toFixed(1) + "%";
          }

          // Update suggestions list if provided
          if (data.tips || data.suggestions) {
            const tips = data.tips || data.suggestions;
            const list = document.querySelector(".suggestions ul");
            if (list) {
              list.innerHTML = "";
              tips.forEach((t) => {
                const li = document.createElement("li");
                if (typeof t === "object" && t.feature && t.tip) {
                  li.innerHTML = `<strong>${t.feature}</strong> — ${t.tip}`;
                } else {
                  li.textContent = t;
                }
                list.appendChild(li);
              });
            }
          }

          // If server returns updated slider values, reflect them
          if (data.top_features_values && Array.isArray(data.top_features_values)) {
            data.top_features_values.forEach((item) => {
              const slider = document.querySelector(
                `input.slider[data-feat="${item.name}"]`
              );
              if (slider) {
                slider.value = item.value;
                applyLimitsFromMap(slider);
                const span = findValueSpanForInput(slider);
                if (span) span.textContent = slider.value;
              }
            });
          }
        } catch (err) {
          console.error("Update failed:", err);
          alert("Failed to update prediction. Check server logs.");
        } finally {
          updateBtn.disabled = false;
          updateBtn.textContent = "Update Prediction";
        }
      });
    }
  });
})();
