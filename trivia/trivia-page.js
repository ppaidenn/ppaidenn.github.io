(function () {
  "use strict";

  const QUESTION_BANK = Array.isArray(window.PAIDEN_TRIVIA_QUESTION_BANK)
    ? window.PAIDEN_TRIVIA_QUESTION_BANK.slice()
    : [];

  if (!QUESTION_BANK.length) return;

  const CATEGORY_META = {
    "Music": { color: "#d85d7f", icon: "fa-music", blurb: "Artists, albums, compositions, and instruments." },
    "Sports": { color: "#60a646", icon: "fa-football", blurb: "Records, rivalries, titles, and moments." },
    "Movies & TV": { color: "#3b8eb7", icon: "fa-film", blurb: "Screen history, characters, and great lines." },
    "History": { color: "#c88228", icon: "fa-landmark", blurb: "Events, movements, and the people behind them." },
    "Science": { color: "#247f86", icon: "fa-flask", blurb: "Discoveries, elements, and how things work." },
    "Geography": { color: "#7560b8", icon: "fa-earth-americas", blurb: "Places, capitals, landmarks, and borders." },
  };

  const PRESET_ICONS = [
    { id: "rocket", label: "Rocket", icon: "fa-rocket", color: "linear-gradient(135deg,#8fd3ff,#e6f7ff)" },
    { id: "star", label: "Star", icon: "fa-star", color: "linear-gradient(135deg,#ffd36f,#fff0ba)" },
    { id: "bolt", label: "Bolt", icon: "fa-bolt", color: "linear-gradient(135deg,#63d7c0,#d8fff5)" },
    { id: "crown", label: "Crown", icon: "fa-crown", color: "linear-gradient(135deg,#b6a2ff,#ece6ff)" },
    { id: "dice", label: "Dice", icon: "fa-dice", color: "linear-gradient(135deg,#ff9ab4,#ffe0e8)" },
    { id: "ghost", label: "Ghost", icon: "fa-ghost", color: "linear-gradient(135deg,#d9e5ff,#fff)" },
    { id: "chess", label: "Knight", icon: "fa-chess-knight", color: "linear-gradient(135deg,#b6ed82,#f1ffdf)" },
    { id: "meteor", label: "Meteor", icon: "fa-meteor", color: "linear-gradient(135deg,#ffb278,#ffe8d5)" },
  ];

  const STEP_ORDER = [
    { id: "landingStep", label: "Start" },
    { id: "playerCountStep", label: "Players" },
    { id: "playerSetupStep", label: "Roster" },
    { id: "modeStep", label: "Mode" },
    { id: "pointsStep", label: "Target" },
    { id: "categoriesStep", label: "Deck" },
    { id: "orderStep", label: "Order" },
    { id: "gameStep", label: "Play" },
  ];

  const QUESTIONS_BY_CATEGORY = QUESTION_BANK.reduce(function (map, question) {
    (map[question.category] ||= []).push(question);
    return map;
  }, {});

  const CATEGORY_COUNTS = Object.keys(CATEGORY_META).reduce(function (map, category) {
    map[category] = (QUESTIONS_BY_CATEGORY[category] || []).length;
    return map;
  }, {});

  const dom = {
    startTriviaBtn: byId("startTriviaBtn"),
    landingContinueBtn: byId("landingContinueBtn"),
    stepRail: byId("stepRail"),
    playerCountInput: byId("playerCountInput"),
    playerCountStatus: byId("playerCountStatus"),
    playerCountBackBtn: byId("playerCountBackBtn"),
    playerCountContinueBtn: byId("playerCountContinueBtn"),
    playerSetupHeading: byId("playerSetupHeading"),
    playerSetupSub: byId("playerSetupSub"),
    playerPreviewAvatar: byId("playerPreviewAvatar"),
    playerPreviewName: byId("playerPreviewName"),
    playerNameInput: byId("playerNameInput"),
    playerIconGrid: byId("playerIconGrid"),
    rosterPreview: byId("rosterPreview"),
    playerSetupStatus: byId("playerSetupStatus"),
    playerSetupBackBtn: byId("playerSetupBackBtn"),
    playerSetupContinueBtn: byId("playerSetupContinueBtn"),
    modeGrid: byId("modeGrid"),
    modeBackBtn: byId("modeBackBtn"),
    modeContinueBtn: byId("modeContinueBtn"),
    pointsToWinInput: byId("pointsToWinInput"),
    winByTwoInput: byId("winByTwoInput"),
    pointsStatus: byId("pointsStatus"),
    pointsBackBtn: byId("pointsBackBtn"),
    pointsContinueBtn: byId("pointsContinueBtn"),
    categoryGrid: byId("categoryGrid"),
    categoriesStatus: byId("categoriesStatus"),
    categoriesBackBtn: byId("categoriesBackBtn"),
    categoriesContinueBtn: byId("categoriesContinueBtn"),
    orderList: byId("orderList"),
    alphabetizeOrderBtn: byId("alphabetizeOrderBtn"),
    orderBackBtn: byId("orderBackBtn"),
    beginMatchBtn: byId("beginMatchBtn"),
    currentPlayerHeading: byId("currentPlayerHeading"),
    gameInstruction: byId("gameInstruction"),
    scoreboard: byId("scoreboard"),
    wheelRotor: byId("wheelRotor"),
    categoryWheelCanvas: byId("categoryWheelCanvas"),


    spinWheelBtn: byId("spinWheelBtn"),
    restartMatchBtn: byId("restartMatchBtn"),
    startOverBtn: byId("startOverBtn"),
    questionCategoryBadge: byId("questionCategoryBadge"),
    questionModeBadge: byId("questionModeBadge"),
    currentScore: byId("currentScore"),
    questionPrompt: byId("questionPrompt"),
    questionSubPrompt: byId("questionSubPrompt"),
    choicesGrid: byId("choicesGrid"),
    answerPanel: byId("answerPanel"),
    answerHeading: byId("answerHeading"),
    answerText: byId("answerText"),
    answerExplanation: byId("answerExplanation"),
    questionActions: byId("questionActions"),
    winnerOverlay: byId("winnerOverlay"),
    winnerAvatar: byId("winnerAvatar"),
    winnerHeading: byId("winnerHeading"),
    winnerSummary: byId("winnerSummary"),
    playAgainBtn: byId("playAgainBtn"),
    winnerStartOverBtn: byId("winnerStartOverBtn"),
  };

  const state = {
    currentStep: "landingStep",
    playerCount: 2,
    players: [],
    editingPlayerIndex: 0,
    mode: "host-judged",
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

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    rebuildPlayers(state.playerCount);
    bindEvents();
    renderStepRail();
    renderPlayerSetup();
    renderModeGrid();
    renderCategoryGrid();
    renderOrderList();
    renderGame();
    showStep("landingStep", false);
    window.addEventListener("resize", drawWheel);
  }

  function bindEvents() {
    dom.startTriviaBtn.addEventListener("click", function () { showStep("playerCountStep"); });
    dom.landingContinueBtn.addEventListener("click", function () { showStep("playerCountStep"); });
    dom.playerCountBackBtn.addEventListener("click", function () { showStep("landingStep"); });
    dom.playerCountContinueBtn.addEventListener("click", handlePlayerCountContinue);
    dom.playerNameInput.addEventListener("input", handlePlayerNameInput);
    dom.playerSetupBackBtn.addEventListener("click", handlePlayerSetupBack);
    dom.playerSetupContinueBtn.addEventListener("click", handlePlayerSetupContinue);
    dom.modeBackBtn.addEventListener("click", function () { showStep("playerSetupStep"); });
    dom.modeContinueBtn.addEventListener("click", function () { showStep("pointsStep"); });
    dom.pointsBackBtn.addEventListener("click", function () { showStep("modeStep"); });
    dom.pointsContinueBtn.addEventListener("click", handlePointsContinue);
    dom.categoriesBackBtn.addEventListener("click", function () { showStep("pointsStep"); });
    dom.categoriesContinueBtn.addEventListener("click", handleCategoriesContinue);
    dom.alphabetizeOrderBtn.addEventListener("click", alphabetizeOrder);
    dom.orderBackBtn.addEventListener("click", function () { showStep("categoriesStep"); });
    dom.beginMatchBtn.addEventListener("click", startMatch);
    dom.spinWheelBtn.addEventListener("click", spinWheel);
    dom.categoryWheelCanvas.addEventListener("click", spinWheel);
    dom.categoryWheelCanvas.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      spinWheel();
    });
    dom.restartMatchBtn.addEventListener("click", restartMatch);
    dom.startOverBtn.addEventListener("click", resetAll);
    dom.playAgainBtn.addEventListener("click", restartMatch);
    dom.winnerStartOverBtn.addEventListener("click", resetAll);
  }

  function showStep(stepId, animate = true) {
    state.currentStep = stepId;
    STEP_ORDER.forEach(function (step) {
      const node = byId(step.id);
      if (!node) return;
      const active = step.id === stepId;
      node.hidden = !active;
      node.classList.remove("is-entering");
      if (active && animate) {
        window.requestAnimationFrame(function () {
          node.classList.add("is-entering");
          window.setTimeout(function () { node.classList.remove("is-entering"); }, 420);
        });
      }
    });
    renderStepRail();
    if (stepId === "gameStep") window.requestAnimationFrame(drawWheel);
  }

  function renderStepRail() {
    const currentIndex = STEP_ORDER.findIndex(function (step) { return step.id === state.currentStep; });
    dom.stepRail.innerHTML = STEP_ORDER.map(function (step, index) {
      const classes = ["step-pill"];
      if (index === currentIndex) classes.push("is-active");
      if (index < currentIndex) classes.push("is-complete");
      return `<div class="${classes.join(" ")}"><strong>${index + 1}</strong><span>${step.label}</span></div>`;
    }).join("");
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
    state.order = state.players.map(function (player) { return player.id; });
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
      ? "Finish the last player, then choose the game settings."
      : "Choose a name and token for this player.";
    dom.playerPreviewName.textContent = player.name || `Player ${state.editingPlayerIndex + 1}`;
    dom.playerNameInput.value = player.name;
    dom.playerSetupContinueBtn.textContent = state.editingPlayerIndex === state.playerCount - 1 ? "Continue to Mode" : "Next Player";
    applyAvatar(dom.playerPreviewAvatar, player, "player-avatar");

    dom.playerIconGrid.innerHTML = PRESET_ICONS.map(function (preset) {
      const selected = preset.icon === player.icon;
      return `<button class="icon-tile${selected ? " is-selected" : ""}" type="button" data-icon-id="${preset.id}"><div class="icon-mark" style="background:${preset.color}"><i class="fa-solid ${preset.icon}" aria-hidden="true"></i></div><strong>${preset.label}</strong></button>`;
    }).join("");
    dom.playerIconGrid.querySelectorAll("[data-icon-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        const preset = PRESET_ICONS.find(function (entry) { return entry.id === button.dataset.iconId; });
        if (!preset) return;
        player.icon = preset.icon;
        player.iconLabel = preset.label;
        player.color = preset.color;
        renderPlayerSetup();
      });
    });

    dom.rosterPreview.innerHTML = state.players.map(function (entry) {
      return `<div class="player-chip"><div class="player-avatar" style="background:${entry.color}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></div><div><strong>${escapeHtml(entry.name)}</strong><span class="muted">${escapeHtml(entry.iconLabel)}</span></div></div>`;
    }).join("");
  }

  function handlePlayerCountContinue() {
    const count = Number(dom.playerCountInput.value);
    if (!Number.isInteger(count) || count < 2 || count > 8) {
      dom.playerCountStatus.textContent = "Choose a whole number from 2 to 8.";
      return;
    }
    state.playerCount = count;
    state.editingPlayerIndex = 0;
    rebuildPlayers(count);
    dom.playerCountStatus.textContent = "";
    renderPlayerSetup();
    showStep("playerSetupStep");
  }

  function handlePlayerNameInput() {
    const player = getEditingPlayer();
    if (!player) return;
    player.name = dom.playerNameInput.value.slice(0, 24);
    dom.playerPreviewName.textContent = player.name || `Player ${state.editingPlayerIndex + 1}`;
    renderRosterPreview();
  }

  function renderRosterPreview() {
    dom.rosterPreview.innerHTML = state.players.map(function (entry) {
      return `<div class="player-chip"><div class="player-avatar" style="background:${entry.color}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></div><div><strong>${escapeHtml(entry.name || "Unnamed player")}</strong><span class="muted">${escapeHtml(entry.iconLabel)}</span></div></div>`;
    }).join("");
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
      { id: "host-judged", title: "Speak It", icon: "fa-microphone-lines", description: "Answer out loud first, then reveal the official answer." },
      { id: "multiple-choice", title: "Multiple Choice", icon: "fa-list-check", description: "A faster round with deliberately close answer options." },
    ];
    dom.modeGrid.innerHTML = modes.map(function (mode) {
      return `<button class="mode-card${state.mode === mode.id ? " is-selected" : ""}" type="button" data-mode="${mode.id}"><div class="section-eyebrow"><i class="fa-solid ${mode.icon}" aria-hidden="true"></i><span>${mode.title}</span></div><p>${mode.description}</p></button>`;
    }).join("");
    dom.modeGrid.querySelectorAll("[data-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.mode = button.dataset.mode || "host-judged";
        renderModeGrid();
      });
    });
  }

  function handlePointsContinue() {
    const value = Number(dom.pointsToWinInput.value);
    if (!Number.isInteger(value) || value < 3 || value > 50) {
      dom.pointsStatus.textContent = "Choose a whole-number target from 3 to 50.";
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
      return `<button class="category-card${selected ? " is-selected" : ""}" type="button" data-category="${category}"><div class="section-eyebrow"><i class="fa-solid ${meta.icon}" aria-hidden="true"></i><span>${category}</span></div><h3>${CATEGORY_COUNTS[category]} questions</h3><p>${meta.blurb}</p><small>${selected ? "Included on the wheel" : "Tap to add this category"}</small></button>`;
    }).join("");
    dom.categoryGrid.querySelectorAll("[data-category]").forEach(function (button) {
      button.addEventListener("click", function () {
        const category = button.dataset.category;
        if (!category) return;
        state.categories = state.categories.includes(category)
          ? state.categories.filter(function (entry) { return entry !== category; })
          : state.categories.concat(category);
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
    state.order = state.players.slice().sort(function (left, right) {
      return left.name.localeCompare(right.name);
    }).map(function (player) { return player.id; });
    renderOrderList();
  }

  function renderOrderList() {
    dom.orderList.innerHTML = state.order.map(function (playerId, index) {
      const player = findPlayer(playerId);
      if (!player) return "";
      return `<div class="order-row"><div class="player-chip" style="padding:0;border:0;background:transparent"><div class="player-avatar" style="background:${player.color}"><i class="fa-solid ${player.icon}" aria-hidden="true"></i></div><div><strong>${escapeHtml(player.name)}</strong><span class="muted">Turn ${index + 1}</span></div></div><div class="order-actions"><button type="button" data-order-move="up" data-player-id="${player.id}" aria-label="Move ${escapeHtml(player.name)} up"><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-order-move="down" data-player-id="${player.id}" aria-label="Move ${escapeHtml(player.name)} down"><i class="fa-solid fa-arrow-down"></i></button></div></div>`;
    }).join("");
    dom.orderList.querySelectorAll("[data-order-move]").forEach(function (button) {
      button.addEventListener("click", function () {
        const index = state.order.indexOf(button.dataset.playerId);
        const direction = button.dataset.orderMove === "up" ? -1 : 1;
        const target = index + direction;
        if (index < 0 || target < 0 || target >= state.order.length) return;
        [state.order[index], state.order[target]] = [state.order[target], state.order[index]];
        renderOrderList();
      });
    });
  }

  function startMatch() {
    state.turnIndex = 0;
    state.scores = Object.fromEntries(state.players.map(function (player) { return [player.id, 0]; }));
    state.usedByCategory = {};
    state.currentCategory = "";
    state.currentQuestion = null;
    state.questionPhase = "idle";
    state.selectedChoiceIndex = null;
    state.spinning = false;
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
    state.players = [];
    state.editingPlayerIndex = 0;
    state.mode = "host-judged";
    state.pointsToWin = 10;
    state.winByTwo = true;
    state.categories = Object.keys(CATEGORY_META);
    state.order = [];
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
    renderPlayerSetup();
    renderModeGrid();
    renderCategoryGrid();
    renderOrderList();
    renderGame();
    dom.winnerOverlay.hidden = true;
    showStep("landingStep");
  }

  function findPlayer(id) {
    return state.players.find(function (player) { return player.id === id; });
  }

  function getCurrentPlayer() {
    return findPlayer(state.order[state.turnIndex]) || state.players[0];
  }

  function renderGame() {
    const player = getCurrentPlayer();
    if (player) {
      dom.currentPlayerHeading.textContent = `${player.name}'s turn`;
      dom.currentScore.textContent = `Score: ${state.scores[player.id] || 0} / ${state.pointsToWin}`;
    }
    dom.gameInstruction.textContent = state.currentQuestion
      ? state.mode === "multiple-choice"
        ? "Choose an answer, then lock it in before revealing the result."
        : "Let the player answer out loud before revealing the result."
      : "Spin the wheel to reveal the next category.";
    dom.scoreboard.innerHTML = state.order.map(function (playerId) {
      const entry = findPlayer(playerId);
      const active = playerId === player?.id;
      const score = state.scores[playerId] || 0;
      return `<div class="score-card${active ? " is-selected" : ""}"><div class="player-avatar" style="background:${entry.color}"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></div><div style="flex:1"><strong>${escapeHtml(entry.name)}</strong><span class="muted">${active ? "Current player" : "Waiting"}</span></div><div class="stat-value">${score}</div></div>`;
    }).join("");
    const canSpin = !state.spinning && state.questionPhase === "idle" && state.categories.length > 0;
    dom.spinWheelBtn.disabled = !canSpin;
    dom.categoryWheelCanvas.setAttribute("aria-disabled", String(!canSpin));
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
      context.fill();
      context.lineWidth = 7;
      context.strokeStyle = "rgba(255,250,244,.88)";
      context.stroke();
      context.save();
      context.translate(centerX, centerY);
      context.rotate(start + slice / 2);
      context.textAlign = "right";
      context.fillStyle = "#fffaf4";
      context.font = "900 28px Avenir Next, Trebuchet MS, sans-serif";
      context.fillText(category, radius - 22, 10);
      context.restore();
    });
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.29, 0, Math.PI * 2);
    context.fillStyle = "#20262d";
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = "rgba(255,250,244,.82)";
    context.stroke();
    context.fillStyle = "#fffaf4";
    context.font = "900 36px Avenir Next, Trebuchet MS, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Spin", centerX, centerY - 10);
    context.font = "800 17px Avenir Next, Trebuchet MS, sans-serif";
    context.fillStyle = "rgba(255,250,244,.72)";
    context.fillText("challenge deck", centerX, centerY + 23);
  }

  function spinWheel() {
    if (state.spinning || state.questionPhase !== "idle" || !state.categories.length) return;
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

    renderGame();
    window.setTimeout(function () {
      state.spinning = false;
      revealQuestion(category);
    }, 3600);
  }

  function revealQuestion(category) {
    state.currentCategory = category;
    state.currentQuestion = chooseQuestion(category);
    state.questionPhase = state.currentQuestion ? "active" : "idle";
    state.selectedChoiceIndex = null;

    renderGame();
  }

  function chooseQuestion(category) {
    const pool = QUESTIONS_BY_CATEGORY[category] || [];
    if (!pool.length) return null;
    const used = state.usedByCategory[category] ||= new Set();
    let available = pool.filter(function (question) { return !used.has(question.id); });
    if (!available.length) {
      used.clear();
      available = pool.slice();
      state.recycleNotice = `${category} has been refreshed.`;
    } else {
      state.recycleNotice = "";
    }
    const challengeQuestions = available.filter(function (question) { return question.tier === "challenge"; });
    const selectionPool = challengeQuestions.length && Math.random() < 0.82 ? challengeQuestions : available;
    const question = selectionPool[Math.floor(Math.random() * selectionPool.length)];
    used.add(question.id);
    return question;
  }

  function renderQuestionSurface() {
    const modeLabel = state.mode === "multiple-choice" ? "Multiple Choice" : "Speak It";
    dom.questionModeBadge.textContent = modeLabel;
    dom.questionCategoryBadge.textContent = state.currentCategory || "Challenge Deck";

    if (!state.currentQuestion) {
      dom.questionPrompt.textContent = "Spin the wheel to reveal the next question.";
      dom.questionSubPrompt.textContent = state.recycleNotice || "The deck is ready whenever you are.";
      dom.choicesGrid.innerHTML = "";
      dom.answerPanel.hidden = true;
      dom.questionActions.innerHTML = "";
      return;
    }
    const question = state.currentQuestion;
    const revealed = state.questionPhase === "revealed";
    dom.questionPrompt.textContent = question.prompt;
    dom.questionSubPrompt.textContent = revealed
      ? state.selectedChoiceIndex === null ? "Official answer revealed." : state.selectedChoiceIndex === question.answerIndex ? "That answer is correct." : "That answer is not correct."
      : state.mode === "multiple-choice" ? "Tap an answer, then lock it in." : "Let the player answer aloud, then reveal the answer.";
    dom.choicesGrid.innerHTML = "";
    if (state.mode === "multiple-choice") {
      dom.choicesGrid.innerHTML = question.choices.map(function (choice, index) {
        const classes = ["choice-btn"];
        if (state.selectedChoiceIndex === index) classes.push("is-selected");
        if (revealed && index === question.answerIndex) classes.push("is-correct");
        if (revealed && index === state.selectedChoiceIndex && index !== question.answerIndex) classes.push("is-wrong");
        return `<button class="${classes.join(" ")}" type="button" data-choice-index="${index}"${revealed ? " disabled" : ""}>${escapeHtml(choice)}</button>`;
      }).join("");
      if (!revealed) {
        dom.choicesGrid.querySelectorAll("[data-choice-index]").forEach(function (button) {
          button.addEventListener("click", function () {
            state.selectedChoiceIndex = Number(button.dataset.choiceIndex);
            state.questionPhase = "selected";
            renderQuestionSurface();
          });
        });
      }
    }
    dom.answerPanel.hidden = !revealed;
    if (revealed) {
      dom.answerHeading.textContent = "Official answer";
      dom.answerText.textContent = question.choices[question.answerIndex];
      dom.answerExplanation.textContent = question.explanation || "";
    }
    renderQuestionActions(revealed);
  }

  function renderQuestionActions(revealed) {
    if (!state.currentQuestion) return;
    if (!revealed) {
      const canReveal = state.mode === "host-judged" || state.selectedChoiceIndex !== null;
      dom.questionActions.innerHTML = `<button class="btn" id="revealAnswerBtn" type="button"${canReveal ? "" : " disabled"}>${state.mode === "multiple-choice" ? "Lock answer" : "Reveal answer"}</button>`;
      byId("revealAnswerBtn").addEventListener("click", function () {
        if (!canReveal) return;
        state.questionPhase = "revealed";
        renderGame();
      });
      return;
    }
    const autoCorrect = state.mode === "multiple-choice" && state.selectedChoiceIndex === state.currentQuestion.answerIndex;
    dom.questionActions.innerHTML = `<button class="btn" id="awardPointBtn" type="button">Award point${autoCorrect ? "" : ""}</button><button class="btn-ghost" id="noPointBtn" type="button">No point</button>`;
    byId("awardPointBtn").addEventListener("click", function () { finishQuestion(true); });
    byId("noPointBtn").addEventListener("click", function () { finishQuestion(false); });
  }

  function finishQuestion(awardPoint) {
    const player = getCurrentPlayer();
    if (!player) return;
    if (awardPoint) state.scores[player.id] = (state.scores[player.id] || 0) + 1;
    if (hasWinner(player)) {
      showWinner(player);
      return;
    }
    state.turnIndex = (state.turnIndex + 1) % state.order.length;
    state.currentQuestion = null;
    state.currentCategory = "";
    state.questionPhase = "idle";
    state.selectedChoiceIndex = null;
    renderGame();
  }

  function hasWinner(player) {
    const score = state.scores[player.id] || 0;
    if (score < state.pointsToWin) return false;
    if (!state.winByTwo) return true;
    const secondHighest = Math.max(0, ...state.players.filter(function (entry) { return entry.id !== player.id; }).map(function (entry) { return state.scores[entry.id] || 0; }));
    return score - secondHighest >= 2;
  }

  function showWinner(player) {
    state.winnerId = player.id;
    applyAvatar(dom.winnerAvatar, player, "winner-avatar");
    dom.winnerHeading.textContent = `${player.name} wins!`;
    dom.winnerSummary.textContent = `${player.name} reached ${state.scores[player.id]} points.`;
    dom.winnerOverlay.hidden = false;
  }


  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character];
    });
  }
})();
