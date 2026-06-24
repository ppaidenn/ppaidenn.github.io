(() => {
  const STEP_ORDER = ["intro", "path", "ai", "setup", "ratings", "review", "results"];
  const CLOSE_CALL_THRESHOLD = 0.03;
  const DEFAULT_POSITIVE_LABEL = "Do it";
  const DEFAULT_NEGATIVE_LABEL = "Don't do it";
  const DEFAULT_WEIGHTS = [25, 25, 25, 25];
  const IMPORT_SCHEMA_VERSION = "paiden_decision_maker_v1";
  const TEMPLATE_HEADERS = [
    "record_type",
    "decision_title",
    "do_label",
    "dont_label",
    "criterion_order",
    "criterion_name",
    "criterion_question",
    "weight_percent",
    "rating_1_to_9",
    "criterion_notes",
  ];

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

  function sanitizeInlineText(value, fallback = "") {
    return String(value || fallback)
      .replace(/[\t\r\n]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
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
      question: "",
      notes: "",
      weight,
      rating: 5,
    };
  }

  function createDefaultState() {
    return {
      currentStep: "intro",
      entryMode: "",
      decisionTitle: "",
      positiveLabel: DEFAULT_POSITIVE_LABEL,
      negativeLabel: DEFAULT_NEGATIVE_LABEL,
      currentCriterionIndex: 0,
      criteria: DEFAULT_WEIGHTS.map(makeCriterion),
    };
  }

  let state = createDefaultState();

  function saveState() {
    // Intentional no-op. This page stays local to the current runtime only,
    // so a hard refresh clears the entire draft.
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

  function getCriterionQuestion(criterion) {
    return sanitizeText(criterion && criterion.question, "");
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
        question: getCriterionQuestion(criterion),
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
    goPathButtons: Array.from(document.querySelectorAll("[data-go-path]")),
    stepSections: {
      intro: document.getElementById("introStep"),
      path: document.getElementById("pathStep"),
      ai: document.getElementById("aiStep"),
      setup: document.getElementById("setupStep"),
      ratings: document.getElementById("ratingsStep"),
      review: document.getElementById("reviewStep"),
      results: document.getElementById("resultsStep"),
    },
    backToOverviewBtn: document.getElementById("backToOverviewBtn"),
    chooseAIPathBtn: document.getElementById("chooseAIPathBtn"),
    chooseManualPathBtn: document.getElementById("chooseManualPathBtn"),
    backToPathFromAIBtn: document.getElementById("backToPathFromAIBtn"),
    startManualFromAIBtn: document.getElementById("startManualFromAIBtn"),
    decisionTitleInput: document.getElementById("decisionTitleInput"),
    positiveChoiceInput: document.getElementById("positiveChoiceInput"),
    negativeChoiceInput: document.getElementById("negativeChoiceInput"),
    addCriterionBtn: document.getElementById("addCriterionBtn"),
    normalizeWeightsBtn: document.getElementById("normalizeWeightsBtn"),
    downloadCurrentDraftFromSetupBtn: document.getElementById("downloadCurrentDraftFromSetupBtn"),
    criteriaList: document.getElementById("criteriaList"),
    setupBackBtn: document.getElementById("setupBackBtn"),
    setupContinueBtn: document.getElementById("setupContinueBtn"),
    setupStatus: document.getElementById("setupStatus"),
    setupTotalCard: document.getElementById("setupTotalCard"),
    setupWeightTotal: document.getElementById("setupWeightTotal"),
    setupWeightHint: document.getElementById("setupWeightHint"),
    ratingStepKicker: document.getElementById("ratingStepKicker"),
    ratingCriterionTitle: document.getElementById("ratingCriterionTitle"),
    ratingCriterionCopy: document.getElementById("ratingCriterionCopy"),
    ratingCriterionNotes: document.getElementById("ratingCriterionNotes"),
    ratingCriterionWeight: document.getElementById("ratingCriterionWeight"),
    ratingDecisionLine: document.getElementById("ratingDecisionLine"),
    ratingProgressBar: document.getElementById("ratingProgressBar"),
    ratingCurrentValue: document.getElementById("ratingCurrentValue"),
    ratingCurrentMeaning: document.getElementById("ratingCurrentMeaning"),
    ratingPositiveLabel: document.getElementById("ratingPositiveLabel"),
    ratingNegativeLabel: document.getElementById("ratingNegativeLabel"),
    ratingChoiceGrid: document.getElementById("ratingChoiceGrid"),
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
    aiSituationInput: document.getElementById("aiSituationInput"),
    aiPromptOutput: document.getElementById("aiPromptOutput"),
    copyAIPromptBtn: document.getElementById("copyAIPromptBtn"),
    downloadBlankTemplateBtn: document.getElementById("downloadBlankTemplateBtn"),
    aiKitStatus: document.getElementById("aiKitStatus"),
    aiImportFileInput: document.getElementById("aiImportFileInput"),
    aiImportTextInput: document.getElementById("aiImportTextInput"),
    importPastedAIDraftBtn: document.getElementById("importPastedAIDraftBtn"),
    aiImportStatus: document.getElementById("aiImportStatus"),
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
      if (target === state.currentStep) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    const summaryByStep = {
      intro: "Start with a clean overview and a vertical walkthrough of how to read the decision model.",
      path: "Choose whether you want AI help drafting the model or a blank manual start.",
      ai: "Tell the story, copy the strict prompt, and paste or upload the AI draft back into the tool.",
      setup: "Name the choice, shape the criteria cards, and make the weights total 100%.",
      ratings: "Work through each criterion and rate how much it supports the do option.",
      review: "Edit every weight, question, and rating on one page before finalizing the result.",
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
    } else if (stepName === "ai") {
      refreshAIKitOutputs();
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
      const destination = state.currentStep === "review" ? "review" : "setup";
      showStep(destination);
      if (destination === "review") {
        refreshReviewSummary();
        setStatus(dom.reviewStatus, validation.errors[0], "error");
      } else {
        setStatus(dom.setupStatus, validation.errors[0], "error");
      }
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
    if (dom.setupBackBtn) {
      const backLabel = state.entryMode === "ai" ? "Back to AI Assist" : "Back to Path Choice";
      const backSpan = dom.setupBackBtn.querySelector("span");
      if (backSpan) backSpan.textContent = backLabel;
    }
  }

  function renderCriteriaRows() {
    const canRemove = state.criteria.length > 2;
    dom.criteriaList.innerHTML = state.criteria
      .map((criterion, index) => {
        const label = getCriterionLabel(criterion, index);
        return `
          <div class="criteria-row" data-criterion-id="${escapeHtml(criterion.id)}">
            <div class="criteria-row-head">
              <div class="criteria-row-title">
                <div class="criteria-count" aria-hidden="true">${index + 1}</div>
                <div class="criteria-row-title-copy">
                  <strong data-criteria-label>${escapeHtml(label)}</strong>
                  <p class="tiny-note">Set how important this criterion is and why it belongs in the decision.</p>
                </div>
              </div>
              <div class="criteria-row-actions">
                <button class="btn-ghost" data-remove-criterion type="button" ${canRemove ? "" : "disabled"}><i class="fa-solid fa-minus" aria-hidden="true"></i><span>Remove</span></button>
              </div>
            </div>
            <div class="criteria-fields">
              <div class="field criteria-field-span-3">
                <label for="criterion-name-${escapeHtml(criterion.id)}">Criterion Name</label>
                <input id="criterion-name-${escapeHtml(criterion.id)}" data-criterion-name type="text" maxlength="120" value="${escapeHtml(criterion.name)}" placeholder="Example: Compensation and finances">
              </div>
              <div class="field criteria-field-narrow">
                <label for="criterion-weight-${escapeHtml(criterion.id)}">Weight (%)</label>
                <input id="criterion-weight-${escapeHtml(criterion.id)}" data-criterion-weight type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${escapeHtml(criterion.weight)}" placeholder="25">
              </div>
              <div class="field criteria-field-span-4">
                <label for="criterion-notes-${escapeHtml(criterion.id)}">Notes or Reasoning</label>
                <textarea id="criterion-notes-${escapeHtml(criterion.id)}" data-criterion-notes rows="4" maxlength="320" placeholder="Optional: Why does this criterion matter, and why did it get this weight or wording?">${escapeHtml(criterion.notes)}</textarea>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function syncCriteriaRow(rowElement, criterionId) {
    const criterion = state.criteria.find((entry) => entry.id === criterionId);
    if (!rowElement || !criterion) return;
    const title = rowElement.querySelector("[data-criteria-label]");
    const index = state.criteria.findIndex((entry) => entry.id === criterionId);
    if (title) title.textContent = getCriterionLabel(criterion, index);
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
    const question = getCriterionQuestion(criterion);
    const notes = sanitizeText(criterion.notes, "");

    dom.ratingStepKicker.textContent = `CRITERION ${index + 1} OF ${totalCriteria}`;
    dom.ratingCriterionTitle.textContent = getCriterionLabel(criterion, index);
    dom.ratingCriterionCopy.textContent = question || `Rate how strongly this criterion favors "${positive}" over "${negative}".`;
    dom.ratingCriterionNotes.hidden = !notes;
    dom.ratingCriterionNotes.textContent = notes || "";
    dom.ratingCriterionWeight.textContent = formatPercent(split.weightPercent, 1);
    dom.ratingDecisionLine.textContent = `${decisionTitle()} - rating the "${positive}" side`;
    dom.ratingProgressBar.style.width = `${((index + 1) / totalCriteria) * 100}%`;
    dom.ratingCurrentValue.textContent = String(split.rating);
    dom.ratingCurrentMeaning.textContent = split.meaning;
    dom.ratingPositiveLabel.textContent = positive;
    dom.ratingNegativeLabel.textContent = negative;
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
              <div class="review-row-title">
                <div class="review-count" aria-hidden="true">${row.index + 1}</div>
                <div class="review-row-title-copy">
                  <strong data-review-title>${escapeHtml(row.label)}</strong>
                  <p class="tiny-note">You can still change the wording, notes, weight, or rating here before opening the final result.</p>
                </div>
              </div>
              <div class="review-row-actions">
                <div class="meaning-pill ${row.tone}" data-review-meaning>${escapeHtml(row.meaning)}</div>
                <button class="linkish-btn" type="button" data-review-focus>Open in rating flow</button>
              </div>
            </div>
            <div class="review-fields">
              <div class="field review-field-span-2">
                <label for="review-name-${escapeHtml(row.id)}">Criterion Name</label>
                <input id="review-name-${escapeHtml(row.id)}" data-review-name type="text" maxlength="120" value="${escapeHtml(row.name)}" placeholder="Criterion ${row.index + 1}">
              </div>
              <div class="field">
                <label for="review-weight-${escapeHtml(row.id)}">Weight (%)</label>
                <input id="review-weight-${escapeHtml(row.id)}" data-review-weight type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${escapeHtml(row.weightPercent)}">
              </div>
              <div class="field">
                <label for="review-rating-${escapeHtml(row.id)}">${escapeHtml(positive)} Rating</label>
                <select id="review-rating-${escapeHtml(row.id)}" data-review-rating>
                  ${Array.from({ length: 9 }, (_, idx) => {
                    const value = idx + 1;
                    return `<option value="${value}" ${value === row.rating ? "selected" : ""}>${value}</option>`;
                  }).join("")}
                </select>
              </div>
              <div class="field review-field-span-4">
                <label for="review-question-${escapeHtml(row.id)}">Question Shown During Rating</label>
                <textarea id="review-question-${escapeHtml(row.id)}" data-review-question rows="4" maxlength="220" placeholder="Plain-English question for this criterion">${escapeHtml(row.question || "")}</textarea>
              </div>
              <div class="field review-field-span-4">
                <label for="review-notes-${escapeHtml(row.id)}">Notes or Reasoning</label>
                <textarea id="review-notes-${escapeHtml(row.id)}" data-review-notes rows="4" maxlength="320" placeholder="Optional notes explaining the weight, question wording, or rating">${escapeHtml(row.notes || "")}</textarea>
              </div>
            </div>
            <div class="review-row-foot">
              <div class="review-row-foot-copy">
                <span class="tiny-note">This criterion currently splits as ${escapeHtml(positive)} ${formatShare(row.positiveShare)} and ${escapeHtml(negative)} ${formatShare(row.negativeShare)}.</span>
              </div>
              <div class="review-row-actions">
                <span class="tiny-note">Rating ${row.rating}/9</span>
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
    } else if (target.matches("[data-review-question]")) {
      criterion.question = target.value;
    } else if (target.matches("[data-review-notes]")) {
      criterion.notes = target.value;
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

  function updateReviewRow(rowElement, criterion) {
    const split = calculateCriterionSplit(criterion);
    const meaning = rowElement.querySelector("[data-review-meaning]");
    const title = rowElement.querySelector("[data-review-title]");
    const note = rowElement.querySelector(".review-row-foot-copy .tiny-note");
    const ratingNote = rowElement.querySelector(".review-row-actions .tiny-note");
    const tone = getMeaningTone(split.rating);
    const index = state.criteria.findIndex((entry) => entry.id === criterion.id);

    if (meaning) {
      meaning.textContent = getRatingMeaning(split.rating);
      meaning.classList.remove("positive", "negative", "mixed");
      meaning.classList.add(tone);
    }

    if (title) {
      title.textContent = getCriterionLabel(criterion, index);
    }

    if (note) {
      note.textContent = `This criterion currently splits as ${positiveLabel()} ${formatShare(split.positiveShare)} and ${negativeLabel()} ${formatShare(split.negativeShare)}.`;
    }

    if (ratingNote) {
      ratingNote.textContent = `Rating ${split.rating}/9`;
    }
  }

  function hasMeaningfulCurrentDraft() {
    return Boolean(
      sanitizeText(state.decisionTitle) ||
      sanitizeText(state.positiveLabel) !== DEFAULT_POSITIVE_LABEL ||
      sanitizeText(state.negativeLabel) !== DEFAULT_NEGATIVE_LABEL ||
      state.criteria.some((criterion) => {
        return (
          sanitizeText(criterion.name) ||
          sanitizeText(criterion.question) ||
          sanitizeText(criterion.notes) ||
          clampRating(criterion.rating) !== 5
        );
      })
    );
  }

  function resetDecisionDraft(entryMode) {
    state = {
      ...createDefaultState(),
      entryMode: entryMode || "",
    };
  }

  function startManualEntry() {
    if (hasMeaningfulCurrentDraft()) {
      const confirmed = window.confirm("Start a blank manual decision and clear the current draft?");
      if (!confirmed) return;
    }

    resetDecisionDraft("manual");
    renderSetupFields();
    renderCriteriaRows();
    refreshSetupStatus();
    renderReviewRows();
    refreshReviewSummary();
    renderResults();
    navigateTo("setup");
  }

  function buildBlankTemplateRows() {
    return [
      TEMPLATE_HEADERS.join("\t"),
      ["meta", "Replace with the full decision title", "Replace with the do option", "Replace with the dont option", "", "", "", "", "", ""].join("\t"),
      ["criterion", "", "", "", "1", "Replace with a short criterion name", "Replace with the question shown to the user during rating", "34", "5", "Explain why this criterion matters and why it got this weight and rating. Add or delete criterion rows as needed."].join("\t"),
      ["criterion", "", "", "", "2", "Replace with a short criterion name", "Replace with the question shown to the user during rating", "33", "5", "Explain why this criterion matters and why it got this weight and rating. Add or delete criterion rows as needed."].join("\t"),
      ["criterion", "", "", "", "3", "Replace with a short criterion name", "Replace with the question shown to the user during rating", "33", "5", "Explain why this criterion matters and why it got this weight and rating. Add or delete criterion rows as needed."].join("\t"),
    ];
  }

  function buildBlankTemplateTsv() {
    return buildBlankTemplateRows().join("\n");
  }

  function buildCurrentDraftTsv() {
    const rows = [TEMPLATE_HEADERS.join("\t")];
    rows.push([
      "meta",
      sanitizeInlineText(state.decisionTitle, ""),
      sanitizeInlineText(state.positiveLabel, DEFAULT_POSITIVE_LABEL),
      sanitizeInlineText(state.negativeLabel, DEFAULT_NEGATIVE_LABEL),
      "",
      "",
      "",
      "",
      "",
      "",
    ].join("\t"));

    state.criteria.forEach((criterion, index) => {
      rows.push([
        "criterion",
        "",
        "",
        "",
        String(index + 1),
        sanitizeInlineText(criterion.name, ""),
        sanitizeInlineText(criterion.question, ""),
        String(Math.max(0, toNumber(criterion.weight))),
        String(clampRating(criterion.rating)),
        sanitizeInlineText(criterion.notes, ""),
      ].join("\t"));
    });

    return rows.join("\n");
  }

  function buildJsonSchemaExample() {
    return JSON.stringify(
      {
        schema_version: IMPORT_SCHEMA_VERSION,
        decision_title: "Replace with the full decision title",
        positive_label: "Replace with the do option",
        negative_label: "Replace with the dont option",
        criteria: [
          {
            order: 1,
            name: "Replace with a short criterion name",
            question: "Replace with the question shown to the user during rating",
            weight_percent: 25,
            rating_1_to_9: 5,
            notes: "Replace with short reasoning for this criterion, weight, and rating",
          },
        ],
      },
      null,
      2
    );
  }

  function buildAIPrompt(situationText) {
    const safeSituation = sanitizeText(situationText)
      ? sanitizeText(situationText)
      : "[Paste the user's full situation here before sending this prompt to your AI tool.]";

    return [
      "You are filling a machine-readable decision template for a local paiden.com page.",
      "Your job is to turn the user's situation into a binary do-or-dont decision model.",
      "",
      "Output rules:",
      "- Preferred output: if a TSV template file is attached, fill that exact file structure and return the completed TSV file.",
      `- Fallback output: return ONLY raw JSON using the exact schema version "${IMPORT_SCHEMA_VERSION}" shown below.`,
      "- Do not add markdown, commentary, code fences, bullet points, or any extra prose around the machine-readable output.",
      "- Do not change column names, field names, record_type values, or the overall structure.",
      "- Do not add extra sheets, extra columns, or summary rows.",
      "- Do not place tab characters or line breaks inside any cell value. Replace them with plain spaces.",
      "- Choose the number of criterion rows based on the situation. Do not default to five criteria.",
      "- Use the fewest criteria that still capture the real tradeoffs clearly. Most situations should land between 3 and 8 criteria, but fewer or more is acceptable when justified.",
      "- Use 2 to 10 criterion rows total.",
      "- criterion_order must be sequential whole numbers starting at 1.",
      "- weight_percent values must be positive numbers that sum to exactly 100.0.",
      "- rating_1_to_9 values must be whole integers from 1 to 9.",
      "- A rating of 1 strongly favors the dont option, 5 is neutral or mixed, and 9 strongly favors the do option.",
      "- criterion_name should be short and scannable.",
      "- criterion_question should be a clear plain-English question shown back to the user during review, similar in tone to: Does the pay adequately support the move, living costs, savings, and personal goals?",
      "- criterion_notes should briefly explain why the criterion, weight, and rating were chosen.",
      "- Base the criteria, weights, and ratings on the user's wording and priorities. If something is uncertain, make a conservative and reviewable estimate instead of inventing facts.",
      "- The do option should describe the action being considered. The dont option should describe the inverse action.",
      "",
      "Exact TSV header:",
      TEMPLATE_HEADERS.join("\t"),
      "",
      "Exact JSON schema example:",
      buildJsonSchemaExample(),
      "",
      "User situation:",
      "<<<",
      safeSituation,
      ">>>",
    ].join("\n");
  }

  function refreshAIKitOutputs() {
    dom.aiPromptOutput.value = buildAIPrompt(dom.aiSituationInput.value);
  }

  function sanitizeFileStem(value, fallback = "decision-maker-draft") {
    const stem = sanitizeInlineText(value, fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return stem || fallback;
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "readonly");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function stripCodeFences(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return "";
    const specificFence = text.match(/```(?:tsv|json|text|txt)?\s*([\s\S]*?)```/i);
    if (specificFence && specificFence[1]) {
      return specificFence[1].trim();
    }
    return text;
  }

  function parseDelimitedLine(line, delimiter) {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        const nextChar = line[index + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current);
    return cells.map((cell) => cell.trim());
  }

  function detectDelimiter(line) {
    if (line.includes("\t")) return "\t";
    if (line.includes(",")) return ",";
    return "\t";
  }

  function normalizeHeaderCell(cell) {
    return sanitizeInlineText(cell).toLowerCase();
  }

  function parseTabularImport(rawText) {
    const text = stripCodeFences(rawText).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) {
      throw new Error("The pasted or uploaded draft is empty.");
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseDelimitedLine(lines[0], delimiter).map(normalizeHeaderCell);
    const expected = TEMPLATE_HEADERS.map((header) => header.toLowerCase());

    if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index])) {
      throw new Error("The template header does not match the required format. Download the blank template from the page and have the AI fill that exact structure.");
    }

    const rows = lines.slice(1).map((line) => {
      const parsed = parseDelimitedLine(line, delimiter);
      while (parsed.length < TEMPLATE_HEADERS.length) parsed.push("");
      return parsed.slice(0, TEMPLATE_HEADERS.length);
    });

    const records = rows.map((cells) => {
      const record = {};
      TEMPLATE_HEADERS.forEach((header, index) => {
        record[header] = cells[index] || "";
      });
      return record;
    });

    return convertImportedTableRecords(records);
  }

  function convertImportedTableRecords(records) {
    const metaRow = records.find((row) => sanitizeInlineText(row.record_type).toLowerCase() === "meta");
    const criterionRows = records.filter((row) => sanitizeInlineText(row.record_type).toLowerCase() === "criterion");

    if (!metaRow) {
      throw new Error("The imported draft needs exactly one meta row.");
    }
    if (criterionRows.length < 2) {
      throw new Error("The imported draft needs at least two criterion rows.");
    }

    const criteria = criterionRows
      .map((row, index) => ({
        order: row.criterion_order ? Math.max(1, Math.round(toNumber(row.criterion_order))) : index + 1,
        name: sanitizeInlineText(row.criterion_name),
        question: sanitizeInlineText(row.criterion_question),
        notes: sanitizeInlineText(row.criterion_notes),
        weight: Math.max(0, toNumber(row.weight_percent)),
        rating: clampRating(row.rating_1_to_9),
      }))
      .sort((left, right) => left.order - right.order);

    return {
      decisionTitle: sanitizeInlineText(metaRow.decision_title),
      positiveLabel: sanitizeInlineText(metaRow.do_label, DEFAULT_POSITIVE_LABEL),
      negativeLabel: sanitizeInlineText(metaRow.dont_label, DEFAULT_NEGATIVE_LABEL),
      criteria,
    };
  }

  function parseJsonImport(rawText) {
    const text = stripCodeFences(rawText).replace(/^\uFEFF/, "");
    const parsed = JSON.parse(text);
    const source = Array.isArray(parsed) ? { criteria: parsed } : parsed;

    const criteriaSource = Array.isArray(source.criteria) ? source.criteria : [];
    if (criteriaSource.length < 2) {
      throw new Error("The JSON draft needs at least two criteria.");
    }

    const criteria = criteriaSource
      .map((criterion, index) => ({
        order: criterion.order ? Math.max(1, Math.round(toNumber(criterion.order))) : index + 1,
        name: sanitizeInlineText(criterion.name || criterion.criterion_name),
        question: sanitizeInlineText(criterion.question || criterion.criterion_question),
        notes: sanitizeInlineText(criterion.notes || criterion.criterion_notes),
        weight: Math.max(0, toNumber(criterion.weight_percent ?? criterion.weight)),
        rating: clampRating(criterion.rating_1_to_9 ?? criterion.rating),
      }))
      .sort((left, right) => left.order - right.order);

    return {
      decisionTitle: sanitizeInlineText(source.decision_title || source.decisionTitle),
      positiveLabel: sanitizeInlineText(source.positive_label || source.do_label || source.positiveLabel, DEFAULT_POSITIVE_LABEL),
      negativeLabel: sanitizeInlineText(source.negative_label || source.dont_label || source.negativeLabel, DEFAULT_NEGATIVE_LABEL),
      criteria,
    };
  }

  function parseImportedDraft(rawText) {
    const text = stripCodeFences(rawText).trim();
    if (!text) {
      throw new Error("There is no import text to process.");
    }
    if (text.startsWith("{") || text.startsWith("[")) {
      return parseJsonImport(text);
    }
    return parseTabularImport(text);
  }

  function normalizeImportedCriteria(criteria) {
    const cleaned = criteria
      .map((criterion) => ({
        id: makeId(),
        name: sanitizeInlineText(criterion.name),
        question: sanitizeInlineText(criterion.question),
        notes: sanitizeInlineText(criterion.notes),
        weight: Math.max(0, toNumber(criterion.weight)),
        rating: clampRating(criterion.rating),
      }))
      .filter((criterion) => criterion.name || criterion.question || criterion.weight > 0);

    if (cleaned.length < 2) {
      throw new Error("The imported draft needs at least two usable criteria.");
    }

    cleaned.forEach((criterion, index) => {
      if (!criterion.name) {
        throw new Error(`Imported criterion ${index + 1} is missing a criterion name.`);
      }
      if (!(criterion.weight > 0)) {
        throw new Error(`Imported criterion "${criterion.name}" needs a positive weight.`);
      }
    });

    const total = cleaned.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (!(total > 0)) {
      throw new Error("Imported weights must add up to more than 0.");
    }

    let note = "";
    if (Math.abs(total - 100) > 0.05) {
      const normalized = roundWeightsToTarget(
        cleaned.map((criterion) => criterion.weight),
        100,
        1
      );
      normalized.forEach((weight, index) => {
        cleaned[index].weight = weight;
      });
      note = `Imported weights totaled ${formatPercent(total, 1)}, so the page normalized them to 100%.`;
    }

    return { criteria: cleaned, note };
  }

  function applyImportedDraft(importedModel, sourceLabel) {
    const nextDecisionTitle = sanitizeInlineText(importedModel.decisionTitle, "");
    const nextPositive = sanitizeInlineText(importedModel.positiveLabel, DEFAULT_POSITIVE_LABEL) || DEFAULT_POSITIVE_LABEL;
    const nextNegative = sanitizeInlineText(importedModel.negativeLabel, DEFAULT_NEGATIVE_LABEL) || DEFAULT_NEGATIVE_LABEL;

    if (!nextDecisionTitle) {
      throw new Error("The imported draft needs a decision title in the meta row or JSON header.");
    }
    if (nextPositive.toLowerCase() === nextNegative.toLowerCase()) {
      throw new Error("The imported draft needs different do and dont labels.");
    }

    const normalized = normalizeImportedCriteria(importedModel.criteria || []);

    state = {
      currentStep: "setup",
      entryMode: "ai",
      decisionTitle: nextDecisionTitle,
      positiveLabel: nextPositive,
      negativeLabel: nextNegative,
      currentCriterionIndex: 0,
      criteria: normalized.criteria,
    };

    renderSetupFields();
    renderCriteriaRows();
    refreshSetupStatus();
    renderReviewRows();
    refreshReviewSummary();
    renderResults();
    refreshAIKitOutputs();
    navigateTo("setup");

    const importMessage = normalized.note
      ? `${sourceLabel} imported successfully. ${normalized.note} Walk through the setup and rating steps to confirm everything before the final result.`
      : `${sourceLabel} imported successfully. Walk through the setup and rating steps to confirm the criteria, questions, weights, and ratings.`;

    setStatus(dom.aiImportStatus, importMessage, "success");
    setStatus(dom.setupStatus, importMessage, "success");
  }

  async function handleImportedText(rawText, sourceLabel) {
    try {
      const importedModel = parseImportedDraft(rawText);
      applyImportedDraft(importedModel, sourceLabel);
    } catch (error) {
      const message = error && error.message ? error.message : "Could not import the draft.";
      setStatus(dom.aiImportStatus, message, "error");
    }
  }

  async function readFileAsText(file) {
    if (!file) throw new Error("Choose a file first.");
    if (typeof file.text === "function") {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsText(file);
    });
  }

  function handleDownloadBlankTemplate() {
    downloadTextFile("decision-maker-ai-template.tsv", buildBlankTemplateTsv(), "text/tab-separated-values;charset=utf-8");
    setStatus(dom.aiKitStatus, "Blank TSV template downloaded.", "success");
  }

  function handleDownloadCurrentDraft() {
    const hasDraft = hasMeaningfulCurrentDraft();
    const text = hasDraft ? buildCurrentDraftTsv() : buildBlankTemplateTsv();
    const filename = hasDraft
      ? `${sanitizeFileStem(state.decisionTitle, "decision-maker-draft")}.tsv`
      : "decision-maker-ai-template.tsv";

    downloadTextFile(filename, text, "text/tab-separated-values;charset=utf-8");
    const message = hasDraft
      ? "Current draft downloaded as a TSV file you can edit in a spreadsheet."
      : "There was no populated draft yet, so the blank TSV template was downloaded instead.";
    setStatus(dom.setupStatus, message, "success");
    setStatus(dom.aiKitStatus, message, "success");
  }

  function resetAIFields() {
    dom.aiSituationInput.value = "";
    dom.aiImportFileInput.value = "";
    dom.aiImportTextInput.value = "";
    refreshAIKitOutputs();
    setStatus(dom.aiKitStatus, "", "");
    setStatus(dom.aiImportStatus, "", "");
  }

  function bindEvents() {
    dom.goPathButtons.forEach((button) => {
      button.addEventListener("click", () => navigateTo("path"));
    });
    dom.backToOverviewBtn.addEventListener("click", () => navigateTo("intro"));
    dom.chooseAIPathBtn.addEventListener("click", () => {
      state.entryMode = "ai";
      saveState();
      navigateTo("ai");
    });
    dom.chooseManualPathBtn.addEventListener("click", startManualEntry);
    dom.backToPathFromAIBtn.addEventListener("click", () => navigateTo("path"));
    dom.startManualFromAIBtn.addEventListener("click", startManualEntry);

    dom.progressSteps.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-step-target");
        if (target) navigateTo(target);
      });
    });

    dom.aiSituationInput.addEventListener("input", refreshAIKitOutputs);
    dom.copyAIPromptBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(dom.aiPromptOutput.value);
        setStatus(dom.aiKitStatus, "AI prompt copied.", "success");
      } catch (_) {
        setStatus(dom.aiKitStatus, "Could not copy the AI prompt automatically.", "error");
      }
    });
    dom.downloadBlankTemplateBtn.addEventListener("click", handleDownloadBlankTemplate);
    dom.aiImportFileInput.addEventListener("change", async () => {
      const file = dom.aiImportFileInput.files && dom.aiImportFileInput.files[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        await handleImportedText(text, `${file.name} file`);
      } finally {
        dom.aiImportFileInput.value = "";
      }
    });
    dom.downloadCurrentDraftFromSetupBtn.addEventListener("click", handleDownloadCurrentDraft);

    dom.importPastedAIDraftBtn.addEventListener("click", async () => {
      await handleImportedText(dom.aiImportTextInput.value, "Pasted AI draft");
    });

    dom.decisionTitleInput.addEventListener("input", () => {
      handleSetupFieldInput();
      refreshSetupStatus();
    });
    dom.positiveChoiceInput.addEventListener("input", () => {
      handleSetupFieldInput();
      refreshSetupStatus();
    });
    dom.negativeChoiceInput.addEventListener("input", () => {
      handleSetupFieldInput();
      refreshSetupStatus();
    });

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
      } else if (target.matches("[data-criterion-notes]")) {
        updateCriterionValueById(id, { notes: target.value });
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

    dom.setupBackBtn.addEventListener("click", () => {
      navigateTo(state.entryMode === "ai" ? "ai" : "path");
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
      resetDecisionDraft("");
      saveState();
      resetAIFields();
      renderSetupFields();
      renderCriteriaRows();
      refreshSetupStatus();
      renderReviewRows();
      refreshReviewSummary();
      renderResults();
      navigateTo("intro");
    });
  }

  function init() {
    renderRatingButtons();
    refreshAIKitOutputs();
    bindEvents();
    renderSetupFields();
    renderCriteriaRows();
    refreshSetupStatus();
    renderReviewRows();
    refreshReviewSummary();
    updateProgress();
    showStep("intro");
  }

  init();
})();
