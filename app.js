// =========================================================
// Bike Tire Pressure Calculator — app.js
// Calculates recommended front & rear PSI based on rider
// weight, height, bike type, tire width, tubeless option,
// and riding conditions.
// Also supports Save/Load Profile via localStorage and
// displays pressure in PSI and BAR with a visual gauge.
// =========================================================

(function () {
  "use strict";

  // ---------- DOM REFERENCES ----------
  const form = document.getElementById("pressureForm");
  const weightInput = document.getElementById("weight");
  const heightInput = document.getElementById("height");
  const bikeTypeSelect = document.getElementById("bikeType");
  const tireWidthInput = document.getElementById("tireWidth");
  const tubelessCheckbox = document.getElementById("tubeless");
  const tubelessHint = document.getElementById("tubelessHint");
  const terrainSelect = document.getElementById("terrain");
  const resultsSection = document.getElementById("results");
  const frontPressureEl = document.getElementById("frontPressure");
  const rearPressureEl = document.getElementById("rearPressure");
  const frontPressureBarEl = document.getElementById("frontPressureBar");
  const rearPressureBarEl = document.getElementById("rearPressureBar");
  const rangeTextEl = document.getElementById("rangeText");
  const tipsEl = document.getElementById("tips");
  const setupBadge = document.getElementById("setupBadge");
  const weightUnitLabel = document.getElementById("weightUnit");
  const heightUnitLabel = document.getElementById("heightUnit");
  const toggleButtons = document.querySelectorAll(".toggle-btn");

  // Gauge elements
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeMin = document.getElementById("gaugeMin");
  const gaugeMax = document.getElementById("gaugeMax");
  const gaugeLabel = document.getElementById("gaugeLabel");

  // Profile elements
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const loadProfileBtn = document.getElementById("loadProfileBtn");
  const profileNotice = document.getElementById("profileNotice");

  const PROFILE_KEY = "bikePressureProfile";

  let currentUnit = "imperial";

  // ---------- UNIT TOGGLE ----------
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentUnit = btn.dataset.unit;

      if (currentUnit === "metric") {
        weightUnitLabel.textContent = "kg";
        heightUnitLabel.textContent = "cm";
        weightInput.placeholder = "Enter your weight in kg";
        heightInput.placeholder = "Enter your height in cm";
        heightInput.step = "1";
      } else {
        weightUnitLabel.textContent = "lb";
        heightUnitLabel.textContent = "ft";
        weightInput.placeholder = "Enter your weight in lb";
        heightInput.placeholder = "e.g. 5.8 for 5 ft 10 in";
        heightInput.step = "0.1";
      }
    });
  });

  // ---------- TUBELESS HINT UPDATE ----------
  tubelessCheckbox.addEventListener("change", () => {
    if (tubelessCheckbox.checked) {
      tubelessHint.textContent =
        "\u2713 Tubeless mode \u2014 pressure will be reduced for better grip, comfort, and puncture resistance.";
      tubelessHint.classList.add("active");
    } else {
      tubelessHint.textContent =
        "Tubeless tires can safely run at lower pressures for better grip and comfort.";
      tubelessHint.classList.remove("active");
    }
  });

  // ---------- BIKE TYPE PRESETS ----------
  const bikePresets = {
    road:     { basePsi: 90,  minPsi: 70,  maxPsi: 130, tireMin: 23, tireMax: 32  },
    hybrid:   { basePsi: 65,  minPsi: 45,  maxPsi: 85,  tireMin: 28, tireMax: 47  },
    mountain: { basePsi: 30,  minPsi: 20,  maxPsi: 50,  tireMin: 40, tireMax: 65  },
    gravel:   { basePsi: 45,  minPsi: 30,  maxPsi: 70,  tireMin: 32, tireMax: 50  },
    fat:      { basePsi: 10,  minPsi: 5,   maxPsi: 20,  tireMin: 60, tireMax: 120 },
  };

  const tubelessMinOverride = {
    road:     60,
    hybrid:   35,
    mountain: 15,
    gravel:   22,
    fat:      3,
  };

  // ---------- AUTO-FILL TIRE WIDTH ----------
  bikeTypeSelect.addEventListener("change", () => {
    const preset = bikePresets[bikeTypeSelect.value];
    if (preset && !tireWidthInput.value) {
      tireWidthInput.value = Math.round((preset.tireMin + preset.tireMax) / 2);
    }
  });

  // ---------- CONVERT FEET TO INCHES ----------
  function feetToInches(feet) {
    return feet * 12;
  }

  // ---------- PSI → BAR conversion ----------
  function psiToBar(psi) {
    return (psi * 0.0689476).toFixed(2);
  }

  // ---------- CORE CALCULATION ----------
  function calculatePressure(weightLb, heightIn, bikeType, tireWidth, terrain, isTubeless) {
    const preset = bikePresets[bikeType];
    if (!preset) return null;

    const effectiveMinPsi = isTubeless
      ? tubelessMinOverride[bikeType]
      : preset.minPsi;

    let psi = preset.basePsi;

    const weightDelta = weightLb - 165;
    const weightFactor = bikeType === "road" ? 0.28 : bikeType === "fat" ? 0.04 : 0.15;
    psi += weightDelta * weightFactor;

    const heightDelta = heightIn - 68;
    psi += heightDelta * 0.15;

    const refWidth = (preset.tireMin + preset.tireMax) / 2;
    const widthDelta = tireWidth - refWidth;
    const widthFactor = bikeType === "road" ? 1.2 : bikeType === "fat" ? 0.08 : 0.4;
    psi -= widthDelta * widthFactor;

    const terrainAdjust = {
      dry: 0,
      wet: -5,
      mixed: -3,
      offroad: -7,
    };
    psi += terrainAdjust[terrain] || 0;

    if (isTubeless) {
      const tubelessReduction = bikeType === "road" ? 0.10 : 0.15;
      psi *= (1 - tubelessReduction);
    }

    psi = Math.max(effectiveMinPsi, Math.min(preset.maxPsi, psi));

    const rearPsi = Math.round(psi);
    const frontPsi = Math.round(psi * 0.9);

    const rangeLow = Math.round(frontPsi * 0.92);
    const rangeHigh = Math.round(rearPsi * 1.08);

    return {
      front: Math.max(effectiveMinPsi, frontPsi),
      rear: Math.max(effectiveMinPsi, rearPsi),
      rangeLow: Math.max(effectiveMinPsi, rangeLow),
      rangeHigh: Math.min(preset.maxPsi, rangeHigh),
      minPsi: effectiveMinPsi,
      maxPsi: preset.maxPsi,
    };
  }

  // ---------- TIPS GENERATOR ----------
  function generateTips(bikeType, terrain, tireWidth, isTubeless) {
    const tips = [];

    if (isTubeless) {
      tips.push("Tubeless setup detected \u2014 you can safely run lower pressures without pinch-flat risk.");
      tips.push("Check your sealant every 2\u20133 months and top it up as needed.");
      if (bikeType === "road") {
        tips.push("Tubeless road tires offer lower rolling resistance at reduced pressures.");
      }
      if (bikeType === "mountain" || bikeType === "gravel") {
        tips.push("Tubeless shines off-road \u2014 the sealant handles small punctures automatically.");
      }
    } else {
      if (bikeType === "mountain" || bikeType === "gravel") {
        tips.push("Consider going tubeless for better puncture resistance and lower pressures.");
      }
    }

    if (bikeType === "road") {
      tips.push("Check pressure before every ride \u2014 road tires lose air quickly.");
    }
    if (bikeType === "mountain" || bikeType === "fat") {
      tips.push("Lower pressure improves grip on loose or rocky terrain.");
    }
    if (bikeType === "gravel") {
      tips.push("Experiment +/-3 PSI to find the sweet spot for comfort vs. speed.");
    }
    if (terrain === "wet") {
      tips.push("Lower pressure helps with traction on wet surfaces.");
    }
    if (terrain === "offroad" && !isTubeless) {
      tips.push("Consider running tubeless for better puncture resistance off-road.");
    }
    if (tireWidth >= 40) {
      tips.push("Wide tires perform best at lower pressures \u2014 don't over-inflate.");
    }
    tips.push("Always check the min/max PSI printed on your tire sidewall.");
    tips.push("Use a quality floor pump with a gauge for accurate inflation.");

    return tips;
  }

  // ---------- SAVE / LOAD PROFILE ----------
  function showNotice(msg) {
    profileNotice.textContent = msg;
    profileNotice.style.opacity = "1";
    setTimeout(() => { profileNotice.style.opacity = "0"; }, 2500);
  }

  saveProfileBtn.addEventListener("click", () => {
    const profile = {
      unit: currentUnit,
      weight: weightInput.value,
      height: heightInput.value,
      bikeType: bikeTypeSelect.value,
      tireWidth: tireWidthInput.value,
      tubeless: tubelessCheckbox.checked,
      terrain: terrainSelect.value,
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      showNotice("\u2713 Profile saved!");
    } catch (_) {
      showNotice("Could not save profile.");
    }
  });

  loadProfileBtn.addEventListener("click", () => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) { showNotice("No saved profile found."); return; }
      const profile = JSON.parse(raw);

      // Restore unit toggle
      if (profile.unit) {
        currentUnit = profile.unit;
        toggleButtons.forEach((b) => {
          b.classList.toggle("active", b.dataset.unit === currentUnit);
        });
        if (currentUnit === "metric") {
          weightUnitLabel.textContent = "kg";
          heightUnitLabel.textContent = "cm";
        } else {
          weightUnitLabel.textContent = "lb";
          heightUnitLabel.textContent = "ft";
        }
      }

      weightInput.value = profile.weight || "";
      heightInput.value = profile.height || "";
      if (profile.bikeType) bikeTypeSelect.value = profile.bikeType;
      tireWidthInput.value = profile.tireWidth || "";
      tubelessCheckbox.checked = !!profile.tubeless;
      tubelessCheckbox.dispatchEvent(new Event("change"));
      if (profile.terrain) terrainSelect.value = profile.terrain;

      showNotice("\u2713 Profile loaded!");
    } catch (_) {
      showNotice("Could not load profile.");
    }
  });

  // ---------- UPDATE GAUGE ----------
  function updateGauge(rear, minPsi, maxPsi) {
    const pct = Math.min(100, Math.max(0, ((rear - minPsi) / (maxPsi - minPsi)) * 100));
    gaugeFill.style.width = pct + "%";
    gaugeMin.textContent = minPsi + " PSI";
    gaugeMax.textContent = maxPsi + " PSI";
    gaugeLabel.textContent = "Rear: " + rear + " PSI";
  }

  // ---------- FORM SUBMISSION ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let weight = parseFloat(weightInput.value);
    let height = parseFloat(heightInput.value);
    const bikeType = bikeTypeSelect.value;
    const tireWidth = parseFloat(tireWidthInput.value);
    const isTubeless = tubelessCheckbox.checked;
    const terrain = terrainSelect.value;

    if (!weight || !height || !bikeType || !tireWidth) return;

    let heightIn;
    if (currentUnit === "metric") {
      weight = weight * 2.20462;
      heightIn = height / 2.54;
    } else {
      heightIn = feetToInches(height);
    }

    const result = calculatePressure(weight, heightIn, bikeType, tireWidth, terrain, isTubeless);
    if (!result) return;

    frontPressureEl.textContent = result.front;
    rearPressureEl.textContent = result.rear;
    frontPressureBarEl.textContent = psiToBar(result.front) + " bar";
    rearPressureBarEl.textContent = psiToBar(result.rear) + " bar";

    rangeTextEl.textContent = "Front: " + result.rangeLow + "\u2013" + Math.round(result.front * 1.08) + " PSI  |  Rear: " + Math.round(result.rear * 0.92) + "\u2013" + result.rangeHigh + " PSI";

    if (isTubeless) {
      setupBadge.textContent = "\ud83d\udfe2 Tubeless Setup";
      setupBadge.className = "setup-badge tubeless";
    } else {
      setupBadge.textContent = "\u26aa Tubed Setup";
      setupBadge.className = "setup-badge tubed";
    }

    updateGauge(result.rear, result.minPsi, result.maxPsi);

    const tips = generateTips(bikeType, terrain, tireWidth, isTubeless);
    tipsEl.innerHTML =
      "<h3>Tips for Your Setup</h3>" +
      "<ul>" + tips.map(function(t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });
  });
})();