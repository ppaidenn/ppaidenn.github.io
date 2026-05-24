(function () {
  "use strict";

  const FEDERAL_YEAR = 2026;
  const FEDERAL_STANDARD_DEDUCTION = {
    single: 16100,
    marriedJoint: 32200,
    headOfHousehold: 24150,
    marriedSeparate: 16100,
  };
  const FEDERAL_BRACKETS = {
    single: [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
    marriedSeparate: [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [384350, 0.35],
      [Infinity, 0.37],
    ],
    marriedJoint: [
      [24800, 0.1],
      [100800, 0.12],
      [211400, 0.22],
      [403550, 0.24],
      [512450, 0.32],
      [768700, 0.35],
      [Infinity, 0.37],
    ],
    headOfHousehold: [
      [17700, 0.1],
      [67450, 0.12],
      [105700, 0.22],
      [201750, 0.24],
      [256200, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
  };
  const OASDI_WAGE_BASE = 184500;
  const ADDITIONAL_MEDICARE_THRESHOLD = {
    single: 200000,
    marriedSeparate: 125000,
    marriedJoint: 250000,
    headOfHousehold: 200000,
  };
  const NO_INCOME_TAX_STATES = new Set(["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"]);
  const DEFAULT_STATE_RATE = 4.0;
  const BUDGET_GUIDE = [
    { key: "Housing", pct: 0.3, color: "#1c5c3d" },
    { key: "Food", pct: 0.12, color: "#33855a" },
    { key: "Transportation", pct: 0.1, color: "#4ea773" },
    { key: "Utilities & Bills", pct: 0.08, color: "#68bf85" },
    { key: "Healthcare & Insurance", pct: 0.08, color: "#8fd5a3" },
    { key: "Shopping & Personal", pct: 0.08, color: "#b6e3c0" },
    { key: "Entertainment & Travel", pct: 0.09, color: "#d5efda" },
    { key: "Savings, Debt & Taxes", pct: 0.15, color: "#edf7ef" },
  ];
  const ACTUAL_CHART_COLORS = [
    "#20563e",
    "#2c7b55",
    "#39996a",
    "#4cb07e",
    "#63c294",
    "#86d1aa",
    "#aedfc4",
    "#d7efe0",
    "#e6f4e8",
    "#9db4a5",
    "#6e8476",
    "#44544a",
  ];
  const KEYWORD_CATEGORY_RULES = [
    { category: "Housing", bucket: "Housing", keywords: ["rent", "mortgage", "apartment", "property mgmt", "landlord", "hoa "] },
    { category: "Groceries", bucket: "Food", keywords: ["grocery", "supermarket", "aldi", "hy-vee", "walmart grocery", "target grocery", "costco", "sam's", "trader joe", "whole foods", "fareway", "kroger", "publix"] },
    { category: "Dining & Coffee", bucket: "Food", keywords: ["restaurant", "cafe", "coffee", "starbucks", "mcdonald", "chipotle", "doordash", "uber eats", "grubhub", "pizza", "subway", "taco", "bar ", "brew", "dunkin"] },
    { category: "Transportation", bucket: "Transportation", keywords: ["shell", "exxon", "bp ", "citgo", "chevron", "fuel", "gas station", "uber", "lyft", "parking", "toll", "autozone", "jiffy lube", "valvoline", "oil change", "car wash"] },
    { category: "Utilities & Bills", bucket: "Utilities & Bills", keywords: ["electric", "water", "gas bill", "internet", "verizon", "at&t", "tmobile", "t-mobile", "xfinity", "comcast", "spectrum", "phone", "wireless", "utility", "trash", "sewer", "cellular"] },
    { category: "Healthcare", bucket: "Healthcare & Insurance", keywords: ["pharmacy", "walgreens", "cvs", "hospital", "clinic", "dental", "vision", "medical", "doctor", "urgent care", "health", "optical"] },
    { category: "Insurance", bucket: "Healthcare & Insurance", keywords: ["insurance", "geico", "progressive", "state farm", "allstate", "farmers ins", "blue cross", "aetna", "humana"] },
    { category: "Shopping", bucket: "Shopping & Personal", keywords: ["amazon", "target", "walmart", "best buy", "etsy", "ebay", "old navy", "gap", "nike", "adidas", "marshall", "tj maxx", "home depot", "lowes", "sephora", "ulta", "apple.com"] },
    { category: "Entertainment", bucket: "Entertainment & Travel", keywords: ["spotify", "netflix", "hulu", "max", "hbomax", "youtube", "cinema", "theater", "ticketmaster", "steam", "playstation", "xbox", "nintendo", "arcade"] },
    { category: "Travel", bucket: "Entertainment & Travel", keywords: ["hotel", "airbnb", "delta", "american airlines", "southwest", "united", "expedia", "booking.com", "vrbo", "marriott", "hilton", "airlines", "flight", "vacation"] },
    { category: "Education", bucket: "Shopping & Personal", keywords: ["tuition", "udemy", "coursera", "college", "university", "school", "textbook"] },
    { category: "Taxes & Government", bucket: "Savings, Debt & Taxes", keywords: ["irs", "tax", "dmv", "department of revenue", "license", "registration", "county treasurer"] },
    { category: "Fees & Cash", bucket: "Shopping & Personal", keywords: ["atm", "fee", "finance charge", "interest charge", "overdraft", "service charge", "late fee"] },
    { category: "Income", bucket: "Savings, Debt & Taxes", keywords: ["payroll", "direct deposit", "salary", "paycheck", "wages", "adp ", "paycom", "gusto", "square payroll", "deposit payroll"] },
    { category: "Transfers & Payments", bucket: "Savings, Debt & Taxes", keywords: ["payment thank you", "discover epayment", "discover e-payment", "online payment", "ach payment", "payment received", "mobile transfer", "online transfer", "external transfer", "internal transfer", "zelle", "venmo", "cash app", "paypal transfer", "transfer to", "transfer from", "xfer", "autopay"] },
  ];
  const EXPLICIT_CATEGORY_RULES = [
    { kind: "income", category: "Income", bucket: "Savings, Debt & Taxes", keywords: ["income", "salary", "payroll", "paycheck", "direct deposit", "deposit"] },
    { kind: "transfer", category: "Transfers & Payments", bucket: "Savings, Debt & Taxes", keywords: ["payment", "payments", "credit card payment", "autopay", "transfer", "online payment", "payment received"] },
    { kind: "refund", category: "Refunds & Credits", bucket: "Shopping & Personal", keywords: ["refund", "returned purchase", "return", "credit", "credits"] },
    { kind: "expense", category: "Housing", bucket: "Housing", keywords: ["housing", "rent", "mortgage", "home"] },
    { kind: "expense", category: "Groceries", bucket: "Food", keywords: ["grocery", "groceries", "supermarket"] },
    { kind: "expense", category: "Dining & Coffee", bucket: "Food", keywords: ["restaurant", "restaurants", "dining", "coffee", "fast food"] },
    { kind: "expense", category: "Transportation", bucket: "Transportation", keywords: ["transportation", "gas", "gasoline", "fuel", "parking", "toll", "automotive", "auto"] },
    { kind: "expense", category: "Utilities & Bills", bucket: "Utilities & Bills", keywords: ["utilities", "utility", "internet", "phone", "wireless", "streaming", "services", "service"] },
    { kind: "expense", category: "Healthcare", bucket: "Healthcare & Insurance", keywords: ["health", "healthcare", "medical", "pharmacy", "drug store"] },
    { kind: "expense", category: "Insurance", bucket: "Healthcare & Insurance", keywords: ["insurance"] },
    { kind: "expense", category: "Shopping", bucket: "Shopping & Personal", keywords: ["shopping", "merchandise", "department store", "clothing", "personal"] },
    { kind: "expense", category: "Entertainment", bucket: "Entertainment & Travel", keywords: ["entertainment", "recreation"] },
    { kind: "expense", category: "Travel", bucket: "Entertainment & Travel", keywords: ["travel", "airfare", "hotel", "lodging"] },
    { kind: "expense", category: "Education", bucket: "Shopping & Personal", keywords: ["education", "tuition", "school"] },
    { kind: "expense", category: "Fees & Cash", bucket: "Shopping & Personal", keywords: ["fees", "fee", "finance charge", "cash advance", "atm"] },
    { kind: "expense", category: "Taxes & Government", bucket: "Savings, Debt & Taxes", keywords: ["tax", "government", "dmv"] },
  ];
  const dom = {
    introStep: document.getElementById("introStep"),
    inputStep: document.getElementById("inputStep"),
    loadingStep: document.getElementById("loadingStep"),
    resultsStep: document.getElementById("resultsStep"),
    introContinueBtn: document.getElementById("introContinueBtn"),
    backToIntroBtn: document.getElementById("backToIntroBtn"),
    financesForm: document.getElementById("financesForm"),
    spendingModeFiles: document.getElementById("spendingModeFiles"),
    spendingModeManual: document.getElementById("spendingModeManual"),
    spendingModeGuide: document.getElementById("spendingModeGuide"),
    fileUploadSection: document.getElementById("fileUploadSection"),
    manualExpenseSection: document.getElementById("manualExpenseSection"),
    budgetOnlySection: document.getElementById("budgetOnlySection"),
    statementFilesInput: document.getElementById("statementFilesInput"),
    statementFileList: document.getElementById("statementFileList"),
    amountStyleSelect: document.getElementById("amountStyleSelect"),
    incomeModeAnnual: document.getElementById("incomeModeAnnual"),
    incomeModeHourly: document.getElementById("incomeModeHourly"),
    annualSalaryField: document.getElementById("annualSalaryField"),
    hourlyFields: document.getElementById("hourlyFields"),
    annualSalaryInput: document.getElementById("annualSalaryInput"),
    hourlyWageInput: document.getElementById("hourlyWageInput"),
    hoursPerWeekInput: document.getElementById("hoursPerWeekInput"),
    filingStatusSelect: document.getElementById("filingStatusSelect"),
    stateSelect: document.getElementById("stateSelect"),
    stateTaxRateInput: document.getElementById("stateTaxRateInput"),
    inputStatus: document.getElementById("inputStatus"),
    loadingHeadline: document.getElementById("loadingHeadline"),
    loadingStepsList: document.getElementById("loadingStepsList"),
    resultsHeading: document.getElementById("resultsHeading"),
    resultsRangeNote: document.getElementById("resultsRangeNote"),
    rangeStartSelect: document.getElementById("rangeStartSelect"),
    rangeEndSelect: document.getElementById("rangeEndSelect"),
    runAnotherImportBtn: document.getElementById("runAnotherImportBtn"),
    selectedSpendingLabel: document.getElementById("selectedSpendingLabel"),
    selectedSpendingValue: document.getElementById("selectedSpendingValue"),
    selectedSpendingSub: document.getElementById("selectedSpendingSub"),
    monthlyExpensesLabel: document.getElementById("monthlyExpensesLabel"),
    monthlyExpensesValue: document.getElementById("monthlyExpensesValue"),
    monthlyExpensesSub: document.getElementById("monthlyExpensesSub"),
    monthlyGrossValue: document.getElementById("monthlyGrossValue"),
    weeklyGrossSub: document.getElementById("weeklyGrossSub"),
    monthlyNetValue: document.getElementById("monthlyNetValue"),
    weeklyNetSub: document.getElementById("weeklyNetSub"),
    expensesChartHeading: document.getElementById("expensesChartHeading"),
    expensesChartCanvas: document.getElementById("expensesChartCanvas"),
    budgetGuideChartCanvas: document.getElementById("budgetGuideChartCanvas"),
    expensesChartNote: document.getElementById("expensesChartNote"),
    comparisonSection: document.getElementById("comparisonSection"),
    comparisonTableBody: document.getElementById("comparisonTableBody"),
    recommendationBanner: document.getElementById("recommendationBanner"),
    recommendationSummary: document.getElementById("recommendationSummary"),
    recommendationList: document.getElementById("recommendationList"),
    manualExpenseInputs: Array.from(document.querySelectorAll("[data-manual-expense]")),
  };
  const wizardStepIds = ["introStep", "inputStep", "loadingStep", "resultsStep"];
  const appState = {
    files: [],
    parsedTransactions: [],
    monthlyOptions: [],
    incomeProfile: null,
    spendingMode: "files",
    charts: {
      actual: null,
      guide: null,
    },
    stateRateTouched: false,
  };
  const STATE_OPTIONS = [
    ["", "Choose your state"],
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["DC", "District of Columbia"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
  ];

  if (!dom.financesForm) {
    return;
  }

  init();

  function init() {
    populateStates();
    wireEvents();
    updateSpendingMode();
    updateIncomeMode();
    renderFileList();
    showWizardStep("introStep");
  }

  function wireEvents() {
    dom.introContinueBtn.addEventListener("click", function () {
      showWizardStep("inputStep");
      clearStatus();
    });
    dom.backToIntroBtn.addEventListener("click", function () {
      showWizardStep("introStep");
      clearStatus();
    });
    dom.spendingModeFiles.addEventListener("change", updateSpendingMode);
    dom.spendingModeManual.addEventListener("change", updateSpendingMode);
    dom.spendingModeGuide.addEventListener("change", updateSpendingMode);
    dom.statementFilesInput.addEventListener("change", handleFilesChosen);
    dom.amountStyleSelect.addEventListener("change", clearStatus);
    dom.incomeModeAnnual.addEventListener("change", updateIncomeMode);
    dom.incomeModeHourly.addEventListener("change", updateIncomeMode);
    dom.stateSelect.addEventListener("change", handleStateChange);
    dom.stateTaxRateInput.addEventListener("input", function () {
      appState.stateRateTouched = true;
    });
    dom.financesForm.addEventListener("submit", handleProcessSubmit);
    dom.rangeStartSelect.addEventListener("change", handleRangeChange);
    dom.rangeEndSelect.addEventListener("change", handleRangeChange);
    dom.runAnotherImportBtn.addEventListener("click", resetToImport);
  }

  function populateStates() {
    dom.stateSelect.innerHTML = STATE_OPTIONS.map(function (entry) {
      const value = escapeHtml(entry[0]);
      const label = escapeHtml(entry[1]);
      const disabled = !entry[0] ? " selected disabled" : "";
      return '<option value="' + value + '"' + disabled + ">" + label + "</option>";
    }).join("");
  }

  function handleStateChange() {
    if (!appState.stateRateTouched || !dom.stateTaxRateInput.value.trim()) {
      dom.stateTaxRateInput.value = defaultTaxRateForState(dom.stateSelect.value).toFixed(1);
    }
  }

  function updateIncomeMode() {
    const annualMode = dom.incomeModeAnnual.checked;
    dom.annualSalaryField.hidden = !annualMode;
    dom.hourlyFields.hidden = annualMode;
  }

  function updateSpendingMode() {
    const spendingMode = getSpendingMode();
    appState.spendingMode = spendingMode;
    dom.fileUploadSection.hidden = spendingMode !== "files";
    dom.manualExpenseSection.hidden = spendingMode !== "manual";
    dom.budgetOnlySection.hidden = spendingMode !== "guide";
    if (spendingMode === "manual" && dom.manualExpenseInputs.length) {
      window.requestAnimationFrame(function () {
        dom.manualExpenseInputs[0].focus();
      });
    }
    clearStatus();
  }

  function handleFilesChosen(event) {
    const nextFiles = Array.from(event.target.files || []);
    nextFiles.forEach(function (file) {
      const duplicate = appState.files.some(function (existing) {
        return existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified;
      });
      if (!duplicate) {
        appState.files.push(file);
      }
    });
    event.target.value = "";
    renderFileList();
    clearStatus();
  }

  function renderFileList() {
    if (!appState.files.length) {
      dom.statementFileList.innerHTML = '<div class="results-empty">No files selected yet.</div>';
      return;
    }

    dom.statementFileList.innerHTML = appState.files.map(function (file, index) {
      return [
        '<div class="file-pill">',
        '<div class="file-pill-main">',
        '<div class="file-pill-name">' + escapeHtml(file.name) + "</div>",
        '<div class="file-pill-meta">' + formatBytes(file.size) + " - " + escapeHtml(extensionLabel(file.name)) + "</div>",
        "</div>",
        '<button class="icon-btn" type="button" data-remove-file="' + index + '" aria-label="Remove ' + escapeHtml(file.name) + '"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>',
        "</div>",
      ].join("");
    }).join("");

    Array.from(dom.statementFileList.querySelectorAll("[data-remove-file]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const index = Number(button.getAttribute("data-remove-file"));
        if (Number.isFinite(index)) {
          appState.files.splice(index, 1);
          renderFileList();
        }
      });
    });
  }

  async function handleProcessSubmit(event) {
    event.preventDefault();
    clearStatus();
    const validation = validateInputs();
    if (!validation.ok) {
      setStatus(validation.message, true);
      return;
    }

    const incomeProfile = buildIncomeProfile();
    const spendingMode = getSpendingMode();
    showWizardStep("loadingStep");
    updateLoadingStep(
      0,
      spendingMode === "files"
        ? "Reading your uploaded statement files locally..."
        : (spendingMode === "manual"
          ? "Reading your manually entered monthly expenses..."
          : "Building a recommended budget from your income...")
    );

    try {
      await nextFrame();
      const rawTransactions = spendingMode === "files"
        ? await readAndParseFiles(appState.files, dom.amountStyleSelect.value)
        : (spendingMode === "manual" ? buildManualTransactions() : []);
      updateLoadingStep(1, spendingMode === "guide"
        ? "Preparing a monthly budget window..."
        : "Sorting transactions chronologically and cleaning duplicate rows...");
      await pause(90);
      const mergedTransactions = finalizeTransactions(rawTransactions);
      if (spendingMode !== "guide" && !mergedTransactions.length) {
        throw new Error("I could not find any usable transactions in those files. Try a CSV, TSV, OFX, QFX, or plain-text export with a date, description, and amount.");
      }

      updateLoadingStep(2, spendingMode === "guide"
        ? "Building standard category targets..."
        : "Categorizing each transaction locally in the browser...");
      await pause(90);
      mergedTransactions.forEach(enrichTransaction);

      updateLoadingStep(3, "Calculating weekly and monthly income estimates...");
      await pause(90);
      appState.incomeProfile = incomeProfile;
      appState.spendingMode = spendingMode;
      appState.parsedTransactions = mergedTransactions;
      appState.monthlyOptions = spendingMode === "guide"
        ? [getCurrentMonthKey()]
        : listAvailableMonths(mergedTransactions);
      if (spendingMode !== "guide" && !appState.monthlyOptions.length) {
        throw new Error("The imported files were read, but no dated transactions were available for charting.");
      }
      populateRangeSelectors();

      updateLoadingStep(4, "Building charts and comparison summaries...");
      await pause(130);
      showWizardStep("resultsStep");
      renderResults();
    } catch (error) {
      showWizardStep("inputStep");
      setStatus(error && error.message ? error.message : "Something went wrong while processing those files.", true);
    }
  }

  function validateInputs() {
    if (dom.spendingModeFiles.checked && !appState.files.length) {
      return { ok: false, message: "Choose at least one statement export before continuing." };
    }
    if (dom.spendingModeManual.checked) {
      const manualTotal = sum(dom.manualExpenseInputs.map(function (input) {
        return Math.max(Number(input.value) || 0, 0);
      }));
      if (manualTotal <= 0) {
        return { ok: false, message: "Enter at least one monthly expense amount before continuing." };
      }
    }
    if (!dom.stateSelect.value) {
      return { ok: false, message: "Choose the state you live in so the net-income estimate has a starting point." };
    }
    const stateRate = Number(dom.stateTaxRateInput.value);
    if (!Number.isFinite(stateRate) || stateRate < 0 || stateRate > 20) {
      return { ok: false, message: "Enter an estimated state and local tax rate between 0% and 20%." };
    }

    if (dom.incomeModeAnnual.checked) {
      const annual = Number(dom.annualSalaryInput.value);
      if (!Number.isFinite(annual) || annual <= 0) {
        return { ok: false, message: "Enter your annual salary to estimate take-home pay." };
      }
    } else {
      const hourly = Number(dom.hourlyWageInput.value);
      const hours = Number(dom.hoursPerWeekInput.value);
      if (!Number.isFinite(hourly) || hourly <= 0) {
        return { ok: false, message: "Enter your hourly wage to estimate gross and net income." };
      }
      if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
        return { ok: false, message: "Enter a reasonable number of work hours per week." };
      }
    }

    return { ok: true };
  }

  function buildIncomeProfile() {
    const filingStatus = dom.filingStatusSelect.value || "single";
    const stateCode = dom.stateSelect.value;
    const editableStateRate = clampNumber(Number(dom.stateTaxRateInput.value), 0, 20) / 100;
    const annualGross = dom.incomeModeAnnual.checked
      ? Math.max(Number(dom.annualSalaryInput.value) || 0, 0)
      : Math.max((Number(dom.hourlyWageInput.value) || 0) * (Number(dom.hoursPerWeekInput.value) || 0) * 52, 0);
    const taxableIncome = Math.max(annualGross - FEDERAL_STANDARD_DEDUCTION[filingStatus], 0);
    const federalTax = calculateProgressiveTax(taxableIncome, FEDERAL_BRACKETS[filingStatus]);
    const socialSecurityTax = Math.min(annualGross, OASDI_WAGE_BASE) * 0.062;
    const medicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD[filingStatus] || ADDITIONAL_MEDICARE_THRESHOLD.single;
    const baseMedicareTax = annualGross * 0.0145;
    const additionalMedicareTax = annualGross > medicareThreshold ? (annualGross - medicareThreshold) * 0.009 : 0;
    const stateTax = annualGross * editableStateRate;
    const annualNet = Math.max(annualGross - federalTax - socialSecurityTax - baseMedicareTax - additionalMedicareTax - stateTax, 0);

    return {
      filingStatus: filingStatus,
      stateCode: stateCode,
      stateRate: editableStateRate,
      annualGross: annualGross,
      monthlyGross: annualGross / 12,
      weeklyGross: annualGross / 52,
      taxableIncome: taxableIncome,
      federalTax: federalTax,
      socialSecurityTax: socialSecurityTax,
      medicareTax: baseMedicareTax + additionalMedicareTax,
      stateTax: stateTax,
      annualNet: annualNet,
      monthlyNet: annualNet / 12,
      weeklyNet: annualNet / 52,
    };
  }

  async function readAndParseFiles(files, amountStyle) {
    const output = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      updateLoadingStep(0, "Reading " + file.name + " locally...");
      const text = await file.text();
      const parsed = parseStatementFile({
        fileName: file.name,
        text: text,
        amountStyle: amountStyle,
      });
      output.push.apply(output, parsed);
    }
    return output;
  }

  function buildManualTransactions() {
    const today = new Date();
    return dom.manualExpenseInputs.map(function (input) {
      const amount = Math.max(Number(input.value) || 0, 0);
      if (!amount) {
        return null;
      }
      return createTransactionRecord({
        date: new Date(today.getFullYear(), today.getMonth(), 1),
        description: "Manual monthly expense - " + String(input.getAttribute("data-manual-expense") || "Miscellaneous"),
        signedAmount: -amount,
        sourceFile: "manual-entry",
        category: String(input.getAttribute("data-manual-expense") || "Miscellaneous"),
        budgetBucket: String(input.getAttribute("data-manual-bucket") || "Shopping & Personal"),
        categorySource: "manual",
      });
    }).filter(Boolean);
  }

  function getSpendingMode() {
    if (dom.spendingModeManual.checked) {
      return "manual";
    }
    if (dom.spendingModeGuide.checked) {
      return "guide";
    }
    return "files";
  }

  function getCurrentMonthKey() {
    return toMonthKey(new Date());
  }

  function parseStatementFile(params) {
    const fileName = params.fileName || "statement";
    const text = String(params.text || "");
    const amountStyle = params.amountStyle || "auto";
    const extension = extensionLabel(fileName).toLowerCase();

    if (extension === "ofx" || extension === "qfx") {
      return parseOfxLike(text, fileName);
    }

    if (extension === "csv" || extension === "tsv") {
      const rows = parseDelimitedText(text, extension === "tsv" ? "\t" : detectDelimiter(text));
      const parsedFromDelimited = parseRowsAsTransactions(rows, fileName, amountStyle);
      if (parsedFromDelimited.length) {
        return parsedFromDelimited;
      }
    }

    const autoRows = parseDelimitedText(text, detectDelimiter(text));
    const parsedRows = parseRowsAsTransactions(autoRows, fileName, amountStyle);
    if (parsedRows.length) {
      return parsedRows;
    }

    return parseLooseTextTransactions(text, fileName, amountStyle);
  }

  function parseDelimitedText(text, delimiter) {
    const safeDelimiter = delimiter || ",";
    const normalized = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n").filter(function (line) {
      return line.trim().length > 0;
    });
    return lines.map(function (line) {
      return parseDelimitedLine(line, safeDelimiter);
    });
  }

  function parseDelimitedLine(line, delimiter) {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  }

  function detectDelimiter(text) {
    const firstFewLines = String(text || "").replace(/\r\n/g, "\n").split("\n").slice(0, 8).join("\n");
    const commaCount = (firstFewLines.match(/,/g) || []).length;
    const tabCount = (firstFewLines.match(/\t/g) || []).length;
    const pipeCount = (firstFewLines.match(/\|/g) || []).length;
    if (tabCount > commaCount && tabCount >= pipeCount) {
      return "\t";
    }
    if (pipeCount > commaCount && pipeCount > tabCount) {
      return "|";
    }
    return ",";
  }

  function parseRowsAsTransactions(rows, fileName, amountStyle) {
    if (!rows.length) {
      return [];
    }

    const headerIndex = detectHeaderRow(rows);
    const headerRow = headerIndex >= 0 ? rows[headerIndex] : null;
    const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows.slice();
    const columnMap = headerRow ? identifyColumns(headerRow) : guessDefaultColumns(rows[0]);

    if (columnMap.dateIndex === -1 || columnMap.descriptionIndex === -1 || !columnMap.hasAnyAmount) {
      return [];
    }

    return dataRows.map(function (cells) {
      return buildTransactionFromCells(cells, columnMap, fileName, amountStyle);
    }).filter(Boolean);
  }

  function detectHeaderRow(rows) {
    let bestIndex = -1;
    let bestScore = 0;
    const scanLimit = Math.min(rows.length, 6);
    for (let index = 0; index < scanLimit; index += 1) {
      const score = scoreHeaderRow(rows[index]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestScore >= 3 ? bestIndex : -1;
  }

  function scoreHeaderRow(row) {
    return row.reduce(function (score, cell) {
      const label = normalizeLabel(cell);
      if (!label) {
        return score;
      }
      if (/\b(date|posted|transaction date|post date)\b/.test(label)) {
        score += 2;
      }
      if (/\b(description|merchant|payee|details|memo|name)\b/.test(label)) {
        score += 2;
      }
      if (/\b(category|merchant category|broad category|subcategory)\b/.test(label)) {
        score += 1;
      }
      if (/\b(amount|debit|credit|withdrawal|deposit|charge|payment)\b/.test(label)) {
        score += 1;
      }
      if (/\b(balance)\b/.test(label)) {
        score += 0.5;
      }
      return score;
    }, 0);
  }

  function identifyColumns(headerRow) {
    const normalized = headerRow.map(normalizeLabel);
    let dateIndex = -1;
    let descriptionIndex = -1;
    let amountIndex = -1;
    let debitIndex = -1;
    let creditIndex = -1;
    let typeIndex = -1;
    let memoIndex = -1;
    let balanceIndex = -1;
    let categoryIndex = -1;
    let subcategoryIndex = -1;

    normalized.forEach(function (label, index) {
      if (dateIndex === -1 && /\b(transaction date|post date|posted date|date)\b/.test(label)) {
        dateIndex = index;
        return;
      }
      if (descriptionIndex === -1 && /\b(description|merchant|payee|details|reference|narrative|transaction description|name)\b/.test(label)) {
        descriptionIndex = index;
        return;
      }
      if (memoIndex === -1 && /\b(memo|notes?)\b/.test(label)) {
        memoIndex = index;
        return;
      }
      if (categoryIndex === -1 && /\b(category|merchant category|broad category|spending category)\b/.test(label)) {
        categoryIndex = index;
        return;
      }
      if (subcategoryIndex === -1 && /\b(subcategory|sub category|detailed category)\b/.test(label)) {
        subcategoryIndex = index;
        return;
      }
      if (debitIndex === -1 && /\b(debit|withdrawal|charge|purchases?)\b/.test(label)) {
        debitIndex = index;
        return;
      }
      if (creditIndex === -1 && /\b(credit|deposit|refund|payment)\b/.test(label)) {
        creditIndex = index;
        return;
      }
      if (amountIndex === -1 && /\b(amount|transaction amount)\b/.test(label)) {
        amountIndex = index;
        return;
      }
      if (typeIndex === -1 && /\b(type|transaction type|dr\/cr)\b/.test(label)) {
        typeIndex = index;
        return;
      }
      if (balanceIndex === -1 && /\b(balance)\b/.test(label)) {
        balanceIndex = index;
      }
    });

    if (descriptionIndex === -1 && memoIndex !== -1) {
      descriptionIndex = memoIndex;
      memoIndex = -1;
    }

    return {
      dateIndex: dateIndex,
      descriptionIndex: descriptionIndex,
      memoIndex: memoIndex,
      categoryIndex: categoryIndex,
      subcategoryIndex: subcategoryIndex,
      amountIndex: amountIndex,
      debitIndex: debitIndex,
      creditIndex: creditIndex,
      typeIndex: typeIndex,
      balanceIndex: balanceIndex,
      hasAnyAmount: amountIndex !== -1 || debitIndex !== -1 || creditIndex !== -1,
    };
  }

  function guessDefaultColumns(firstRow) {
    return {
      dateIndex: firstRow.length > 0 ? 0 : -1,
      descriptionIndex: firstRow.length > 1 ? 1 : -1,
      memoIndex: -1,
      categoryIndex: -1,
      subcategoryIndex: -1,
      amountIndex: firstRow.length > 2 ? firstRow.length - 1 : -1,
      debitIndex: -1,
      creditIndex: -1,
      typeIndex: -1,
      balanceIndex: -1,
      hasAnyAmount: firstRow.length > 2,
    };
  }

  function buildTransactionFromCells(cells, map, fileName, amountStyle) {
    const rawDate = getCell(cells, map.dateIndex);
    const rawDescription = [getCell(cells, map.descriptionIndex), getCell(cells, map.memoIndex)].filter(Boolean).join(" ").trim();
    const rawCategory = [getCell(cells, map.categoryIndex), getCell(cells, map.subcategoryIndex)].filter(Boolean).join(" / ").trim();
    const parsedDate = parseLooseDate(rawDate);
    if (!parsedDate || !rawDescription) {
      return null;
    }

    const typeValue = normalizeLabel(getCell(cells, map.typeIndex));
    const debitValue = parseMoney(getCell(cells, map.debitIndex));
    const creditValue = parseMoney(getCell(cells, map.creditIndex));
    const amountValue = parseMoney(getCell(cells, map.amountIndex));
    const signedAmount = resolveSignedAmount({
      fileName: fileName,
      description: rawDescription,
      typeValue: typeValue,
      debitValue: debitValue,
      creditValue: creditValue,
      amountValue: amountValue,
      amountStyle: amountStyle,
    });

    if (!Number.isFinite(signedAmount) || Math.abs(signedAmount) < 0.0001) {
      return null;
    }

    return createTransactionRecord({
      date: parsedDate,
      description: rawDescription,
      signedAmount: signedAmount,
      sourceFile: fileName,
      statementCategoryRaw: rawCategory,
    });
  }

  function resolveSignedAmount(input) {
    if (Number.isFinite(input.debitValue) || Number.isFinite(input.creditValue)) {
      const debit = Number.isFinite(input.debitValue) ? Math.abs(input.debitValue) : 0;
      const credit = Number.isFinite(input.creditValue) ? Math.abs(input.creditValue) : 0;
      if (debit && !credit) {
        return -debit;
      }
      if (credit && !debit) {
        return credit;
      }
      if (credit || debit) {
        return credit - debit;
      }
    }

    if (!Number.isFinite(input.amountValue)) {
      return NaN;
    }

    const amount = input.amountValue;
    const description = normalizeLabel(input.description);
    const typeValue = input.typeValue || "";
    const looksLikeIncome = isIncomeKeyword(description);
    const looksLikeRefund = isRefundKeyword(description);
    const looksLikeTransfer = isTransferKeyword(description);
    const typeSuggestsCredit = /\b(credit|deposit|payment received|refund)\b/.test(typeValue);
    const typeSuggestsDebit = /\b(debit|charge|purchase|withdrawal)\b/.test(typeValue);

    if (amount < 0) {
      return amount;
    }

    if (typeSuggestsCredit || looksLikeIncome || looksLikeRefund) {
      return Math.abs(amount);
    }

    if (typeSuggestsDebit) {
      return -Math.abs(amount);
    }

    if (input.amountStyle === "expenses-positive") {
      if (looksLikeTransfer) {
        return amount;
      }
      return -Math.abs(amount);
    }

    if (input.amountStyle === "expenses-negative") {
      return amount;
    }

    const fileName = normalizeLabel(input.fileName);
    const likelyCardFile = /\b(discover|credit|visa|mastercard|amex)\b/.test(fileName);
    if (likelyCardFile && !looksLikeTransfer) {
      return -Math.abs(amount);
    }

    if (looksLikeTransfer) {
      return amount;
    }

    return -Math.abs(amount);
  }

  function parseOfxLike(text, fileName) {
    const blocks = String(text || "").split(/<STMTTRN>/i).slice(1);
    return blocks.map(function (block) {
      const dateToken = extractOfxTag(block, "DTPOSTED") || extractOfxTag(block, "DTUSER");
      const amountToken = extractOfxTag(block, "TRNAMT");
      const nameToken = extractOfxTag(block, "NAME");
      const memoToken = extractOfxTag(block, "MEMO");
      const typeToken = extractOfxTag(block, "TRNTYPE");
      const date = parseOfxDate(dateToken);
      const signedAmount = parseMoney(amountToken);
      const description = [nameToken, memoToken, typeToken].filter(Boolean).join(" ").trim();
      if (!date || !Number.isFinite(signedAmount) || !description) {
        return null;
      }
      return createTransactionRecord({
        date: date,
        description: description,
        signedAmount: signedAmount,
        sourceFile: fileName,
      });
    }).filter(Boolean);
  }

  function parseLooseTextTransactions(text, fileName, amountStyle) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const output = [];
    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const dateMatch = trimmed.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      const amountMatch = trimmed.match(/([-+()]?\$?\d[\d,]*\.\d{2}\)?)(?!.*[-+()]?\$?\d[\d,]*\.\d{2}\)?)/);
      if (!dateMatch || !amountMatch) {
        return;
      }

      const date = parseLooseDate(dateMatch[1]);
      if (!date) {
        return;
      }

      const description = trimmed
        .replace(dateMatch[1], " ")
        .replace(amountMatch[1], " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!description) {
        return;
      }

      const amount = parseMoney(amountMatch[1]);
      const signedAmount = resolveSignedAmount({
        fileName: fileName,
        description: description,
        typeValue: "",
        debitValue: NaN,
        creditValue: NaN,
        amountValue: amount,
        amountStyle: amountStyle,
      });
      if (!Number.isFinite(signedAmount) || Math.abs(signedAmount) < 0.0001) {
        return;
      }

      output.push(createTransactionRecord({
        date: date,
        description: description,
        signedAmount: signedAmount,
        sourceFile: fileName,
      }));
    });
    return output;
  }

  function createTransactionRecord(input) {
    const isoDate = formatIsoDate(input.date);
    return {
      date: input.date,
      isoDate: isoDate,
      monthKey: isoDate.slice(0, 7),
      description: input.description.trim(),
      normalizedDescription: normalizeMerchant(input.description),
      signedAmount: roundMoney(input.signedAmount),
      sourceFile: input.sourceFile,
      statementCategoryRaw: String(input.statementCategoryRaw || "").trim(),
      category: input.category || "Miscellaneous",
      budgetBucket: input.budgetBucket || "Shopping & Personal",
      categorySource: input.categorySource || "",
      cashFlowType: "expense",
      includeInSpending: true,
      spendAmount: 0,
    };
  }

  function finalizeTransactions(transactions) {
    const deduped = new Map();
    transactions.forEach(function (transaction) {
      if (!transaction || !transaction.isoDate) {
        return;
      }
      const key = [
        transaction.isoDate,
        transaction.signedAmount.toFixed(2),
        transaction.normalizedDescription,
      ].join("|");
      if (!deduped.has(key)) {
        deduped.set(key, transaction);
      }
    });
    return Array.from(deduped.values()).sort(function (a, b) {
      return a.date.getTime() - b.date.getTime() || a.description.localeCompare(b.description);
    });
  }

  function enrichTransaction(transaction) {
    const normalized = transaction.normalizedDescription;
    const explicitCategoryMatch = mapExternalCategory(transaction.statementCategoryRaw);

    if (transaction.categorySource === "manual") {
      transaction.cashFlowType = "expense";
      transaction.includeInSpending = true;
      transaction.spendAmount = Math.abs(transaction.signedAmount);
      return transaction;
    }

    if (isTransferKeyword(normalized)) {
      transaction.category = "Transfers & Payments";
      transaction.budgetBucket = "Savings, Debt & Taxes";
      transaction.cashFlowType = "transfer";
      transaction.includeInSpending = false;
      transaction.spendAmount = 0;
      return transaction;
    }

    if (transaction.signedAmount > 0 && isIncomeKeyword(normalized)) {
      transaction.category = "Income";
      transaction.budgetBucket = "Savings, Debt & Taxes";
      transaction.cashFlowType = "income";
      transaction.includeInSpending = false;
      transaction.spendAmount = 0;
      return transaction;
    }

    if (transaction.signedAmount > 0 && isRefundKeyword(normalized)) {
      transaction.category = "Refunds & Credits";
      transaction.budgetBucket = "Shopping & Personal";
      transaction.cashFlowType = "refund";
      transaction.includeInSpending = false;
      transaction.spendAmount = 0;
      return transaction;
    }

    if (explicitCategoryMatch) {
      transaction.category = explicitCategoryMatch.category;
      transaction.budgetBucket = explicitCategoryMatch.bucket;
      transaction.categorySource = "statement";

      if (explicitCategoryMatch.kind === "income") {
        transaction.cashFlowType = "income";
        transaction.includeInSpending = false;
        transaction.spendAmount = 0;
        return transaction;
      }
      if (explicitCategoryMatch.kind === "transfer") {
        transaction.cashFlowType = "transfer";
        transaction.includeInSpending = false;
        transaction.spendAmount = 0;
        return transaction;
      }
      if (explicitCategoryMatch.kind === "refund") {
        transaction.cashFlowType = "refund";
        transaction.includeInSpending = false;
        transaction.spendAmount = 0;
        return transaction;
      }
    } else {
      const match = KEYWORD_CATEGORY_RULES.find(function (rule) {
        return rule.keywords.some(function (keyword) {
          return normalized.indexOf(keyword) !== -1;
        });
      });

      if (match) {
        transaction.category = match.category;
        transaction.budgetBucket = match.bucket;
        transaction.categorySource = "keyword";
      }
    }

    if (transaction.signedAmount >= 0) {
      transaction.category = transaction.categorySource ? transaction.category : "Credits & Deposits";
      transaction.budgetBucket = transaction.categorySource ? transaction.budgetBucket : "Savings, Debt & Taxes";
      transaction.cashFlowType = "credit";
      transaction.includeInSpending = false;
      transaction.spendAmount = 0;
      return transaction;
    }

    transaction.cashFlowType = "expense";
    transaction.includeInSpending = true;
    transaction.spendAmount = Math.abs(transaction.signedAmount);
    return transaction;
  }

  function listAvailableMonths(transactions) {
    const uniqueMonths = new Set();
    transactions.forEach(function (transaction) {
      if (transaction && transaction.monthKey) {
        uniqueMonths.add(transaction.monthKey);
      }
    });
    return Array.from(uniqueMonths).sort();
  }

  function populateRangeSelectors() {
    dom.rangeStartSelect.innerHTML = appState.monthlyOptions.map(function (monthKey) {
      return '<option value="' + monthKey + '">' + escapeHtml(formatMonthLabel(monthKey)) + "</option>";
    }).join("");
    dom.rangeEndSelect.innerHTML = dom.rangeStartSelect.innerHTML;
    const firstMonth = appState.monthlyOptions[0];
    const latestMonth = appState.monthlyOptions[appState.monthlyOptions.length - 1];
    dom.rangeStartSelect.value = firstMonth;
    dom.rangeEndSelect.value = latestMonth;
  }

  function handleRangeChange() {
    const start = dom.rangeStartSelect.value;
    const end = dom.rangeEndSelect.value;
    if (start && end && start > end) {
      dom.rangeEndSelect.value = start;
    }
    renderResults();
  }

  function renderResults() {
    const startMonth = dom.rangeStartSelect.value;
    const endMonth = dom.rangeEndSelect.value;
    const spendingMode = appState.spendingMode || getSpendingMode();
    if (!startMonth || !endMonth) {
      return;
    }

    const rangeTransactions = appState.parsedTransactions.filter(function (transaction) {
      return transaction.monthKey >= startMonth && transaction.monthKey <= endMonth;
    });
    const expenseTransactions = rangeTransactions.filter(function (transaction) {
      return transaction.includeInSpending;
    });
    const totalSpending = sum(expenseTransactions.map(function (transaction) {
      return transaction.spendAmount;
    }));
    const importedMonthsWithData = Array.from(new Set(rangeTransactions.map(function (transaction) {
      return transaction.monthKey;
    })));
    const activeMonthCount = Math.max(importedMonthsWithData.length, 1);
    const averageMonthlySpending = totalSpending / activeMonthCount;
    const expenseByCategory = scaleGroupedMoney(groupMoneyBy(expenseTransactions, "category"), 1 / activeMonthCount);
    const actualBudgetMix = scaleGroupedMoney(groupMoneyBy(expenseTransactions, "budgetBucket"), 1 / activeMonthCount);
    const suggestedBudgetMix = buildSuggestedBudgetMix(appState.incomeProfile.monthlyNet);
    const suggestedBudgetTotal = roundMoney(sum(suggestedBudgetMix.map(function (entry) {
      return entry.amount;
    })));
    const comparisonRows = buildComparisonRows(actualBudgetMix, suggestedBudgetMix);
    const recommendation = buildRecommendation({
      spendingMode: spendingMode,
      averageMonthlySpending: averageMonthlySpending,
      totalSpending: totalSpending,
      comparisonRows: comparisonRows,
      importedMonthCount: activeMonthCount,
      monthlyNet: appState.incomeProfile.monthlyNet,
      suggestedBudgetMix: suggestedBudgetMix,
    });

    if (spendingMode === "guide") {
      dom.resultsHeading.textContent = "Recommended Budget";
      dom.resultsRangeNote.textContent = "Based on your income inputs.";
      dom.selectedSpendingLabel.textContent = "Current spending";
      dom.selectedSpendingValue.textContent = formatCurrency(0);
      dom.selectedSpendingSub.textContent = "No expenses added.";
      dom.monthlyExpensesLabel.textContent = "Suggested budget";
      dom.monthlyExpensesValue.textContent = formatCurrency(suggestedBudgetTotal);
      dom.monthlyExpensesSub.textContent = "Monthly take-home budget target.";
      dom.expensesChartHeading.textContent = "Recommended Spending Plan";
      dom.expensesChartNote.textContent = "Built from estimated monthly take-home pay.";
      dom.comparisonSection.hidden = true;
      renderActualChart(buildChartGroupFromGuide(suggestedBudgetMix));
    } else {
      dom.resultsHeading.textContent = activeMonthCount > 1 ? "Average Monthly Snapshot" : "Monthly Snapshot";
      dom.resultsRangeNote.textContent = activeMonthCount > 1
        ? formatMonthLabel(startMonth) + " to " + formatMonthLabel(endMonth)
        : formatMonthLabel(startMonth);
      dom.selectedSpendingLabel.textContent = "Monthly average";
      dom.selectedSpendingValue.textContent = formatCurrency(averageMonthlySpending);
      dom.selectedSpendingSub.textContent = activeMonthCount > 1
        ? "Avg across " + activeMonthCount + " months."
        : (spendingMode === "manual" ? "Your current monthly snapshot." : "This month.");
      dom.monthlyExpensesLabel.textContent = "Range total";
      dom.monthlyExpensesValue.textContent = formatCurrency(totalSpending);
      dom.monthlyExpensesSub.textContent = activeMonthCount > 1
        ? "Total across " + activeMonthCount + " months."
        : "Total in the selected month.";
      dom.expensesChartHeading.textContent = "Expense Pie Chart";
      dom.expensesChartNote.textContent = activeMonthCount > 1
        ? "Avg monthly mix across " + activeMonthCount + " months."
        : "Showing expense categories for " + formatMonthLabel(startMonth) + ".";
      dom.comparisonSection.hidden = false;
      renderActualChart(expenseByCategory);
      renderComparisonTable(comparisonRows);
    }

    dom.monthlyGrossValue.textContent = formatCurrency(appState.incomeProfile.monthlyGross);
    dom.weeklyGrossSub.textContent = "Weekly gross: " + formatCurrency(appState.incomeProfile.weeklyGross);
    dom.monthlyNetValue.textContent = formatCurrency(appState.incomeProfile.monthlyNet);
    dom.weeklyNetSub.textContent = "Weekly est.: " + formatCurrency(appState.incomeProfile.weeklyNet);
    renderGuideChart(suggestedBudgetMix);
    renderRecommendation(recommendation);
  }

  function buildChartGroupFromGuide(suggestedBudgetMix) {
    return suggestedBudgetMix.reduce(function (grouped, entry) {
      if (entry.amount > 0) {
        grouped[entry.key] = entry.amount;
      }
      return grouped;
    }, {});
  }

  function buildSuggestedBudgetMix(monthlyNet) {
    const net = Math.max(monthlyNet, 0);
    return BUDGET_GUIDE.map(function (entry) {
      return {
        key: entry.key,
        amount: roundMoney(net * entry.pct),
        pct: entry.pct,
        color: entry.color,
      };
    });
  }

  function buildComparisonRows(actualBudgetMix, suggestedBudgetMix) {
    return suggestedBudgetMix.map(function (guideEntry) {
      const current = roundMoney(actualBudgetMix[guideEntry.key] || 0);
      const delta = roundMoney(current - guideEntry.amount);
      let level = "good";
      if (delta > Math.max(guideEntry.amount * 0.35, 100)) {
        level = "bad";
      } else if (delta > Math.max(guideEntry.amount * 0.1, 40)) {
        level = "warn";
      }
      return {
        key: guideEntry.key,
        current: current,
        suggested: guideEntry.amount,
        delta: delta,
        level: level,
      };
    });
  }

  function buildRecommendation(input) {
    if (input.spendingMode === "guide") {
      if (input.monthlyNet <= 0) {
        return {
          bannerClass: "bad",
          bannerLabel: "Needs Review",
          summary: "Income estimate needs a second look.",
          lines: ["Check your income and state tax inputs."],
        };
      }
      const guideByKey = input.suggestedBudgetMix.reduce(function (acc, entry) {
        acc[entry.key] = entry.amount;
        return acc;
      }, {});
      return {
        bannerClass: "good",
        bannerLabel: "Budget Ready",
        summary: "This plan was built from your estimated monthly take-home pay.",
        lines: [
          "Keep total monthly spending at or below " + formatCurrency(input.monthlyNet) + ".",
          "Try to hold housing near " + formatCurrency(guideByKey.Housing || 0) + ".",
          "Plan about " + formatCurrency(guideByKey.Food || 0) + " for food each month.",
          "Keep around " + formatCurrency(guideByKey["Savings, Debt & Taxes"] || 0) + " for savings, debt, and taxes.",
        ],
      };
    }

    const monthlyNet = input.monthlyNet;
    const monthlySpend = input.averageMonthlySpending;
    const coverageRatio = monthlyNet > 0 ? monthlySpend / monthlyNet : 1;
    const overTargetRows = input.comparisonRows
      .filter(function (row) { return row.delta > 0; })
      .sort(function (a, b) { return b.delta - a.delta; });

    const lines = [];
    let bannerClass = "good";
    let bannerLabel = "All Clear";
    let summary = "Your monthly spending looks manageable.";

    if (monthlyNet <= 0) {
      bannerClass = "bad";
      bannerLabel = "Needs Review";
      summary = "Income estimate needs a second look.";
      lines.push("Check your income and state tax inputs.");
    } else {
      if (coverageRatio > 1) {
        bannerClass = "bad";
        bannerLabel = "Reduce Spending";
        summary = "Monthly spending is above estimated take-home pay.";
        lines.push("Cut about " + formatCurrency(monthlySpend - monthlyNet) + " per month.");
      } else if (coverageRatio > 0.88 || overTargetRows.length >= 3) {
        bannerClass = "bad";
        bannerLabel = "Tight Margin";
        summary = "You are close to your monthly limit.";
      }

      if (!lines.length && coverageRatio <= 0.7) {
        lines.push("Using about " + Math.round(coverageRatio * 100) + "% of estimated monthly take-home pay.");
      } else {
        lines.push("Using about " + Math.round(coverageRatio * 100) + "% of estimated monthly take-home pay.");
      }

      overTargetRows.slice(0, 3).forEach(function (row) {
        lines.push(row.key + " is about " + formatCurrency(row.delta) + " over the guide.");
      });

      if (overTargetRows.length === 0) {
        lines.push("No major category is above the guide.");
      }
    }

    return {
      bannerClass: bannerClass,
      bannerLabel: bannerLabel,
      summary: summary,
      lines: lines.slice(0, 5),
    };
  }

  function renderActualChart(expenseByCategory) {
    const entries = Object.keys(expenseByCategory).map(function (key) {
      return { key: key, value: expenseByCategory[key] };
    }).filter(function (entry) {
      return entry.value > 0;
    }).sort(function (a, b) {
      return b.value - a.value;
    });
    const labels = entries.map(function (entry) { return entry.key; });
    const values = entries.map(function (entry) { return roundMoney(entry.value); });

    if (appState.charts.actual) {
      appState.charts.actual.destroy();
      appState.charts.actual = null;
    }

    appState.charts.actual = new Chart(dom.expensesChartCanvas, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No spending data"],
        datasets: [{
          data: values.length ? values : [1],
          backgroundColor: values.length ? ACTUAL_CHART_COLORS.slice(0, labels.length) : ["#d9e6dd"],
          borderColor: "#f7faf7",
          borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 14,
              color: "#223128",
              font: { weight: "700" },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.label + ": " + formatCurrency(context.raw);
              },
            },
          },
        },
        cutout: "56%",
      },
    });
  }

  function renderGuideChart(suggestedBudgetMix) {
    if (appState.charts.guide) {
      appState.charts.guide.destroy();
      appState.charts.guide = null;
    }

    const guideHasPositiveValues = suggestedBudgetMix.some(function (entry) {
      return entry.amount > 0;
    });

    appState.charts.guide = new Chart(dom.budgetGuideChartCanvas, {
      type: "pie",
      data: {
        labels: suggestedBudgetMix.map(function (entry) { return entry.key; }),
        datasets: [{
          data: guideHasPositiveValues
            ? suggestedBudgetMix.map(function (entry) { return entry.amount; })
            : suggestedBudgetMix.map(function (entry) { return entry.pct * 100; }),
          backgroundColor: suggestedBudgetMix.map(function (entry) { return entry.color; }),
          borderColor: "#f7faf7",
          borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 14,
              color: "#223128",
              font: { weight: "700" },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (guideHasPositiveValues) {
                  return context.label + ": " + formatCurrency(context.raw);
                }
                return context.label + ": " + Math.round(context.raw) + "% guideline share";
              },
            },
          },
        },
      },
    });
  }

  function renderComparisonTable(rows) {
    dom.comparisonTableBody.innerHTML = rows.map(function (row) {
      const deltaPrefix = row.delta > 0 ? "+" : "";
      return [
        "<tr>",
        "<td>" + escapeHtml(row.key) + "</td>",
        "<td>" + escapeHtml(formatCurrency(row.current)) + "</td>",
        "<td>" + escapeHtml(formatCurrency(row.suggested)) + "</td>",
        '<td><span class="comparison-delta ' + row.level + '">' + escapeHtml(deltaPrefix + formatCurrency(row.delta)) + "</span></td>",
        "</tr>",
      ].join("");
    }).join("");
  }

  function renderRecommendation(recommendation) {
    dom.recommendationBanner.className = "recommendation-banner " + recommendation.bannerClass;
    dom.recommendationBanner.innerHTML = recommendation.bannerClass === "good"
      ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>' + escapeHtml(recommendation.bannerLabel) + "</span>"
      : '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>' + escapeHtml(recommendation.bannerLabel) + "</span>";
    dom.recommendationSummary.textContent = recommendation.summary;
    dom.recommendationList.innerHTML = recommendation.lines.map(function (line) {
      return "<li>" + escapeHtml(line) + "</li>";
    }).join("");
  }

  function resetToImport() {
    appState.files = [];
    appState.parsedTransactions = [];
    appState.monthlyOptions = [];
    appState.incomeProfile = null;
    appState.spendingMode = "files";
    if (appState.charts.actual) {
      appState.charts.actual.destroy();
      appState.charts.actual = null;
    }
    if (appState.charts.guide) {
      appState.charts.guide.destroy();
      appState.charts.guide = null;
    }

    dom.financesForm.reset();
    dom.stateSelect.selectedIndex = 0;
    dom.stateTaxRateInput.value = "";
    appState.stateRateTouched = false;
    updateSpendingMode();
    updateIncomeMode();
    renderFileList();
    clearStatus();
    showWizardStep("inputStep");
  }

  function updateLoadingStep(index, headline) {
    if (headline) {
      dom.loadingHeadline.textContent = headline;
    }
    const steps = Array.from(dom.loadingStepsList.querySelectorAll(".loading-step"));
    steps.forEach(function (step, stepIndex) {
      step.classList.toggle("is-active", stepIndex === index);
    });
  }

  function showWizardStep(stepId) {
    wizardStepIds.forEach(function (id) {
      const element = dom[id];
      if (element) {
        element.classList.toggle("is-active", id === stepId);
      }
    });
  }

  function setStatus(message, isError) {
    dom.inputStatus.textContent = message || "";
    dom.inputStatus.classList.toggle("error", Boolean(isError));
  }

  function clearStatus() {
    setStatus("", false);
  }

  function defaultTaxRateForState(code) {
    if (!code) {
      return DEFAULT_STATE_RATE;
    }
    return NO_INCOME_TAX_STATES.has(code) ? 0 : DEFAULT_STATE_RATE;
  }

  function calculateProgressiveTax(taxableIncome, brackets) {
    let tax = 0;
    let previousCap = 0;
    for (let index = 0; index < brackets.length; index += 1) {
      const cap = brackets[index][0];
      const rate = brackets[index][1];
      const taxableAtThisRate = Math.min(taxableIncome, cap) - previousCap;
      if (taxableAtThisRate > 0) {
        tax += taxableAtThisRate * rate;
      }
      if (taxableIncome <= cap) {
        break;
      }
      previousCap = cap;
    }
    return roundMoney(tax);
  }

  function parseMoney(value) {
    if (value === null || value === undefined) {
      return NaN;
    }
    const raw = String(value).trim();
    if (!raw) {
      return NaN;
    }

    const negativeByParens = /^\(.*\)$/.test(raw);
    const cleaned = raw
      .replace(/[,$]/g, "")
      .replace(/\((.*)\)/, "$1")
      .replace(/[^\d.\-+]/g, "");

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    return negativeByParens ? -Math.abs(parsed) : parsed;
  }

  function parseLooseDate(value) {
    if (!value) {
      return null;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }

    let match = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
      return makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }

    match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      let year = Number(match[3]);
      if (year < 100) {
        year += year >= 70 ? 1900 : 2000;
      }
      return makeDate(year, Number(match[1]), Number(match[2]));
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return null;
  }

  function parseOfxDate(token) {
    const text = String(token || "").trim();
    const match = text.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) {
      return null;
    }
    return makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  function makeDate(year, month, day) {
    const next = new Date(year, month - 1, day);
    if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) {
      return null;
    }
    return next;
  }

  function extractOfxTag(block, tagName) {
    const regex = new RegExp("<" + tagName + ">([^<\\r\\n]+)", "i");
    const match = String(block || "").match(regex);
    return match ? match[1].trim() : "";
  }

  function normalizeLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMerchant(value) {
    return normalizeLabel(value)
      .replace(/\d{4,}/g, " ")
      .replace(/\bpos\b|\bpurchase\b|\bdebit\b|\bcredit\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isIncomeKeyword(normalized) {
    return /\b(payroll|direct deposit|salary|paycheck|wages|adp|paycom|gusto|income)\b/.test(normalized);
  }

  function isRefundKeyword(normalized) {
    return /\b(refund|reversal|returned|cashback|reward|statement credit|merchant credit)\b/.test(normalized);
  }

  function isTransferKeyword(normalized) {
    return /\b(payment thank you|discover e payment|discover epayment|online payment|ach payment|payment received|internal transfer|external transfer|mobile transfer|online transfer|zelle|venmo|cash app|paypal transfer|xfer|transfer to|transfer from|autopay|automatic payment)\b/.test(normalized);
  }

  function mapExternalCategory(rawCategory) {
    const normalized = normalizeLabel(rawCategory);
    if (!normalized) {
      return null;
    }
    return EXPLICIT_CATEGORY_RULES.find(function (rule) {
      return rule.keywords.some(function (keyword) {
        return normalized.indexOf(keyword) !== -1;
      });
    }) || null;
  }

  function groupMoneyBy(transactions, key) {
    return transactions.reduce(function (accumulator, transaction) {
      const groupKey = transaction[key] || "Other";
      accumulator[groupKey] = roundMoney((accumulator[groupKey] || 0) + transaction.spendAmount);
      return accumulator;
    }, {});
  }

  function scaleGroupedMoney(grouped, multiplier) {
    return Object.keys(grouped).reduce(function (accumulator, key) {
      accumulator[key] = roundMoney((grouped[key] || 0) * multiplier);
      return accumulator;
    }, {});
  }

  function formatCurrency(value) {
    const numeric = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numeric);
  }

  function formatMonthLabel(monthKey) {
    const year = Number(monthKey.slice(0, 4));
    const month = Number(monthKey.slice(5, 7));
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function sum(values) {
    return values.reduce(function (total, value) {
      return total + (Number(value) || 0);
    }, 0);
  }

  function getCell(cells, index) {
    return index >= 0 && index < cells.length ? String(cells[index] || "").trim() : "";
  }

  function clampNumber(value, min, max) {
    const safe = Number.isFinite(value) ? value : min;
    return Math.min(Math.max(safe, min), max);
  }

  function extensionLabel(fileName) {
    const parts = String(fileName || "").split(".");
    return parts.length > 1 ? parts.pop() : "file";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1) + " " + units[unitIndex];
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        resolve();
      });
    });
  }

  function pause(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
