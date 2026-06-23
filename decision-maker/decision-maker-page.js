(() => {
  const STORAGE_KEY = "paiden_decision_maker_state_v1";
  const STEP_ORDER = ["intro", "setup", "ratings", "review", "results"];
  const CLOSE_CALL_THRESHOLD = 0.03;
  const DEFAULT_POSITIVE_LABEL = "Do it";
  const DEFAULT_NEGATIVE_LABEL = "Don't do it";
  const DEFAULT_WEIGHTS = [25, 25, 25, 25];

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `criterion-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function toNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampRating(value) {
    return clamp(Math.round(toNumber(value) || 5), 1, 9);
  }

  function sanitizeText(value, fallback = "") {
    return String(value || fallback).trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPercent(value, decimals = 1) {
    const fixed = Number(value).toFixed(decimals);
    return `${fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}%`;
  }

  function formatShare(share) {
    return formatPercent((toNumber(share) || 0) * 100, 1);
  }

  function makeCriterion(weight) {
    return {
      id: makeId(),
      name: "",
      weight,
      rating: 5,
    };
  }

  function createDefaultState() {
    return {
      currentStep: "intro",
      decisionTitle: "",
      positiveLabel: DEFAULT_POSITIVE_LABEL,
      negativeLabel: DEFAULT_NEGATIVE_LABEL,
      currentCriterionIndex: 0,
      criteria: DEFAULT_WEIGHTS.map(makeCriterion),
    };
  }

  function sanitizeCriterion(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: sanitizeText(raw.id, "") || makeId(),
      name: sanitizeText(raw.name, ""),
      weight: Math.max(0, toNumber(raw.weight)),
      rating: clampRating(raw.rating),
    };
  }

  function sanitizeState(raw) {
    const base = createDefaultState();
    if (!raw || typeof raw !== "object") return base;

    const criteria = Array.isArray(raw.criteria)
      ? raw.criteria.map((criterion) => sanitizeCriterion(criterion)).filter(Boolean)
      : base.criteria;

    return {
      currentStep: STEP_ORDER.includes(raw.currentStep) ? raw.currentStep : base.currentStep,
      decisionTitle: sanitizeText(raw.decisionTitle, ""),
      positiveLabel: sanitizeText(raw.positiveLabel, DEFAULT_POSITIVE_LABEL) || DEFAULT_POSITIVE_LABEL,
      negativeLabel: sanitizeText(raw.negativeLabel, DEFAULT_NEGATIVE_LABEL) || DEFAULT_NEGATIVE_LABEL,
      currentCriterionIndex: clamp(toNumber(raw.currentCriterionIndex), 0, Math.max(criteria.length - 1, 0)),
      criteria: criteria.length ? criteria : base.criteria,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      return sanitizeState(JSON.parse(raw));
    } catch (_) {
      return createDefaultState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Non-fatal storage issue.
    }
  }

  function positiveLabel() {
    return sanitizeText(state.positiveLabel, DEFAULT_POSITIVE_LABEL) || DEFAULT_POSITIVE_LABEL;
  }

  function negativeLabel() {
    return sanitizeText(state.negativeLabel, DEFAULT_NEGATIVE_LABEL) || DEFAULT_NEGATIVE_LABEL;
  }

  function decisionTitle() {
    return sanitizeText(state.decisionTitle, "This decision") || "This decision";
  }

  function getCriterionLabel(criterion, index) {
    return sanitizeText(criterion && criterion.name, `Criterion ${index + 1}`) || `Criterion ${index + 1}`;
  }

  function getWeightTotal(criteria = state.criteria) {
    return criteria.reduce((sum, criterion) => sum + Math.max(0, toNumber(criterion.weight)), 0);
  }

  function getRatingMeaning(ratingValue, positive = positiveLabel(), negative = negativeLabel()) {
    const rating = clampRating(ratingValue);
    if (rating <= 2) return `Strongly favors ${negative}`;
    if (rating <= 4) return `Leans ${negative}`;
    if (rating === 5) return "Neutral / mixed";
    if (rating <= 7) return `Leans ${positive}`;
    return `Strongly favors ${positive}`;
  }

  function getMeaningTone(ratingValue) {
    const rating = clampRating(ratingValue);
    if (rating === 5) return "mixed";
    return rating >= 6 ? "positive" : "negative";
  }

  function calculateCriterionSplit(criterion) {
    const weightPercent = Math.max(0, toNumber(criterion.weight));
    const rating = clampRating(criterion.rating);
    const weightShare = weightPercent / 100;
    // Binary model today: the "don't" side gets the inverse of the rated "do" side.
    const positiveShare = weightShare * ((rating - 1) / 8);
    const negativeShare = weightShare - positiveShare;
    return {
      weightPercent,
      weightShare,
      rating,
      positiveShare,
      negativeShare,
      netShare: positiveShare - negativeShare,
      meaning: getRatingMeaning(rating),
      tone: getMeaningTone(rating),
    };
  }

  function computeDecisionModel() {
    const rows = state.criteria.map((criterion, index) => {
      const split = calculateCriterionSplit(criterion);
      return {
        ...criterion,
        index,
        label: getCriterionLabel(criterion, index),
        ...split,
      };
    });

    const positiveTotal = rows.reduce((sum, row) => sum + row.positiveShare, 0);
    const negativeTotal = rows.reduce((sum, row) => sum + row.negativeShare, 0);
    const margin = Math.abs(positiveTotal - negativeTotal);
    const direction =
      margin < CLOSE_CALL_THRESHOLD ? "close" : positiveTotal >= negativeTotal ? "positive" : "negative";

    const positiveDrivers = rows
      .filter((row) => row.netShare > 0)
      .sort((left, right) => right.netShare - left.netShare)
      .slice(0, 3);

    const negativeDrivers = rows
      .filter((row) => row.netShare < 0)
      .sort((left, right) => left.netShare - right.netShare)
      .slice(0, 3);

    return {
      rows,
      positiveTotal,
      negativeTotal,
      margin,
      direction,
      positiveDrivers,
      negativeDrivers,
    };
  }

  function validateSetupState() {
    const errors = [];
    const positive = positiveLabel();
    const negative = negativeLabel();
    const total = getWeightTotal();

    if (state.criteria.length < 2) {
      errors.push("Add at least two criteria before continuing.");
    }

    if (positive.toLowerCase() === negative.toLowerCase()) {
      errors.push("The do and don't labels need to be different.");
    }

    state.criteria.forEach((criterion, index) => {
      const label = getCriterionLabel(criterion, index);
      if (!sanitizeText(criterion.name)) {
        errors.push(`Criterion ${index + 1} still needs a name.`);
      }
      if (!(toNumber(criterion.weight) > 0)) {
        errors.push(`${label} needs a weight above 0%.`);
      }
    });

    if (Math.abs(total - 100) > 0.05) {
      errors.push(`Weights must add up to 100%. Current total: ${formatPercent(total, 1)}.`);
    }

    return {
      ok: errors.length === 0,
      errors,
      total,
    };
  }

  const dom = {
    progressSummaryText: document.getElementById("progressSummaryText"),
    progressSteps: Array.from(document.querySelectorAll("[data-step-target]")),
    stepSections: {
      intro: document.getElementById("introStep"),
      setup: document.getElementById("setupStep"),
      ratings: document.getElementById("ratingsStep"),
      review: document.getElementById("reviewStep"),
      results: document.getElementById("resultsStep"),
    },
    startDecisionBtn: document.getElementById("startDecisionBtn"),
    backToIntroBtn: document.getElementById("backToIntroBtn"),
    decisionTitleInput: document.getElementById("decisionTitleInput"),
    positiveChoiceInput: document.getElementById("positiveChoiceInput"),
    negativeChoiceInput: document.getElementById("negativeChoiceInput"),
    addCriterionBtn: document.getElementById("addCriterionBtn"),
    normalizeWeightsBtn: document.getElementById("normalizeWeightsBtn"),
    criteriaList: document.getElementById("criteriaList"),
    setupContinueBtn: document.getElementById("setupContinueBtn"),
    setupStatus: document.getElementById("setupStatus"),
    setupTotalCard: document.getElementById("setupTotalCard"),
    setupWeightTotal: document.getElementById("setupWeightTotal"),
    setupWeightHint: document.getElementById("setupWeightHint"),
    ratingStepKicker: document.getElementById("ratingStepKicker"),
    ratingCriterionTitle: document.getElementById("ratingCriterionTitle"),
    ratingCriterionCopy: document.getElementById("ratingCriterionCopy"),
    ratingCriterionWeight: document.getElementById("ratingCriterionWeight"),
    ratingDecisionLine: document.getElementById("ratingDecisionLine"),
    ratingProgressBar: document.getElementById("ratingProgressBar"),
    ratingCurrentValue: document.getElementById("ratingCurrentValue"),
    ratingCurrentMeaning: document.getElementById("ratingCurrentMeaning"),
    ratingPositiveLabel: document.getElementById("ratingPositiveLabel"),
    ratingNegativeLabel: document.getElementById("ratingNegativeLabel"),
    ratingChoiceGrid: document.getElementById("ratingChoiceGrid"),
    ratingPositiveContributionLabel: document.getElementById("ratingPositiveContributionLabel"),
    ratingPositiveContributionValue: document.getElementById("ratingPositiveContributionValue"),
    ratingNegativeContributionLabel: document.getElementById("ratingNegativeContributionLabel"),
    ratingNegativeContributionValue: document.getElementById("ratingNegativeContributionValue"),
    ratingBackBtn: document.getElementById("ratingBackBtn"),
    ratingNextBtn: document.getElementById("ratingNextBtn"),
    reviewProjectedDirection: document.getElementById("reviewProjectedDirection"),
    reviewProjectedHint: document.getElementById("reviewProjectedHint"),
    reviewTotalCard: document.getElementById("reviewTotalCard"),
    reviewDecisionTitle: document.getElementById("reviewDecisionTitle"),
    reviewDecisionLabels: document.getElementById("reviewDecisionLabels"),
    reviewWeightSummary: document.getElementById("reviewWeightSummary"),
    reviewWeightSummaryNote: document.getElementById("reviewWeightSummaryNote"),
    reviewToSetupBtn: document.getElementById("reviewToSetupBtn"),
    reviewList: document.getElementById("reviewList"),
    reviewStatus: document.getElementById("reviewStatus"),
    reviewBackBtn: document.getElementById("reviewBackBtn"),
    reviewResultsBtn: document.getElementById("reviewResultsBtn"),
    resultsTitle: document.getElementById("resultsTitle"),
    resultsSummary: document.getElementById("resultsSummary"),
    resultDirectionText: document.getElementById("resultDirectionText"),
    resultDirectionHint: document.getElementById("resultDirectionHint"),
    resultBanner: document.getElementById("resultBanner"),
    positiveScoreLabel: document.getElementById("positiveScoreLabel"),
    positiveScoreValue: document.getElementById("positiveScoreValue"),
    positiveScoreBar: document.getElementById("positiveScoreBar"),
    positiveScoreNote: document.getElementById("positiveScoreNote"),
    negativeScoreLabel: document.getElementById("negativeScoreLabel"),
    negativeScoreValue: document.getElementById("negativeScoreValue"),
    negativeScoreBar: document.getElementById("negativeScoreBar"),
    negativeScoreNote: document.getElementById("negativeScoreNote"),
    resultMarginValue: document.getElementById("resultMarginValue"),
    resultCriteriaCount: document.getElementById("resultCriteriaCount"),
    positiveDriversHeading: document.getElementById("positiveDriversHeading"),
    negativeDriversHeading: document.getElementById("negativeDriversHeading"),
    positiveDriversList: document.getElementById("positiveDriversList"),
    negativeDriversList: document.getElementById("negativeDriversList"),
    breakdownTable: document.getElementById("breakdownTable"),
    backToReviewBtn: document.getElementById("backToReviewBtn"),
    restartDecisionBtn: document.getElementById("restartDecisionBtn"),
  };

  function setStatus(element, message, tone) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.remove("is-error", "is-success");
    if (tone === "error") element.classList.add("is-error");
    if (tone === "success") element.classList.add("is-success");
  }

  function updateProgress() {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    dom.progressSteps.forEach((button) => {
      const target = button.getAttribute("data-step-target");
      const targetIndex = STEP_ORDER.indexOf(target);
      button.classList.toggle("is-active", target === state.currentStep);
      button.classList.toggle("is-complete", targetIndex < currentIndex);
      if (target === state.currentStep) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const summaryByStep = {
      intro: "Start with a quick explanation, then build the decision model.",
      setup: "Name the choice, set the criteria, and make the weights total 100%.",
      ratings: "Work through each criterion and rate how much it supports the do option.",
      review: "Edit every weight and rating on one page before finalizing the result.",
      results: "See the weighted outcome, the score margin, and the biggest drivers.",
    };

    dom.progressSummaryText.textContent = summaryByStep[state.currentStep] || "";
  }

  function showStep(stepName) {
    STEP_ORDER.forEach((step) => {
      dom.stepSections[step].classList.toggle("is-active", step === stepName);
    });
    state.currentStep = stepName;
    saveState();
    updateProgress();

    if (stepName === "setup") {
      renderSetupFields();
      renderCriteriaRows();
      refreshSetupStatus();
    } else if (stepName === "ratings") {
      renderRatingStep();
    } else if (stepName === "review") {
      renderReviewRows();
      refreshReviewSummary();
    } else if (stepName === "results") {
      renderResults();
    }
  }

  function scrollToTopOfApp() {
    const top = document.querySelector(".content-inner");
    if (!top) return;
    const offset = top.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
  }

  function navigateTo(stepName) {
    const validation = validateSetupState();

    if ((stepName === "ratings" || stepName === "review") && !validation.ok) {
      showStep("setup");
      setStatus(dom.setupStatus, validation.errors[0], "error");
      scrollToTopOfApp();
      return;
    }

    if (stepName === "results" && !validation.ok) {
      showStep("review");
      refreshReviewSummary();
      setStatus(dom.reviewStatus, validation.errors[0], "error");
      scrollToTopOfApp();
      return;
    }

    showStep(stepName);
    scrollToTopOfApp();
  }

  function renderSetupFields() {
    dom.decisionTitleInput.value = state.decisionTitle;
    dom.positiveChoiceInput.value = state.positiveLabel;
    dom.negativeChoiceInput.value = state.negativeLabel;
  }

  function renderCriteriaRows() {
    const canRemove = state.criteria.length > 2;
    dom.criteriaList.innerHTML = state.criteria
      .map((criterion, index) => {
        const label = getCriterionLabel(criterion, index);
        return `
          <div class="criteria-row" data-criterion-id="${escapeHtml(criterion.id)}">
            <div class="criteria-count" aria-hidden="true">${index + 1}</div>
            <div class="field">
              <label for="criterion-name-${escapeHtml(criterion.id)}">Criterion</label>
              <input id="criterion-name-${escapeHtml(criterion.id)}" data-criterion-name type="text" maxlength="120" value="${escapeHtml(criterion.name)}" placeholder="Example: Learning value">
            </div>
            <div class="field">
              <label for="criterion-weight-${escapeHtml(criterion.id)}">Weight (%)</label>
              <input id="criterion-weight-${escapeHtml(criterion.id)}" data-criterion-weight type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${escapeHtml(criterion.weight)}" placeholder="25">
            </div>
            <div class="criteria-row-actions">
              <div class="criterion-rating-pill">${escapeHtml(label)} rating: ${clampRating(criterion.rating)}/9</div>
              <button class="btn-ghost" data-remove-criterion type="button" ${canRemove ? "" : "disabled"}><i class="fa-solid fa-minus" aria-hidden="true"></i><span>Remove</span></button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function syncCriteriaRow(rowElement, criterionId) {
    const criterion = state.criteria.find((entry) => entry.id === criterionId);
    if (!rowElement || !criterion) return;
    const pill = rowElement.querySelector(".criterion-rating-pill");
    if (!pill) return;
    const index = state.criteria.findIndex((entry) => entry.id === criterionId);
    pill.textContent = `${getCriterionLabel(criterion, index)} rating: ${clampRating(criterion.rating)}/9`;
  }

  function refreshSetupStatus() {
    const validation = validateSetupState();
    const total = validation.total;
    const remaining = 100 - total;

    dom.setupWeightTotal.textContent = formatPercent(total, 1);
    dom.setupTotalCard.classList.remove("is-valid", "is-invalid");

    if (Math.abs(total - 100) <= 0.05) {
      dom.setupTotalCard.classList.add("is-valid");
      dom.setupWeightHint.textContent = "Weights are balanced at 100%.";
    } else {
      dom.setupTotalCard.classList.add("is-invalid");
      dom.setupWeightHint.textContent =
        remaining > 0
          ? `Add ${formatPercent(Math.abs(remaining), 1)} more weight to reach 100%.`
          : `Reduce ${formatPercent(Math.abs(remaining), 1)} to get back to 100%.`;
    }

    if (validation.ok) {
      setStatus(dom.setupStatus, "The setup looks good. You are ready for the rating pass.", "success");
      dom.setupContinueBtn.disabled = false;
    } else {
      setStatus(dom.setupStatus, validation.errors[0], "error");
      dom.setupContinueBtn.disabled = true;
    }
  }

  function roundWeightsToTarget(values, target, decimals) {
    const factor = 10 ** decimals;
    const scaledTarget = Math.round(target * factor);
    const scaledValues = values.map((value) => Math.max(0, value) * factor);
    const floors = scaledValues.map((value) => Math.floor(value));
    const remainders = scaledValues.map((value, index) => ({
      index,
      remainder: value - floors[index],
    }));
    const result = floors.slice();
    let diff = scaledTarget - floors.reduce((sum, value) => sum + value, 0);

    if (diff > 0) {
      const sorted = remainders.slice().sort((left, right) => right.remainder - left.remainder);
      let cursor = 0;
      while (diff > 0) {
        result[sorted[cursor % sorted.length].index] += 1;
        diff -= 1;
        cursor += 1;
      }
    } else if (diff < 0) {
      const sorted = remainders.slice().sort((left, right) => left.remainder - right.remainder);
      let cursor = 0;
      while (diff < 0 && cursor < sorted.length * 4) {
        const entry = sorted[cursor % sorted.length];
        if (result[entry.index] > 0) {
          result[entry.index] -= 1;
          diff += 1;
        }
        cursor += 1;
      }
    }

    return result.map((value) => value / factor);
  }

  function normalizeWeightsToHundred() {
    if (!state.criteria.length) return;
    const weights = state.criteria.map((criterion) => Math.max(0, toNumber(criterion.weight)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const normalized =
      total <= 0
        ? new Array(state.criteria.length).fill(100 / state.criteria.length)
        : weights.map((weight) => (weight / total) * 100);

    const rounded = roundWeightsToTarget(normalized, 100, 1);
    state.criteria = state.criteria.map((criterion, index) => ({
      ...criterion,
      weight: rounded[index],
    }));
    saveState();
    renderCriteriaRows();
    refreshSetupStatus();
  }

  function renderRatingButtons() {
    dom.ratingChoiceGrid.innerHTML = Array.from({ length: 9 }, (_, index) => {
      const value = index + 1;
      let label = "Mixed";
      if (value <= 2) label = "Don't";
      else if (value <= 4) label = "Lean don't";
      else if (value >= 8) label = "Do";
      else if (value >= 6) label = "Lean do";
      return `
        <button class="rating-choice" type="button" data-rating-value="${value}">
          <strong>${value}</strong>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    }).join("");
  }

  function renderRatingStep() {
    const validation = validateSetupState();
    if (!validation.ok) {
      showStep("setup");
      setStatus(dom.setupStatus, validation.errors[0], "error");
      return;
    }

    const index = clamp(state.currentCriterionIndex, 0, Math.max(state.criteria.length - 1, 0));
    state.currentCriterionIndex = index;
    const criterion = state.criteria[index];
    const split = calculateCriterionSplit(criterion);
    const totalCriteria = state.criteria.length;
    const positive = positiveLabel();
    const negative = negativeLabel();

    dom.ratingStepKicker.textContent = `CRITERION ${index + 1} OF ${totalCriteria}`;
    dom.ratingCriterionTitle.textContent = getCriterionLabel(criterion, index);
    dom.ratingCriterionCopy.textContent = `Rate how strongly this criterion favors "${positive}" over "${negative}".`;
    dom.ratingCriterionWeight.textContent = formatPercent(split.weightPercent, 1);
    dom.ratingDecisionLine.textContent = `${decisionTitle()} - rating the "${positive}" side`;
    dom.ratingProgressBar.style.width = `${((index + 1) / totalCriteria) * 100}%`;
    dom.ratingCurrentValue.textContent = String(split.rating);
    dom.ratingCurrentMeaning.textContent = split.meaning;
    dom.ratingPositiveLabel.textContent = positive;
    dom.ratingNegativeLabel.textContent = negative;
    dom.ratingPositiveContributionLabel.textContent = `${positive} share`;
    dom.ratingPositiveContributionValue.textContent = `This criterion currently gives ${formatShare(split.positiveShare)} of the full model to "${positive}".`;
    dom.ratingNegativeContributionLabel.textContent = `${negative} share`;
    dom.ratingNegativeContributionValue.textContent = `The remaining ${formatShare(split.negativeShare)} goes to "${negative}".`;

    Array.from(dom.ratingChoiceGrid.querySelectorAll("[data-rating-value]")).forEach((button) => {
      const value = clampRating(button.getAttribute("data-rating-value"));
      button.classList.toggle("is-selected", value === split.rating);
    });

    dom.ratingBackBtn.querySelector("span").textContent = index === 0 ? "Back to Setup" : "Previous Criterion";
    dom.ratingNextBtn.querySelector("span").textContent =
      index === totalCriteria - 1 ? "Continue to Review" : "Next Criterion";

    saveState();
  }

  function renderReviewRows() {
    const positive = positiveLabel();
    const negative = negativeLabel();
    const rows = computeDecisionModel().rows;

    dom.reviewList.innerHTML = rows
      .map((row) => {
        return `
          <div class="review-row" data-review-id="${escapeHtml(row.id)}">
            <div class="review-row-top">
              <div class="review-count" aria-hidden="true">${row.index + 1}</div>
              <div class="review-fields">
                <div class="field">
                  <label for="review-name-${escapeHtml(row.id)}">Criterion</label>
                  <input id="review-name-${escapeHtml(row.id)}" data-review-name type="text" maxlength="120" value="${escapeHtml(row.name)}" placeholder="Criterion ${row.index + 1}">
                </div>
                <div class="field">
                  <label for="review-weight-${escapeHtml(row.id)}">Weight (%)</label>
                  <input id="review-weight-${escapeHtml(row.id)}" data-review-weight type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${escapeHtml(row.weightPercent)}">
                </div>
                <div class="field">
                  <label for="review-rating-${escapeHtml(row.id)}">${escapeHtml(positive)} rating</label>
                  <select id="review-rating-${escapeHtml(row.id)}" data-review-rating>
                    ${Array.from({ length: 9 }, (_, idx) => {
                      const value = idx + 1;
                      return `<option value="${value}" ${value === row.rating ? "selected" : ""}>${value}</option>`;
                    }).join("")}
                  </select>
                </div>
              </div>
            </div>
            <div class="review-row-foot">
              <div class="meaning-pill ${row.tone}" data-review-meaning>${escapeHtml(row.meaning)}</div>
              <div class="review-row-actions">
                <span class="tiny-note">${escapeHtml(positive)}: ${formatShare(row.positiveShare)} | ${escapeHtml(negative)}: ${formatShare(row.negativeShare)}</span>
                <button class="linkish-btn" type="button" data-review-focus>Open in rating flow</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function refreshReviewSummary() {
    const validation = validateSetupState();
    const model = computeDecisionModel();

    dom.reviewDecisionTitle.textContent = decisionTitle();
    dom.reviewDecisionLabels.textContent = `${positiveLabel()} vs. ${negativeLabel()}`;
    dom.reviewWeightSummary.textContent = `${formatPercent(validation.total, 1)} total weight`;
    dom.reviewWeightSummaryNote.textContent = validation.ok
      ? "The model is balanced and ready to score."
      : validation.errors[0];

    dom.reviewTotalCard.classList.remove("is-valid", "is-invalid");
    dom.reviewTotalCard.classList.add(validation.ok ? "is-valid" : "is-invalid");

    if (!validation.ok) {
      dom.reviewProjectedDirection.textContent = "Needs fixes";
      dom.reviewProjectedHint.textContent = validation.errors[0];
      dom.reviewResultsBtn.disabled = true;
      setStatus(dom.reviewStatus, validation.errors[0], "error");
      return;
    }

    dom.reviewResultsBtn.disabled = false;

    if (model.direction === "close") {
      dom.reviewProjectedDirection.textContent = "Close call";
      dom.reviewProjectedHint.textContent = `The two sides are only ${formatShare(model.margin)} apart, so judgment still matters.`;
    } else if (model.direction === "positive") {
      dom.reviewProjectedDirection.textContent = positiveLabel();
      dom.reviewProjectedHint.textContent = `${positiveLabel()} currently leads by ${formatShare(model.margin)}.`;
    } else {
      dom.reviewProjectedDirection.textContent = negativeLabel();
      dom.reviewProjectedHint.textContent = `${negativeLabel()} currently leads by ${formatShare(model.margin)}.`;
    }

    setStatus(dom.reviewStatus, "You can still tweak any input here before opening the result.", "success");
  }

  function renderDriverList(container, rows, emptyCopy, tone) {
    if (!rows.length) {
      container.innerHTML = `<div class="empty-inline">${escapeHtml(emptyCopy)}</div>`;
      return;
    }

    container.innerHTML = rows
      .map((row) => {
        return `
          <article class="driver-item">
            <div class="driver-item-head">
              <h4>${escapeHtml(row.label)}</h4>
              <span class="meaning-pill ${tone}">${formatShare(Math.abs(row.netShare))} net swing</span>
            </div>
            <p>Weight ${formatPercent(row.weightPercent, 1)} | Rating ${row.rating}/9 | ${escapeHtml(row.meaning)}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderBreakdownTable(model) {
    const rows = [
      `
        <div class="breakdown-row head">
          <div>Criterion</div>
          <div>Weight</div>
          <div>Rating</div>
          <div>${escapeHtml(positiveLabel())}</div>
          <div>${escapeHtml(negativeLabel())}</div>
        </div>
      `,
    ];

    model.rows.forEach((row) => {
      rows.push(`
        <div class="breakdown-row">
          <div>
            <strong>${escapeHtml(row.label)}</strong>
            <div class="breakdown-pill ${row.tone}">${escapeHtml(row.meaning)}</div>
          </div>
          <span>${formatPercent(row.weightPercent, 1)}</span>
          <span>${row.rating}/9</span>
          <span>${formatShare(row.positiveShare)}</span>
          <span>${formatShare(row.negativeShare)}</span>
        </div>
      `);
    });

    dom.breakdownTable.innerHTML = rows.join("");
  }

  function renderResults() {
    const validation = validateSetupState();
    if (!validation.ok) {
      showStep("review");
      refreshReviewSummary();
      setStatus(dom.reviewStatus, validation.errors[0], "error");
      return;
    }

    const model = computeDecisionModel();
    const positive = positiveLabel();
    const negative = negativeLabel();
    const directionText =
      model.direction === "close"
        ? "Close call"
        : model.direction === "positive"
          ? positive
          : negative;

    dom.resultsTitle.textContent = decisionTitle();
    dom.resultDirectionText.textContent = directionText;
    dom.resultDirectionHint.textContent = `Margin: ${formatShare(model.margin)} between the two sides.`;
    dom.resultBanner.classList.remove("positive", "negative", "mixed");

    if (model.direction === "close") {
      dom.resultBanner.classList.add("mixed");
      dom.resultBanner.textContent = `Close call - the model is only ${formatShare(model.margin)} apart.`;
      dom.resultsSummary.textContent =
        "The weighted model does not produce a strong separation here. Treat this as a narrow call and use judgment alongside the scores.";
    } else if (model.direction === "positive") {
      dom.resultBanner.classList.add("positive");
      dom.resultBanner.textContent = `Suggested direction: ${positive}`;
      dom.resultsSummary.textContent =
        `The current weights and ratings point toward "${positive}". The biggest gains came from the criteria that most clearly supported the action, while the downside still shows up in the driver list below.`;
    } else {
      dom.resultBanner.classList.add("negative");
      dom.resultBanner.textContent = `Suggested direction: ${negative}`;
      dom.resultsSummary.textContent =
        `The current weights and ratings point toward "${negative}". The model still captures what helped the do side, but the strongest weighted factors ended up favoring the inverse choice.`;
    }

    dom.positiveScoreLabel.textContent = positive;
    dom.positiveScoreValue.textContent = formatShare(model.positiveTotal);
    dom.positiveScoreBar.style.width = `${Math.max(0, Math.min(100, model.positiveTotal * 100))}%`;
    dom.positiveScoreNote.textContent = `${positive} receives ${formatShare(model.positiveTotal)} of the total weighted model.`;

    dom.negativeScoreLabel.textContent = negative;
    dom.negativeScoreValue.textContent = formatShare(model.negativeTotal);
    dom.negativeScoreBar.style.width = `${Math.max(0, Math.min(100, model.negativeTotal * 100))}%`;
    dom.negativeScoreNote.textContent = `${negative} receives ${formatShare(model.negativeTotal)} of the total weighted model.`;

    dom.resultMarginValue.textContent = formatShare(model.margin);
    dom.resultCriteriaCount.textContent = `${state.criteria.length} ${state.criteria.length === 1 ? "criterion" : "criteria"}`;
    dom.positiveDriversHeading.textContent = `Strongest toward ${positive}`;
    dom.negativeDriversHeading.textContent = `Strongest toward ${negative}`;

    renderDriverList(
      dom.positiveDriversList,
      model.positiveDrivers,
      `No criteria currently lean toward "${positive}".`,
      "positive"
    );
    renderDriverList(
      dom.negativeDriversList,
      model.negativeDrivers,
      `No criteria currently lean toward "${negative}".`,
      "negative"
    );
    renderBreakdownTable(model);
  }

  function updateCriterionValueById(id, patch) {
    state.criteria = state.criteria.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion));
    saveState();
  }

  function handleSetupFieldInput() {
    state.decisionTitle = dom.decisionTitleInput.value;
    state.positiveLabel = dom.positiveChoiceInput.value;
    state.negativeLabel = dom.negativeChoiceInput.value;
    saveState();
    refreshSetupStatus();
  }

  function mutateReviewRow(event) {
    const target = event.target;
    const row = target.closest("[data-review-id]");
    if (!row) return;
    const id = row.getAttribute("data-review-id");
    if (!id) return;

    const criterion = state.criteria.find((entry) => entry.id === id);
    if (!criterion) return;

    if (target.matches("[data-review-name]")) {
      criterion.name = target.value;
    } else if (target.matches("[data-review-weight]")) {
      criterion.weight = Math.max(0, toNumber(target.value));
    } else if (target.matches("[data-review-rating]")) {
      criterion.rating = clampRating(target.value);
    } else {
      return;
    }

    saveState();
    updateReviewRow(row, criterion);
    refreshReviewSummary();
  }

  function bindEvents() {
    dom.startDecisionBtn.addEventListener("click", () => navigateTo("setup"));
    dom.backToIntroBtn.addEventListener("click", () => navigateTo("intro"));

    dom.progressSteps.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-step-target");
        if (target) navigateTo(target);
      });
    });

    dom.decisionTitleInput.addEventListener("input", handleSetupFieldInput);
    dom.positiveChoiceInput.addEventListener("input", handleSetupFieldInput);
    dom.negativeChoiceInput.addEventListener("input", handleSetupFieldInput);

    dom.addCriterionBtn.addEventListener("click", () => {
      state.criteria.push(makeCriterion(0));
      saveState();
      renderCriteriaRows();
      refreshSetupStatus();
    });

    dom.normalizeWeightsBtn.addEventListener("click", normalizeWeightsToHundred);

    dom.criteriaList.addEventListener("input", (event) => {
      const target = event.target;
      const row = target.closest("[data-criterion-id]");
      if (!row) return;
      const id = row.getAttribute("data-criterion-id");
      if (!id) return;

      if (target.matches("[data-criterion-name]")) {
        updateCriterionValueById(id, { name: target.value });
      } else if (target.matches("[data-criterion-weight]")) {
        updateCriterionValueById(id, { weight: Math.max(0, toNumber(target.value)) });
      } else {
        return;
      }

      syncCriteriaRow(row, id);
      refreshSetupStatus();
    });

    dom.criteriaList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-criterion]");
      if (!button) return;
      const row = button.closest("[data-criterion-id]");
      const id = row && row.getAttribute("data-criterion-id");
      if (!id || state.criteria.length <= 2) return;

      state.criteria = state.criteria.filter((criterion) => criterion.id !== id);
      state.currentCriterionIndex = clamp(state.currentCriterionIndex, 0, Math.max(state.criteria.length - 1, 0));
      saveState();
      renderCriteriaRows();
      refreshSetupStatus();
    });

    dom.setupContinueBtn.addEventListener("click", () => {
      const validation = validateSetupState();
      if (!validation.ok) {
        setStatus(dom.setupStatus, validation.errors[0], "error");
        return;
      }
      state.currentCriterionIndex = clamp(state.currentCriterionIndex, 0, Math.max(state.criteria.length - 1, 0));
      navigateTo("ratings");
    });

    dom.ratingChoiceGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-rating-value]");
      if (!button) return;
      const criterion = state.criteria[state.currentCriterionIndex];
      if (!criterion) return;
      criterion.rating = clampRating(button.getAttribute("data-rating-value"));
      saveState();
      renderRatingStep();
    });

    dom.ratingBackBtn.addEventListener("click", () => {
      if (state.currentCriterionIndex <= 0) {
        navigateTo("setup");
        return;
      }
      state.currentCriterionIndex -= 1;
      saveState();
      renderRatingStep();
      scrollToTopOfApp();
    });

    dom.ratingNextBtn.addEventListener("click", () => {
      if (state.currentCriterionIndex >= state.criteria.length - 1) {
        navigateTo("review");
        return;
      }
      state.currentCriterionIndex += 1;
      saveState();
      renderRatingStep();
      scrollToTopOfApp();
    });

    dom.reviewToSetupBtn.addEventListener("click", () => navigateTo("setup"));
    dom.reviewBackBtn.addEventListener("click", () => navigateTo("ratings"));
    dom.reviewResultsBtn.addEventListener("click", () => navigateTo("results"));
    dom.backToReviewBtn.addEventListener("click", () => navigateTo("review"));

    dom.reviewList.addEventListener("input", mutateReviewRow);
    dom.reviewList.addEventListener("change", mutateReviewRow);
    dom.reviewList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-review-focus]");
      if (!button) return;
      const row = button.closest("[data-review-id]");
      const id = row && row.getAttribute("data-review-id");
      if (!id) return;

      const index = state.criteria.findIndex((criterion) => criterion.id === id);
      if (index < 0) return;
      state.currentCriterionIndex = index;
      saveState();
      navigateTo("ratings");
    });

    dom.restartDecisionBtn.addEventListener("click", () => {
      const confirmed = window.confirm("Start a brand new decision and clear the current inputs?");
      if (!confirmed) return;
      state = createDefaultState();
      saveState();
      renderSetupFields();
      renderCriteriaRows();
      refreshSetupStatus();
      renderReviewRows();
      refreshReviewSummary();
      navigateTo("intro");
    });
  }

  function updateReviewRow(rowElement, criterion) {
    const split = calculateCriterionSplit(criterion);
    const meaning = rowElement.querySelector("[data-review-meaning]");
    const note = rowElement.querySelector(".tiny-note");
    const tone = getMeaningTone(split.rating);

    if (meaning) {
      meaning.textContent = getRatingMeaning(split.rating);
      meaning.classList.remove("positive", "negative", "mixed");
      meaning.classList.add(tone);
    }

    if (note) {
      note.textContent = `${positiveLabel()}: ${formatShare(split.positiveShare)} | ${negativeLabel()}: ${formatShare(split.negativeShare)}`;
    }
  }

  function init() {
    renderRatingButtons();
    bindEvents();
    renderSetupFields();
    renderCriteriaRows();
    refreshSetupStatus();
    renderReviewRows();
    refreshReviewSummary();
    updateProgress();

    const initialStep = STEP_ORDER.includes(state.currentStep) ? state.currentStep : "intro";
    showStep(initialStep);
  }

  init();
})();
