(function () {
  "use strict";

  const QUESTION_BANK = Array.isArray(window.PAIDEN_TRIVIA_QUESTION_BANK)
    ? window.PAIDEN_TRIVIA_QUESTION_BANK.slice()
    : [];

  if (!QUESTION_BANK.length) {
    return;
  }

  const CATEGORY_META = {
    "Music": { color: "#ff6f91", icon: "fa-music", blurb: "Songs, artists, albums, and instruments." },
    "Sports": { color: "#77e35d", icon: "fa-football", blurb: "Athletes, teams, trophies, and game terms." },
    "Movies & TV": { color: "#63cfff", icon: "fa-film", blurb: "Big franchises, famous characters, and TV staples." },
    "History": { color: "#ffbe55", icon: "fa-landmark", blurb: "Major events, leaders, and historical vocabulary." },
    "Science": { color: "#45dbc7", icon: "fa-flask", blurb: "Elements, planets, discoveries, and core concepts." },
    "Geography": { color: "#a78dff", icon: "fa-earth-americas", blurb: "Capitals, landmarks, and world geography." },
  };

  const PRESET_ICONS = [
    { id: "rocket", label: "Rocket", icon: "fa-rocket", color: "linear-gradient(135deg, #63cfff, #d7f4ff)" },
    { id: "star", label: "Star", icon: "fa-star", color: "linear-gradient(135deg, #ffbe55, #ffe4a8)" },
    { id: "bolt", label: "Bolt", icon: "fa-bolt", color: "linear-gradient(135deg, #45dbc7, #cffff4)" },
    { id: "crown", label: "Crown", icon: "fa-crown", color: "linear-gradient(135deg, #a78dff, #e5dcff)" },
    { id: "dice", label: "Dice", icon: "fa-dice", color: "linear-gradient(135deg, #ff6f91, #ffd6e1)" },
    { id: "ghost", label: "Ghost", icon: "fa-ghost", color: "linear-gradient(135deg, #d6e4ff, #ffffff)" },
    { id: "chess", label: "Knight", icon: "fa-chess-knight", color: "linear-gradient(135deg, #9fe870, #edffd6)" },
    { id: "meteor", label: "Meteor", icon: "fa-meteor", color: "linear-gradient(135deg, #ffa46a, #ffe1cf)" },
  ];

  const STEP_ORDER = [
    { id: "landingStep", label: "Welcome" },
    { id: "playerCountStep", label: "Players" },
    { id: "playerSetupStep", label: "Roster" },
    { id: "modeStep", label: "Mode" },
    { id: "pointsStep", label: "Target" },
    { id: "categoriesStep", label: "Deck" },
    { id: "orderStep", label: "Order" },
    { id: "gameStep", label: "Play" },
  ];

  const QUESTIONS_BY_CATEGORY = QUESTION_BANK.reduce((map, question) => {
    if (!map[question.category]) {
      map[question.category] = [];
    }
    map[question.category].push(question);
    return map;
  }, {});

  const CATEGORY_COUNTS = Object.keys(CATEGORY_META).reduce((map, category) => {
    map[category] = (QUESTIONS_BY_CATEGORY[category] || []).length;
    return map;
  }, {});

  const dom = {
    startTriviaBtn: document.getElementById("startTriviaBtn"),
    jumpToGameBtn: document.getElementById("jumpToGameBtn"),
    landingContinueBtn: document.getElementById("landingContinueBtn"),
    heroStats: document.getElementById("heroStats"),
    bankHighlights: document.getElementById("bankHighlights"),
    categoryPreview: document.getElementById("categoryPreview"),
    stepRail: document.getElementById("stepRail"),
    landingStep: document.getElementById("landingStep"),
    playerCountStep: document.getElementById("playerCountStep"),
    playerSetupStep: document.getElementById("playerSetupStep"),
    modeStep: document.getElementById("modeStep"),
    pointsStep: document.getElementById("pointsStep"),
    categoriesStep: document.getElementById("categoriesStep"),
    orderStep: document.getElementById("orderStep"),
    gameStep: document.getElementById("gameStep"),
    playerCountInput: document.getElementById("playerCountInput"),
    playerCountStatus: document.getElementById("playerCountStatus"),
    playerCountBackBtn: document.getElementById("playerCountBackBtn"),
    playerCountContinueBtn: document.getElementById("playerCountContinueBtn"),
    playerSetupHeading: document.getElementById("playerSetupHeading"),
    playerSetupSub: document.getElementById("playerSetupSub"),
    playerPreviewAvatar: document.getElementById("playerPreviewAvatar"),
    playerPreviewName: document.getElementById("playerPreviewName"),
    playerNameInput: document.getElementById("playerNameInput"),
    playerIconGrid: document.getElementById("playerIconGrid"),
    rosterPreview: document.getElementById("rosterPreview"),
    playerSetupStatus: document.getElementById("playerSetupStatus"),
    playerSetupBackBtn: document.getElementById("playerSetupBackBtn"),
    playerSetupContinueBtn: document.getElementById("playerSetupContinueBtn"),
    modeGrid: document.getElementById("modeGrid"),
    modeBackBtn: document.getElementById("modeBackBtn"),
    modeContinueBtn: document.getElementById("modeContinueBtn"),
    pointsToWinInput: document.getElementById("pointsToWinInput"),
    winByTwoInput: document.getElementById("winByTwoInput"),
    pointsStatus: document.getElementById("pointsStatus"),
    pointsBackBtn: document.getElementById("pointsBackBtn"),
    pointsContinueBtn: document.getElementById("pointsContinueBtn"),
    categoryGrid: document.getElementById("categoryGrid"),
    categoriesStatus: document.getElementById("categoriesStatus"),
    categoriesBackBtn: document.getElementById("categoriesBackBtn"),
    categoriesContinueBtn: document.getElementById("categoriesContinueBtn"),
    orderList: document.getElementById("orderList"),
    alphabetizeOrderBtn: document.getElementById("alphabetizeOrderBtn"),
    orderBackBtn: document.getElementById("orderBackBtn"),
    beginMatchBtn: document.getElementById("beginMatchBtn"),
    currentPlayerHeading: document.getElementById("currentPlayerHeading"),
    gameInstruction: document.getElementById("gameInstruction"),
    scoreboard: document.getElementById("scoreboard"),
    wheelRotor: document.getElementById("wheelRotor"),
    categoryWheelCanvas: document.getElementById("categoryWheelCanvas"),
    wheelResult: document.getElementById("wheelResult"),
    questionPoolStatus: document.getElementById("questionPoolStatus"),
    spinWheelBtn: document.getElementById("spinWheelBtn"),
    restartMatchBtn: document.getElementById("restartMatchBtn"),
    startOverBtn: document.getElementById("startOverBtn"),
    questionCategoryBadge: document.getElementById("questionCategoryBadge"),
    questionModeBadge: document.getElementById("questionModeBadge"),
    questionPrompt: document.getElementById("questionPrompt"),
    questionSubPrompt: document.getElementById("questionSubPrompt"),
    choicesGrid: document.getElementById("choicesGrid"),
    answerPanel: document.getElementById("answerPanel"),
    answerHeading: document.getElementById("answerHeading"),
    answerText: document.getElementById("answerText"),
    answerExplanation: document.getElementById("answerExplanation"),
    questionActions: document.getElementById("questionActions"),
    winnerOverlay: document.getElementById("winnerOverlay"),
    winnerAvatar: document.getElementById("winnerAvatar"),
    winnerHeading: document.getElementById("winnerHeading"),
    winnerSummary: document.getElementById("winnerSummary"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    winnerStartOverBtn: document.getElementById("winnerStartOverBtn"),
  };

  const state = {
    currentStep: "landingStep",
    playerCount: 2,
    players: [],
    editingPlayerIndex: 0,
    mode: "multiple-choice",
    pointsToWin: 10,
    winByTwo: true,
    categories: Object.keys(CATEGORY_META),
    order: [],
    turnIndex: 0,
    scores: {},
    usedByCategory: {},
    currentCategory: "",
    currentQuestion: null,
    questionPhase: "idle",
    selectedChoiceIndex: null,
    spinning: false,
    wheelRotation: 0,
    winnerId: "",
    recycleNotice: "",
  };

  init();

  function init() {
    rebuildPlayers(state.playerCount);
    bindEvents();
    renderHero();
    renderStepRail();
    renderPlayerSetup();
    renderModeGrid();
    renderCategoryGrid();
    renderOrderList();
    renderGame();
    showStep("landingStep");
    window.addEventListener("resize", drawWheel);
  }

  function bindEvents() {
    dom.startTriviaBtn.addEventListener("click", function () {
      showStep("playerCountStep");
    });
    dom.jumpToGameBtn.addEventListener("click", function () {
      showStep("landingStep");
      dom.landingStep.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    dom.landingContinueBtn.addEventListener("click", function () {
      showStep("playerCountStep");
    });
    dom.playerCountBackBtn.addEventListener("click", function () {
      showStep("landingStep");
    });
    dom.playerCountContinueBtn.addEventListener("click", handlePlayerCountContinue);
    dom.playerNameInput.addEventListener("input", handlePlayerNameInput);
    dom.playerSetupBackBtn.addEventListener("click", handlePlayerSetupBack);
    dom.playerSetupContinueBtn.addEventListener("click", handlePlayerSetupContinue);
    dom.modeBackBtn.addEventListener("click", function () {
      showStep("playerSetupStep");
    });
    dom.modeContinueBtn.addEventListener("click", function () {
      showStep("pointsStep");
    });
    dom.pointsBackBtn.addEventListener("click", function () {
      showStep("modeStep");
    });
    dom.pointsContinueBtn.addEventListener("click", handlePointsContinue);
    dom.categoriesBackBtn.addEventListener("click", function () {
      showStep("pointsStep");
    });
    dom.categoriesContinueBtn.addEventListener("click", handleCategoriesContinue);
    dom.alphabetizeOrderBtn.addEventListener("click", alphabetizeOrder);
    dom.orderBackBtn.addEventListener("click", function () {
      showStep("categoriesStep");
    });
    dom.beginMatchBtn.addEventListener("click", startMatch);
    dom.spinWheelBtn.addEventListener("click", spinWheel);
    dom.restartMatchBtn.addEventListener("click", restartMatch);
    dom.startOverBtn.addEventListener("click", resetAll);
    dom.playAgainBtn.addEventListener("click", restartMatch);
    dom.winnerStartOverBtn.addEventListener("click", resetAll);
  }

  function renderHero() {
    dom.heroStats.innerHTML = [
      renderStatCard(QUESTION_BANK.length, "classic questions"),
      renderStatCard(Object.keys(CATEGORY_META).length, "core categories"),
      renderStatCard("2-8", "local players"),
    ].join("");

    dom.bankHighlights.innerHTML = [
      renderPill("Single classic difficulty"),
      renderPill("Multiple choice or host judged"),
      renderPill("Refresh clears the session"),
      renderPill(`${window.PAIDEN_TRIVIA_BANK_VERSION || "local"} bank build`),
    ].join("");

    dom.categoryPreview.innerHTML = Object.keys(CATEGORY_META)
      .map(function (category) {
        const meta = CATEGORY_META[category];
        return `
          <div class="preview-card">
            <div class="section-eyebrow"><i class="fa-solid ${meta.icon}" aria-hidden="true"></i><span>${category}</span></div>
            <p>${CATEGORY_COUNTS[category]} prompts tuned for general game-night play.</p>
          </div>
        `;
      })
      .join("");
  }

  function renderStepRail() {
    const currentIndex = STEP_ORDER.findIndex((step) => step.id === state.currentStep);
    dom.stepRail.innerHTML = STEP_ORDER.map(function (step, index) {
      const classes = ["step-pill"];
      if (index === currentIndex) classes.push("is-active");
      if (index < currentIndex) classes.push("is-complete");
      return `<div class="${classes.join(" ")}"><strong>${index + 1}</strong><span>${step.label}</span></div>`;
    }).join("");
  }

  function showStep(stepId) {
    state.currentStep = stepId;
    window.scrollTo({ top: 0, behavior: "smooth" });
    STEP_ORDER.forEach(function (step) {
      const node = document.getElementById(step.id);
      if (node) {
        node.hidden = step.id !== stepId;
      }
    });
    renderStepRail();
    if (stepId === "gameStep") {
      drawWheel();
    }
  }

  function renderStatCard(value, label) {
    return `<div class="stat-card"><div class="stat-value">${value}</div><p>${label}</p></div>`;
  }

  function renderPill(text) {
    return `<div class="status-pill">${text}</div>`;
  }

  function rebuildPlayers(count) {
    const nextPlayers = [];
    for (let index = 0; index < count; index += 1) {
      const existing = state.players[index];
      const preset = PRESET_ICONS[index % PRESET_ICONS.length];
      nextPlayers.push(existing || {
        id: `player-${index + 1}`,
        name: `Player ${index + 1}`,
        icon: preset.icon,
        iconLabel: preset.label,
        color: preset.color,
      });
    }
    state.players = nextPlayers;
    state.order = state.players.map((player) => player.id);
  }

  function getEditingPlayer() {
    return state.players[state.editingPlayerIndex] || null;
  }

  function applyAvatar(element, player, className) {
    element.className = className;
    element.style.background = player.color;
    element.innerHTML = `<i class="fa-solid ${player.icon}" aria-hidden="true"></i>`;
  }

  function renderPlayerSetup() {
    const player = getEditingPlayer();
    if (!player) return;

    dom.playerSetupHeading.textContent = `Player ${state.editingPlayerIndex + 1}`;
    dom.playerSetupSub.textContent = state.editingPlayerIndex === state.playerCount - 1
      ? "Finish the last player, then move into the game settings."
      : "Choose a name and token for this player.";
    dom.playerPreviewName.textContent = player.name || `Player ${state.editingPlayerIndex + 1}`;
    dom.playerNameInput.value = player.name;
    dom.playerSetupContinueBtn.textContent = state.editingPlayerIndex === state.playerCount - 1 ? "Continue to Mode" : "Next Player";
    applyAvatar(dom.playerPreviewAvatar, player, "player-avatar");

    dom.playerIconGrid.innerHTML = PRESET_ICONS.map(function (preset) {
      const isSelected = preset.icon === player.icon;
      return `
        <button class="icon-tile${isSelected ? " is-selected" : ""}" type="button" data-icon-id="${preset.id}">
          <div class="icon-mark" style="background:${preset.color}"><i class="fa-solid ${preset.icon}" aria-hidden="true"></i></div>
          <strong>${preset.label}</strong>
        </button>
      `;
    }).join("");

    Array.from(dom.playerIconGrid.querySelectorAll("[data-icon-id]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const preset = PRESET_ICONS.find((entry) => entry.id === button.getAttribute("data-icon-id"));
        if (!preset) return;
        player.icon = preset.icon;
        player.iconLabel = preset.label;
        player.color = preset.color;
        renderPlayerSetup();
      });
    });

    dom.rosterPreview.innerHTML = state.players.map(function (entry) {
      return `
        <div class="player-chip">
          <div class="player-avatar" style="background:${entry.color}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></div>
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <span class="muted">${escapeHtml(entry.iconLabel)}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function handlePlayerNameInput() {
    const player = getEditingPlayer();
    if (!player) return;
    player.name = dom.playerNameInput.value.slice(0, 24) || `Player ${state.editingPlayerIndex + 1}`;
    dom.playerPreviewName.textContent = player.name;
    renderPlayerSetup();
  }
  function handlePlayerCountContinue() {
    const count = Number(dom.playerCountInput.value);
    if (!Number.isInteger(count) || count < 2 || count > 8) {
      dom.playerCountStatus.textContent = "Choose a whole number between 2 and 8.";
      return;
    }
    dom.playerCountStatus.textContent = "";
    state.playerCount = count;
    state.editingPlayerIndex = 0;
    rebuildPlayers(count);
    renderPlayerSetup();
    showStep("playerSetupStep");
  }

  function handlePlayerSetupBack() {
    if (state.editingPlayerIndex > 0) {
      state.editingPlayerIndex -= 1;
      renderPlayerSetup();
      return;
    }
    showStep("playerCountStep");
  }

  function handlePlayerSetupContinue() {
    const player = getEditingPlayer();
    if (!player || !player.name.trim()) {
      dom.playerSetupStatus.textContent = "Each player needs a name before you continue.";
      return;
    }
    dom.playerSetupStatus.textContent = "";
    if (state.editingPlayerIndex < state.playerCount - 1) {
      state.editingPlayerIndex += 1;
      renderPlayerSetup();
      return;
    }
    alphabetizeOrder();
    renderModeGrid();
    showStep("modeStep");
  }

  function renderModeGrid() {
    const modes = [
      {
        id: "multiple-choice",
        title: "Multiple Choice",
        icon: "fa-list-check",
        description: "Tap the chosen answer on screen, then award the point."
      },
      {
        id: "host-judged",
        title: "Host Judged",
        icon: "fa-microphone-lines",
        description: "Let players answer out loud first, then reveal the official answer."
      }
    ];

    dom.modeGrid.innerHTML = modes.map(function (mode) {
      return `
        <button class="mode-card${state.mode === mode.id ? " is-selected" : ""}" type="button" data-mode="${mode.id}">
          <div class="section-eyebrow"><i class="fa-solid ${mode.icon}" aria-hidden="true"></i><span>${mode.title}</span></div>
          <p>${mode.description}</p>
        </button>
      `;
    }).join("");

    Array.from(dom.modeGrid.querySelectorAll("[data-mode]")).forEach(function (button) {
      button.addEventListener("click", function () {
        state.mode = button.getAttribute("data-mode") || "multiple-choice";
        renderModeGrid();
      });
    });
  }

  function handlePointsContinue() {
    const value = Number(dom.pointsToWinInput.value);
    if (!Number.isInteger(value) || value < 3 || value > 50) {
      dom.pointsStatus.textContent = "Choose a whole-number target between 3 and 50.";
      return;
    }
    state.pointsToWin = value;
    state.winByTwo = Boolean(dom.winByTwoInput.checked);
    dom.pointsStatus.textContent = "";
    renderCategoryGrid();
    showStep("categoriesStep");
  }

  function renderCategoryGrid() {
    dom.categoryGrid.innerHTML = Object.keys(CATEGORY_META).map(function (category) {
      const meta = CATEGORY_META[category];
      const selected = state.categories.includes(category);
      return `
        <button class="category-card${selected ? " is-selected" : ""}" type="button" data-category="${category}">
          <div class="section-eyebrow"><i class="fa-solid ${meta.icon}" aria-hidden="true"></i><span>${category}</span></div>
          <h3>${CATEGORY_COUNTS[category]} Questions</h3>
          <p>${meta.blurb}</p>
          <small>${selected ? "Included on the wheel" : "Tap to add this category"}</small>
        </button>
      `;
    }).join("");

    Array.from(dom.categoryGrid.querySelectorAll("[data-category]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const category = button.getAttribute("data-category");
        if (!category) return;
        if (state.categories.includes(category)) {
          state.categories = state.categories.filter((entry) => entry !== category);
        } else {
          state.categories = state.categories.concat(category);
        }
        renderCategoryGrid();
      });
    });
  }

  function handleCategoriesContinue() {
    if (!state.categories.length) {
      dom.categoriesStatus.textContent = "Keep at least one category in the deck.";
      return;
    }
    dom.categoriesStatus.textContent = "";
    renderOrderList();
    showStep("orderStep");
  }

  function alphabetizeOrder() {
    state.order = state.players
      .slice()
      .sort(function (left, right) {
        return left.name.localeCompare(right.name);
      })
      .map(function (player) {
        return player.id;
      });
    renderOrderList();
  }

  function renderOrderList() {
    dom.orderList.innerHTML = state.order.map(function (playerId, index) {
      const player = state.players.find((entry) => entry.id === playerId);
      if (!player) return "";
      return `
        <div class="order-row">
          <div style="display:flex; align-items:center; gap:14px;">
            <div class="player-avatar" style="background:${player.color}"><i class="fa-solid ${player.icon}" aria-hidden="true"></i></div>
            <div>
              <strong>${escapeHtml(player.name)}</strong>
              <span class="muted">Turn ${index + 1}</span>
            </div>
          </div>
          <div class="order-actions">
            <button type="button" data-move="up" data-index="${index}" aria-label="Move up"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>
            <button type="button" data-move="down" data-index="${index}" aria-label="Move down"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>
          </div>
        </div>
      `;
    }).join("");

    Array.from(dom.orderList.querySelectorAll("[data-move]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const index = Number(button.getAttribute("data-index"));
        const direction = button.getAttribute("data-move");
        moveOrder(index, direction === "up" ? -1 : 1);
      });
    });
  }

  function moveOrder(index, delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= state.order.length) return;
    const nextOrder = state.order.slice();
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[nextIndex];
    nextOrder[nextIndex] = temp;
    state.order = nextOrder;
    renderOrderList();
  }

  function startMatch() {
    state.scores = {};
    state.order.forEach(function (playerId) {
      state.scores[playerId] = 0;
    });
    state.turnIndex = 0;
    state.usedByCategory = {};
    state.currentCategory = "";
    state.currentQuestion = null;
    state.questionPhase = "idle";
    state.selectedChoiceIndex = null;
    state.winnerId = "";
    state.recycleNotice = "";
    dom.winnerOverlay.hidden = true;
    renderGame();
    showStep("gameStep");
  }

  function restartMatch() {
    startMatch();
  }

  function resetAll() {
    state.currentStep = "landingStep";
    state.playerCount = 2;
    state.editingPlayerIndex = 0;
    state.mode = "multiple-choice";
    state.pointsToWin = 10;
    state.winByTwo = true;
    state.categories = Object.keys(CATEGORY_META);
    state.turnIndex = 0;
    state.scores = {};
    state.usedByCategory = {};
    state.currentCategory = "";
    state.currentQuestion = null;
    state.questionPhase = "idle";
    state.selectedChoiceIndex = null;
    state.spinning = false;
    state.wheelRotation = 0;
    state.winnerId = "";
    state.recycleNotice = "";
    dom.playerCountInput.value = "2";
    dom.pointsToWinInput.value = "10";
    dom.winByTwoInput.checked = true;
    dom.playerCountStatus.textContent = "";
    dom.playerSetupStatus.textContent = "";
    dom.pointsStatus.textContent = "";
    dom.categoriesStatus.textContent = "";
    rebuildPlayers(2);
    renderHero();
    renderPlayerSetup();
    renderModeGrid();
    renderCategoryGrid();
    renderOrderList();
    renderGame();
    dom.winnerOverlay.hidden = true;
    showStep("landingStep");
  }

  function getCurrentPlayer() {
    const playerId = state.order[state.turnIndex] || state.players[0]?.id;
    return state.players.find((entry) => entry.id === playerId) || state.players[0];
  }

  function renderGame() {
    const player = getCurrentPlayer();
    if (player) {
      dom.currentPlayerHeading.textContent = `${player.name}'s turn`;
    }
    dom.gameInstruction.textContent = state.currentQuestion
      ? state.mode === "multiple-choice"
        ? "Use the answer grid to lock in a choice, then score the turn."
        : "Let the player answer out loud, then reveal the official answer."
      : "Spin the wheel to reveal the next category.";

    dom.scoreboard.innerHTML = state.order.map(function (playerId) {
      const entry = state.players.find((item) => item.id === playerId);
      const isActive = playerId === player?.id;
      const score = state.scores[playerId] || 0;
      return `
        <div class="score-card${isActive ? " is-selected" : ""}">
          <div class="player-avatar" style="background:${entry.color}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></div>
          <div style="flex:1;">
            <strong>${escapeHtml(entry.name)}</strong>
            <span class="muted">${isActive ? "Current player" : "Waiting"}</span>
          </div>
          <div class="stat-value" style="font-size:32px; margin:0;">${score}</div>
        </div>
      `;
    }).join("");

    dom.spinWheelBtn.disabled = state.spinning || state.questionPhase !== "idle" || !state.categories.length;
    dom.wheelRotor.style.transform = `rotate(${state.wheelRotation}deg)`;
    drawWheel();
    renderQuestionSurface();
  }

  function drawWheel() {
    const canvas = dom.categoryWheelCanvas;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.46;
    const categories = state.categories.length ? state.categories : Object.keys(CATEGORY_META);
    const slice = (Math.PI * 2) / categories.length;

    context.clearRect(0, 0, width, height);
    categories.forEach(function (category, index) {
      const start = -Math.PI / 2 + index * slice;
      const end = start + slice;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, start, end);
      context.closePath();
      context.fillStyle = CATEGORY_META[category].color;
      context.globalAlpha = 0.94;
      context.fill();
      context.globalAlpha = 1;
      context.lineWidth = 6;
      context.strokeStyle = "rgba(7, 16, 28, 0.78)";
      context.stroke();

      context.save();
      context.translate(centerX, centerY);
      context.rotate(start + slice / 2);
      context.textAlign = "right";
      context.fillStyle = "#08111f";
      context.font = "800 28px Avenir Next, Segoe UI, sans-serif";
      context.fillText(category, radius - 24, 10);
      context.restore();
    });

    context.beginPath();
    context.arc(centerX, centerY, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = "rgba(8, 17, 31, 0.92)";
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = "rgba(255,255,255,0.18)";
    context.stroke();

    context.fillStyle = "#f6f8fb";
    context.font = "800 36px Avenir Next, Segoe UI, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Spin", centerX, centerY - 10);
    context.font = "700 18px Avenir Next, Segoe UI, sans-serif";
    context.fillStyle = "rgba(246,248,251,0.72)";
    context.fillText("classic deck", centerX, centerY + 24);
  }
  function spinWheel() {
    if (state.spinning || state.questionPhase !== "idle" || !state.categories.length) {
      return;
    }

    const categories = state.categories.slice();
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const category = categories[categoryIndex];
    const sliceDegrees = 360 / categories.length;
    const currentDegrees = ((state.wheelRotation % 360) + 360) % 360;
    const targetDegrees = 360 - (categoryIndex * sliceDegrees + sliceDegrees / 2);
    let delta = 2160 + targetDegrees - currentDegrees;
    if (delta < 0) delta += 360;

    state.spinning = true;
    state.wheelRotation += delta;
    dom.wheelResult.textContent = "Spinning...";
    dom.spinWheelBtn.disabled = true;
    renderGame();

    window.setTimeout(function () {
      state.spinning = false;
      dom.spinWheelBtn.disabled = false;
      revealQuestion(category);
    }, 3600);
  }

  function revealQuestion(category) {
    state.currentCategory = category;
    state.currentQuestion = chooseQuestion(category);
    state.questionPhase = state.currentQuestion ? "active" : "idle";
    state.selectedChoiceIndex = null;
    dom.wheelResult.textContent = state.currentQuestion ? `${category} selected.` : `No question available for ${category}.`;
    renderGame();
  }

  function chooseQuestion(category) {
    const pool = QUESTIONS_BY_CATEGORY[category] || [];
    if (!pool.length) return null;
    if (!state.usedByCategory[category]) {
      state.usedByCategory[category] = new Set();
    }
    const used = state.usedByCategory[category];
    let available = pool.filter((question) => !used.has(question.id));
    if (!available.length) {
      used.clear();
      available = pool.slice();
      state.recycleNotice = `${category} has been refreshed.`;
    } else {
      state.recycleNotice = "";
    }
    const question = available[Math.floor(Math.random() * available.length)];
    used.add(question.id);
    return question;
  }

  function renderQuestionSurface() {
    const modeLabel = state.mode === "multiple-choice" ? "Multiple Choice" : "Host Judged";
    dom.questionModeBadge.textContent = modeLabel;
    dom.questionCategoryBadge.textContent = state.currentCategory || "Classic Deck";

    if (!state.currentQuestion) {
      dom.questionPrompt.textContent = "Spin the wheel to reveal the next question.";
      dom.questionSubPrompt.textContent = state.recycleNotice || "The deck is ready whenever you are.";
      dom.choicesGrid.innerHTML = "";
      dom.answerPanel.hidden = true;
      dom.questionActions.innerHTML = "";
      dom.questionPoolStatus.textContent = buildPoolStatus();
      return;
    }

    const question = state.currentQuestion;
    dom.questionPrompt.textContent = question.prompt;
    dom.questionSubPrompt.textContent = state.questionPhase === "revealed"
      ? (state.selectedChoiceIndex === null
        ? "Official answer revealed."
        : state.selectedChoiceIndex === question.answerIndex
          ? "Selected answer matched the correct answer."
          : "Selected answer did not match the correct answer.")
      : state.mode === "multiple-choice"
        ? "Tap the answer the player locks in." 
        : "Let the player answer out loud, then reveal the official answer.";

    dom.choicesGrid.innerHTML = "";
    if (state.mode === "multiple-choice") {
      dom.choicesGrid.innerHTML = question.choices.map(function (choice, index) {
        const selected = state.selectedChoiceIndex === index;
        const isCorrect = state.questionPhase === "revealed" && question.answerIndex === index;
        const isWrong = state.questionPhase === "revealed" && selected && question.answerIndex !== index;
        const classes = ["choice-btn"];
        if (selected) classes.push("is-selected");
        if (isCorrect) classes.push("is-correct");
        if (isWrong) classes.push("is-wrong");
        return `<button class="${classes.join(" ")}" type="button" data-choice-index="${index}">${escapeHtml(choice)}</button>`;
      }).join("");

      Array.from(dom.choicesGrid.querySelectorAll("[data-choice-index]")).forEach(function (button) {
        button.addEventListener("click", function () {
          if (state.questionPhase !== "active") return;
          state.selectedChoiceIndex = Number(button.getAttribute("data-choice-index"));
          state.questionPhase = "revealed";
          renderGame();
        });
      });
    }

    dom.answerPanel.hidden = state.questionPhase !== "revealed";
    if (state.questionPhase === "revealed") {
      dom.answerHeading.textContent = "Correct Answer";
      dom.answerText.textContent = question.choices[question.answerIndex];
      dom.answerExplanation.textContent = question.explanation || "";
    }

    renderQuestionActions();
    dom.questionPoolStatus.textContent = buildPoolStatus();
  }

  function renderQuestionActions() {
    dom.questionActions.innerHTML = "";

    if (!state.currentQuestion) {
      return;
    }

    if (state.mode === "host-judged" && state.questionPhase === "active") {
      const revealButton = createActionButton("btn-secondary", "Reveal Answer", function () {
        state.questionPhase = "revealed";
        renderGame();
      });
      dom.questionActions.appendChild(revealButton);
      return;
    }

    if (state.questionPhase === "revealed") {
      const awardButton = createActionButton("btn", "Award Point", function () {
        finishTurn(true);
      });
      const noPointButton = createActionButton("btn-ghost", "No Point", function () {
        finishTurn(false);
      });
      dom.questionActions.appendChild(awardButton);
      dom.questionActions.appendChild(noPointButton);
    }
  }

  function createActionButton(className, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function finishTurn(awardPoint) {
    const player = getCurrentPlayer();
    if (!player) return;
    if (awardPoint) {
      state.scores[player.id] = (state.scores[player.id] || 0) + 1;
      if (checkWinner(player.id)) {
        renderGame();
        renderWinner();
        return;
      }
    }
    state.turnIndex = (state.turnIndex + 1) % state.order.length;
    state.currentCategory = "";
    state.currentQuestion = null;
    state.questionPhase = "idle";
    state.selectedChoiceIndex = null;
    renderGame();
  }

  function checkWinner(playerId) {
    const score = state.scores[playerId] || 0;
    if (score < state.pointsToWin) {
      return false;
    }
    const nextBest = Math.max(0, ...state.order.filter((id) => id !== playerId).map((id) => state.scores[id] || 0));
    if (state.winByTwo && score - nextBest < 2) {
      return false;
    }
    state.winnerId = playerId;
    return true;
  }

  function renderWinner() {
    const winner = state.players.find((player) => player.id === state.winnerId);
    if (!winner) return;
    applyAvatar(dom.winnerAvatar, winner, "winner-avatar");
    dom.winnerHeading.textContent = `${winner.name} wins!`;
    dom.winnerSummary.textContent = `${winner.name} reached ${state.scores[winner.id]} points${state.winByTwo ? " and held the two-point lead." : "."}`;
    dom.winnerOverlay.hidden = false;
  }

  function buildPoolStatus() {
    if (!state.currentCategory) {
      return `${QUESTION_BANK.length} classic questions loaded across ${state.categories.length} active categories.`;
    }
    const used = state.usedByCategory[state.currentCategory] ? state.usedByCategory[state.currentCategory].size : 0;
    const total = CATEGORY_COUNTS[state.currentCategory] || 0;
    const remaining = Math.max(total - used, 0);
    if (state.recycleNotice) {
      return `${state.recycleNotice} ${total} questions are available in ${state.currentCategory}.`;
    }
    return `${remaining} of ${total} ${state.currentCategory} questions remain before that category refreshes.`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
