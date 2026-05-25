(function () {
  "use strict";

  const QUESTION_BANK = Array.isArray(window.PAIDEN_TRIVIA_QUESTION_BANK)
    ? window.PAIDEN_TRIVIA_QUESTION_BANK.slice()
    : [];

  const STORAGE_KEYS = {
    usedQuestionIds: "paiden_trivia_used_question_ids_v1",
  };

  const DEFAULT_CATEGORIES = [
    "Music",
    "Sports",
    "Movies & TV",
    "History",
    "Science",
    "Geography",
  ];

  const CATEGORY_META = {
    Music: { color: "#ff8fc4" },
    Sports: { color: "#9fe870" },
    "Movies & TV": { color: "#70c9ff" },
    History: { color: "#ffcb67" },
    Science: { color: "#52d8c8" },
    Geography: { color: "#a992ff" },
  };

  const DIFFICULTY_OPTIONS = ["easy", "medium", "hard", "impossible"];

  const PRESET_ICONS = [
    { id: "fox", name: "Fox", src: svgAvatar("fox", "#ff9c4a", "#fff0dc", "#7a3212", "triangle", "fox") },
    { id: "cat", name: "Cat", src: svgAvatar("cat", "#b48fff", "#f5edff", "#4d3072", "cat", "cat") },
    { id: "bear", name: "Bear", src: svgAvatar("bear", "#c38a56", "#f5e1c8", "#5b3716", "bear", "bear") },
    { id: "frog", name: "Frog", src: svgAvatar("frog", "#7fe36f", "#efffe5", "#285a22", "round", "frog") },
    { id: "owl", name: "Owl", src: svgAvatar("owl", "#9ba7ff", "#f1f4ff", "#334188", "owl", "owl") },
    { id: "bunny", name: "Bunny", src: svgAvatar("bunny", "#ffd0e9", "#fff4fb", "#8c4766", "bunny", "bunny") },
    { id: "penguin", name: "Penguin", src: svgAvatar("penguin", "#9ed9ff", "#ffffff", "#243241", "penguin", "penguin") },
    { id: "dog", name: "Dog", src: svgAvatar("dog", "#f0bf78", "#fff1db", "#74491d", "dog", "dog") },
  ];

  const dom = {
    landingStep: document.getElementById("landingStep"),
    playerCountStep: document.getElementById("playerCountStep"),
    playerSetupStep: document.getElementById("playerSetupStep"),
    modeStep: document.getElementById("modeStep"),
    pointsStep: document.getElementById("pointsStep"),
    difficultyStep: document.getElementById("difficultyStep"),
    categoriesStep: document.getElementById("categoriesStep"),
    orderStep: document.getElementById("orderStep"),
    gameStep: document.getElementById("gameStep"),
    startTriviaBtn: document.getElementById("startTriviaBtn"),
    playerCountInput: document.getElementById("playerCountInput"),
    playerCountStatus: document.getElementById("playerCountStatus"),
    playerCountBackBtn: document.getElementById("playerCountBackBtn"),
    playerCountContinueBtn: document.getElementById("playerCountContinueBtn"),
    playerSetupHeading: document.getElementById("playerSetupHeading"),
    playerSetupSub: document.getElementById("playerSetupSub"),
    playerSetupPreview: document.getElementById("playerSetupPreview"),
    playerNameInput: document.getElementById("playerNameInput"),
    playerIconGrid: document.getElementById("playerIconGrid"),
    playerIconUploadInput: document.getElementById("playerIconUploadInput"),
    resetPlayerIconBtn: document.getElementById("resetPlayerIconBtn"),
    playerSetupStatus: document.getElementById("playerSetupStatus"),
    playerSetupBackBtn: document.getElementById("playerSetupBackBtn"),
    playerSetupContinueBtn: document.getElementById("playerSetupContinueBtn"),
    modeMultipleChoiceCard: document.getElementById("modeMultipleChoiceCard"),
    modeFreeResponseCard: document.getElementById("modeFreeResponseCard"),
    modeBackBtn: document.getElementById("modeBackBtn"),
    modeContinueBtn: document.getElementById("modeContinueBtn"),
    pointsToWinInput: document.getElementById("pointsToWinInput"),
    winByTwoInput: document.getElementById("winByTwoInput"),
    pointsStatus: document.getElementById("pointsStatus"),
    pointsBackBtn: document.getElementById("pointsBackBtn"),
    pointsContinueBtn: document.getElementById("pointsContinueBtn"),
    difficultyGrid: document.getElementById("difficultyGrid"),
    difficultyBackBtn: document.getElementById("difficultyBackBtn"),
    difficultyContinueBtn: document.getElementById("difficultyContinueBtn"),
    gameDifficultySwitcher: document.getElementById("gameDifficultySwitcher"),
    categoryBank: document.getElementById("categoryBank"),
    categoriesStatus: document.getElementById("categoriesStatus"),
    categoriesBackBtn: document.getElementById("categoriesBackBtn"),
    categoriesStartBtn: document.getElementById("categoriesStartBtn"),
    orderList: document.getElementById("orderList"),
    alphabetizeOrderBtn: document.getElementById("alphabetizeOrderBtn"),
    orderBackBtn: document.getElementById("orderBackBtn"),
    beginMatchBtn: document.getElementById("beginMatchBtn"),
    turnNumberLabel: document.getElementById("turnNumberLabel"),
    turnDifficultyLabel: document.getElementById("turnDifficultyLabel"),
    currentPlayerHeading: document.getElementById("currentPlayerHeading"),
    gameInstruction: document.getElementById("gameInstruction"),
    restartSameSettingsBtn: document.getElementById("restartSameSettingsBtn"),
    gameStartOverBtn: document.getElementById("gameStartOverBtn"),
    scoreboard: document.getElementById("scoreboard"),
    wheelSpinWrap: document.getElementById("wheelSpinWrap"),
    wheelCard: document.getElementById("wheelCard"),
    categoryWheelCanvas: document.getElementById("categoryWheelCanvas"),
    wheelResult: document.getElementById("wheelResult"),
    spinWheelBtn: document.getElementById("spinWheelBtn"),
    questionCard: document.getElementById("questionCard"),
    questionPoolStatus: document.getElementById("questionPoolStatus"),
    questionCategoryBadge: document.getElementById("questionCategoryBadge"),
    questionModeBadge: document.getElementById("questionModeBadge"),
    questionPrompt: document.getElementById("questionPrompt"),
    questionSubPrompt: document.getElementById("questionSubPrompt"),
    judgeNote: document.getElementById("judgeNote"),
    multipleChoiceGrid: document.getElementById("multipleChoiceGrid"),
    answerPanel: document.getElementById("answerPanel"),
    answerHeading: document.getElementById("answerHeading"),
    answerText: document.getElementById("answerText"),
    answerExplanation: document.getElementById("answerExplanation"),
    questionActions: document.getElementById("questionActions"),
    winRuleNote: document.getElementById("winRuleNote"),
    transitionOverlay: document.getElementById("transitionOverlay"),
    winnerOverlay: document.getElementById("winnerOverlay"),
    winnerIcon: document.getElementById("winnerIcon"),
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
    pointsToWin: 11,
    winByTwo: true,
    difficulty: "medium",
    categories: DEFAULT_CATEGORIES.slice(),
    order: [],
    turnIndex: 0,
    scores: {},
    currentCategory: "",
    currentQuestion: null,
    currentAnsweredIndex: null,
    questionResolved: false,
    showAnswer: false,
    wheelRotation: 0,
    spinning: false,
    usedInGameIds: [],
    recycleNotice: "",
    winnerId: "",
    transitionTimer: 0,
    spinTimer: 0,
    fitFrame: 0,
  };

  if (!dom.startTriviaBtn) {
    return;
  }

  init();

  function init() {
    bindEvents();
    rebuildPlayers(state.playerCount);
    renderPlayerSetup();
    renderModeCards();
    renderDifficultyCards();
    renderCategoryBank();
    renderOrderList();
    renderGame();
    syncImmersiveState();
    showStep("landingStep");
    window.addEventListener("resize", function () {
      drawWheel();
      scheduleFitActiveStep();
    });
    document.addEventListener("fullscreenchange", function () {
      syncImmersiveState();
      scheduleFitActiveStep();
    });
  }

  function bindEvents() {
    dom.startTriviaBtn.addEventListener("click", function () {
      enterImmersiveMode();
      requestFullscreenMode();
      showStep("playerCountStep");
      clearStatus(dom.playerCountStatus);
    });
    dom.playerCountBackBtn.addEventListener("click", function () {
      showStep("landingStep");
    });
    dom.playerCountContinueBtn.addEventListener("click", handlePlayerCountContinue);
    dom.playerNameInput.addEventListener("input", function () {
      const player = getEditingPlayer();
      if (!player) return;
      player.name = dom.playerNameInput.value;
      renderPlayerPreview();
    });
    dom.playerIconUploadInput.addEventListener("change", handleCustomIconUpload);
    dom.resetPlayerIconBtn.addEventListener("click", function () {
      const player = getEditingPlayer();
      if (!player) return;
      const fallback = PRESET_ICONS[state.editingPlayerIndex % PRESET_ICONS.length];
      player.iconId = fallback.id;
      player.iconSrc = fallback.src;
      player.iconSource = "preset";
      dom.playerIconUploadInput.value = "";
      renderPlayerSetup();
    });
    dom.playerSetupBackBtn.addEventListener("click", handlePlayerSetupBack);
    dom.playerSetupContinueBtn.addEventListener("click", handlePlayerSetupContinue);
    dom.modeMultipleChoiceCard.addEventListener("click", function () {
      state.mode = "multiple-choice";
      renderModeCards();
    });
    dom.modeFreeResponseCard.addEventListener("click", function () {
      state.mode = "free-response";
      renderModeCards();
    });
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
    Array.from(dom.difficultyGrid.querySelectorAll("[data-difficulty]")).forEach(function (button) {
      button.addEventListener("click", function () {
        state.difficulty = String(button.getAttribute("data-difficulty") || "medium");
        renderDifficultyCards();
      });
    });
    Array.from(dom.gameDifficultySwitcher.querySelectorAll("[data-game-difficulty]")).forEach(function (button) {
      button.addEventListener("click", function () {
        state.difficulty = String(button.getAttribute("data-game-difficulty") || "medium");
        renderDifficultyCards();
        renderGameDifficultySwitcher();
        if (!state.spinning) {
          renderQuestionPanel();
        }
      });
    });
    dom.difficultyBackBtn.addEventListener("click", function () {
      showStep("pointsStep");
    });
    dom.difficultyContinueBtn.addEventListener("click", function () {
      showStep("categoriesStep");
    });
    dom.categoriesBackBtn.addEventListener("click", function () {
      showStep("difficultyStep");
    });
    dom.categoriesStartBtn.addEventListener("click", handleCategoriesStart);
    dom.alphabetizeOrderBtn.addEventListener("click", function () {
      state.order = getAlphabeticalOrder();
      renderOrderList();
    });
    dom.orderBackBtn.addEventListener("click", function () {
      showStep("categoriesStep");
    });
    dom.beginMatchBtn.addEventListener("click", function () {
      startMatch();
    });
    dom.spinWheelBtn.addEventListener("click", spinWheelForTurn);
    dom.wheelSpinWrap.addEventListener("click", spinWheelForTurn);
    dom.wheelSpinWrap.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        spinWheelForTurn();
      }
    });
    dom.restartSameSettingsBtn.addEventListener("click", function () {
      dom.winnerOverlay.classList.remove("is-active");
      startMatch(true);
    });
    dom.gameStartOverBtn.addEventListener("click", resetEntireTriviaFlow);
    dom.playAgainBtn.addEventListener("click", function () {
      dom.winnerOverlay.classList.remove("is-active");
      startMatch(true);
    });
    dom.winnerStartOverBtn.addEventListener("click", resetEntireTriviaFlow);
  }

  function requestFullscreenMode() {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen().catch(function () {
        return null;
      });
    }
  }

  function handlePlayerCountContinue() {
    const count = clampNumber(Number(dom.playerCountInput.value), 2, 8);
    if (!Number.isFinite(count) || count < 2) {
      setStatus(dom.playerCountStatus, "Choose at least 2 players.");
      return;
    }
    state.playerCount = count;
    rebuildPlayers(count);
    state.editingPlayerIndex = 0;
    renderPlayerSetup();
    clearStatus(dom.playerCountStatus);
    showStep("playerSetupStep");
  }

  function rebuildPlayers(count) {
    const nextPlayers = [];
    for (let index = 0; index < count; index += 1) {
      const existing = state.players[index];
      nextPlayers.push(existing ? { ...existing } : buildDefaultPlayer(index));
    }
    state.players = nextPlayers;
    if (state.editingPlayerIndex >= state.players.length) {
      state.editingPlayerIndex = Math.max(0, state.players.length - 1);
    }
    state.order = getAlphabeticalOrder();
  }

  function buildDefaultPlayer(index) {
    const preset = PRESET_ICONS[index % PRESET_ICONS.length];
    return {
      id: "player-" + (index + 1),
      name: "Player " + (index + 1),
      iconId: preset.id,
      iconSrc: preset.src,
      iconSource: "preset",
    };
  }

  function getEditingPlayer() {
    return state.players[state.editingPlayerIndex] || null;
  }

  function handlePlayerSetupBack() {
    if (state.editingPlayerIndex <= 0) {
      showStep("playerCountStep");
      return;
    }
    state.editingPlayerIndex -= 1;
    renderPlayerSetup();
    clearStatus(dom.playerSetupStatus);
  }

  function handlePlayerSetupContinue() {
    const player = getEditingPlayer();
    if (!player) {
      return;
    }
    player.name = String(player.name || "").trim() || ("Player " + (state.editingPlayerIndex + 1));
    if (!player.iconSrc) {
      const preset = PRESET_ICONS[state.editingPlayerIndex % PRESET_ICONS.length];
      player.iconId = preset.id;
      player.iconSrc = preset.src;
      player.iconSource = "preset";
    }
    clearStatus(dom.playerSetupStatus);
    if (state.editingPlayerIndex < state.players.length - 1) {
      state.editingPlayerIndex += 1;
      renderPlayerSetup();
      return;
    }
    state.order = getAlphabeticalOrder();
    renderOrderList();
    showStep("modeStep");
  }

  function renderPlayerSetup() {
    const player = getEditingPlayer();
    if (!player) {
      return;
    }
    dom.playerSetupHeading.textContent = "Player " + (state.editingPlayerIndex + 1) + " of " + state.players.length;
    dom.playerSetupSub.textContent = "Pick a name and icon for " + (player.name || ("Player " + (state.editingPlayerIndex + 1))) + ".";
    dom.playerNameInput.value = player.name || "";
    renderPlayerPreview();
    dom.playerIconGrid.innerHTML = PRESET_ICONS.map(function (icon) {
      const selected = player.iconSource === "preset" && player.iconId === icon.id ? " is-selected" : "";
      return [
        '<button class="icon-card' + selected + '" type="button" data-icon-id="' + escapeHtml(icon.id) + '">',
        '<div class="icon-art"><img src="' + escapeHtml(icon.src) + '" alt="' + escapeHtml(icon.name) + '"></div>',
        "<strong>" + escapeHtml(icon.name) + "</strong>",
        "</button>",
      ].join("");
    }).join("");
    Array.from(dom.playerIconGrid.querySelectorAll("[data-icon-id]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const playerToUpdate = getEditingPlayer();
        const iconId = String(button.getAttribute("data-icon-id") || "");
        const preset = PRESET_ICONS.find(function (item) {
          return item.id === iconId;
        });
        if (!playerToUpdate || !preset) {
          return;
        }
        playerToUpdate.iconId = preset.id;
        playerToUpdate.iconSrc = preset.src;
        playerToUpdate.iconSource = "preset";
        dom.playerIconUploadInput.value = "";
        renderPlayerSetup();
      });
    });
    scheduleFitActiveStep();
  }

  function renderPlayerPreview() {
    const player = getEditingPlayer();
    if (!player) {
      return;
    }
    dom.playerSetupPreview.src = player.iconSrc;
    dom.playerSetupPreview.alt = player.name + " icon";
  }

  function handleCustomIconUpload(event) {
    const file = event.target.files && event.target.files[0];
    const player = getEditingPlayer();
    if (!file || !player) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      player.iconSrc = String(reader.result || "");
      player.iconId = "custom-" + Date.now();
      player.iconSource = "custom";
      renderPlayerSetup();
    };
    reader.readAsDataURL(file);
  }

  function renderModeCards() {
    dom.modeMultipleChoiceCard.classList.toggle("is-selected", state.mode === "multiple-choice");
    dom.modeFreeResponseCard.classList.toggle("is-selected", state.mode === "free-response");
    scheduleFitActiveStep();
  }

  function handlePointsContinue() {
    const pointsToWin = clampNumber(Number(dom.pointsToWinInput.value), 3, 99);
    if (!Number.isFinite(pointsToWin) || pointsToWin < 3) {
      setStatus(dom.pointsStatus, "Choose a points target of at least 3.");
      return;
    }
    state.pointsToWin = pointsToWin;
    state.winByTwo = dom.winByTwoInput.checked;
    clearStatus(dom.pointsStatus);
    showStep("difficultyStep");
  }

  function renderDifficultyCards() {
    Array.from(dom.difficultyGrid.querySelectorAll("[data-difficulty]")).forEach(function (button) {
      button.classList.toggle("is-selected", String(button.getAttribute("data-difficulty")) === state.difficulty);
    });
    scheduleFitActiveStep();
  }

  function renderGameDifficultySwitcher() {
    Array.from(dom.gameDifficultySwitcher.querySelectorAll("[data-game-difficulty]")).forEach(function (button) {
      button.classList.toggle("is-selected", String(button.getAttribute("data-game-difficulty")) === state.difficulty);
    });
  }

  function renderCategoryBank() {
    dom.categoryBank.innerHTML = state.categories.map(function (category) {
      return [
        '<div class="category-pill" data-category-pill="' + escapeHtml(category) + '">',
        "<strong>" + escapeHtml(category) + "</strong>",
        '<button class="icon-btn" type="button" data-remove-category="' + escapeHtml(category) + '" aria-label="Remove ' + escapeHtml(category) + '"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>',
        "</div>",
      ].join("");
    }).join("");
    Array.from(dom.categoryBank.querySelectorAll("[data-remove-category]")).forEach(function (button) {
      button.addEventListener("click", function () {
        const category = String(button.getAttribute("data-remove-category") || "");
        state.categories = state.categories.filter(function (item) {
          return item !== category;
        });
        renderCategoryBank();
      });
    });
    scheduleFitActiveStep();
  }

  function handleCategoriesStart() {
    if (!QUESTION_BANK.length) {
      setStatus(dom.categoriesStatus, "The trivia question bank did not load.");
      return;
    }
    if (!state.categories.length) {
      setStatus(dom.categoriesStatus, "Keep at least one category in the wheel.");
      return;
    }
    clearStatus(dom.categoriesStatus);
    state.order = getAlphabeticalOrder();
    renderOrderList();
    runTransition(function () {
      showStep("orderStep");
    });
  }

  function getAlphabeticalOrder() {
    return state.players
      .slice()
      .sort(function (left, right) {
        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      })
      .map(function (player) {
        return player.id;
      });
  }

  function renderOrderList() {
    const order = state.order.length ? state.order.slice() : getAlphabeticalOrder();
    state.order = order;
    dom.orderList.innerHTML = order.map(function (playerId, index) {
      const player = getPlayerById(playerId);
      if (!player) return "";
      return [
        '<div class="order-row" data-order-player="' + escapeHtml(player.id) + '">',
        '<div class="order-index">' + (index + 1) + "</div>",
        '<div class="order-player"><img src="' + escapeHtml(player.iconSrc) + '" alt="' + escapeHtml(player.name) + ' icon"><div><strong>' + escapeHtml(player.name) + "</strong></div></div>",
        '<div class="order-move">',
        '<button class="icon-btn" type="button" data-move-up="' + escapeHtml(player.id) + '" aria-label="Move ' + escapeHtml(player.name) + ' up"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>',
        '<button class="icon-btn" type="button" data-move-down="' + escapeHtml(player.id) + '" aria-label="Move ' + escapeHtml(player.name) + ' down"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>',
        "</div>",
        "</div>",
      ].join("");
    }).join("");
    Array.from(dom.orderList.querySelectorAll("[data-move-up]")).forEach(function (button) {
      button.addEventListener("click", function () {
        moveOrderedPlayer(String(button.getAttribute("data-move-up") || ""), -1);
      });
    });
    Array.from(dom.orderList.querySelectorAll("[data-move-down]")).forEach(function (button) {
      button.addEventListener("click", function () {
        moveOrderedPlayer(String(button.getAttribute("data-move-down") || ""), 1);
      });
    });
    scheduleFitActiveStep();
  }

  function moveOrderedPlayer(playerId, direction) {
    const index = state.order.indexOf(playerId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.order.length) {
      return;
    }
    const swapped = state.order.slice();
    const temp = swapped[index];
    swapped[index] = swapped[nextIndex];
    swapped[nextIndex] = temp;
    state.order = swapped;
    renderOrderList();
  }

  function startMatch(useExistingSettings) {
    window.clearTimeout(state.spinTimer);
    state.turnIndex = 0;
    state.scores = {};
    state.usedInGameIds = [];
    state.currentCategory = "";
    state.currentQuestion = null;
    state.currentAnsweredIndex = null;
    state.questionResolved = false;
    state.showAnswer = false;
    state.winnerId = "";
    state.recycleNotice = "";
    state.spinning = false;
    if (!useExistingSettings) {
      state.order = state.order.length ? state.order.slice() : getAlphabeticalOrder();
    }
    state.players.forEach(function (player) {
      state.scores[player.id] = 0;
    });
    dom.wheelSpinWrap.style.transform = "rotate(" + state.wheelRotation + "deg)";
    dom.winnerOverlay.classList.remove("is-active");
    runTransition(function () {
      showStep("gameStep");
      renderGame();
    });
  }

  function renderGame() {
    renderGameDifficultySwitcher();
    renderScoreboard();
    renderQuestionPanel();
    drawWheel();
    renderWinnerOverlay();
    scheduleFitActiveStep();
  }

  function renderScoreboard() {
    const currentPlayerId = getCurrentPlayerId();
    dom.scoreboard.innerHTML = state.order.map(function (playerId, index) {
      const player = getPlayerById(playerId);
      if (!player) return "";
      const isTurn = playerId === currentPlayerId && !state.winnerId;
      const points = state.scores[playerId] || 0;
      return [
        '<div class="score-card' + (isTurn ? " is-turn" : "") + '">',
        '<div class="score-head"><img src="' + escapeHtml(player.iconSrc) + '" alt="' + escapeHtml(player.name) + ' icon"><div><strong>' + escapeHtml(player.name) + "</strong><div class=\"tiny-copy\">Order " + (index + 1) + "</div></div></div>",
        '<div class="score-points">' + points + "</div>",
        '<div class="tiny-copy">' + (isTurn ? "Current turn" : "Waiting") + "</div>",
        "</div>",
      ].join("");
    }).join("");
  }

  function renderQuestionPanel() {
    const currentPlayer = getCurrentPlayer();
    const judge = getJudgePlayer();
    const themeCategory = state.currentCategory || state.categories[0] || DEFAULT_CATEGORIES[0];
    applyQuestionTheme(themeCategory);
    dom.turnNumberLabel.textContent = "Turn " + (state.turnIndex + 1);
    dom.turnDifficultyLabel.textContent = formatDifficultyLabel(state.difficulty);
    dom.currentPlayerHeading.textContent = currentPlayer ? currentPlayer.name + "'s turn" : "Trivia Match";
    dom.questionModeBadge.textContent = state.mode === "multiple-choice" ? "Multiple Choice" : "Free Response";
    dom.questionCategoryBadge.textContent = state.currentCategory || "Category Wheel";
    dom.questionPoolStatus.textContent = state.recycleNotice || "";
    dom.winRuleNote.textContent = "First to " + state.pointsToWin + " points wins" + (state.winByTwo ? ", win by 2." : ".");
    dom.multipleChoiceGrid.innerHTML = "";
    dom.questionActions.innerHTML = "";
    dom.answerPanel.hidden = true;
    dom.answerText.textContent = "";
    dom.answerExplanation.textContent = "";
    dom.judgeNote.hidden = true;
    dom.spinWheelBtn.disabled = state.spinning || !!state.winnerId;
    dom.wheelSpinWrap.classList.toggle("is-disabled", state.spinning || !!state.winnerId);
    dom.wheelSpinWrap.setAttribute("aria-disabled", state.spinning || !!state.winnerId ? "true" : "false");
    dom.wheelSpinWrap.style.transform = "rotate(" + state.wheelRotation + "deg)";

    if (state.winnerId) {
      dom.gameInstruction.textContent = "The match is over.";
    } else if (state.spinning) {
      dom.gameInstruction.textContent = "Spinning for a random category...";
    } else if (!state.currentQuestion) {
      dom.gameInstruction.textContent = "Spin the category wheel to begin.";
    } else if (state.mode === "multiple-choice" && !state.questionResolved) {
      dom.gameInstruction.textContent = "Choose the best answer.";
    } else if (state.mode === "free-response" && !state.questionResolved) {
      dom.gameInstruction.textContent = "Let the next player read the question and decide if the answer earns the point.";
    } else {
      dom.gameInstruction.textContent = state.winnerId ? "Match complete." : "Advance when everyone is ready.";
    }

    if (!state.currentQuestion) {
      dom.wheelResult.textContent = state.currentCategory ? state.currentCategory + " selected." : "Ready to spin.";
      dom.questionPrompt.textContent = "Spin the wheel to reveal the next question.";
      dom.questionSubPrompt.textContent = "Each turn pulls a random category from your chosen pool.";
      return;
    }

    dom.wheelResult.textContent = state.currentCategory + " selected.";
    dom.questionPrompt.textContent = state.currentQuestion.prompt;
    dom.questionSubPrompt.textContent = "Difficulty: " + formatDifficultyLabel(state.currentQuestion.difficulty) + ".";

    if (state.mode === "free-response") {
      dom.judgeNote.hidden = false;
      dom.judgeNote.textContent = judge
        ? judge.name + " reads this prompt for " + currentPlayer.name + "."
        : "The next player judges the answer.";
    }

    if (state.mode === "multiple-choice") {
      renderMultipleChoiceQuestion();
    } else {
      renderFreeResponseQuestion();
    }
  }

  function renderMultipleChoiceQuestion() {
    const question = state.currentQuestion;
    dom.multipleChoiceGrid.innerHTML = question.choices.map(function (choice, index) {
      let stateClass = "";
      if (state.questionResolved) {
        if (index === question.answerIndex) {
          stateClass = " is-correct";
        } else if (index === state.currentAnsweredIndex) {
          stateClass = " is-wrong";
        }
      }
      return '<button class="mc-option' + stateClass + '" type="button" data-answer-index="' + index + '">' + escapeHtml(choice) + "</button>";
    }).join("");
    Array.from(dom.multipleChoiceGrid.querySelectorAll("[data-answer-index]")).forEach(function (button) {
      button.disabled = state.questionResolved;
      button.addEventListener("click", function () {
        if (state.questionResolved || state.spinning) {
          return;
        }
        const selectedIndex = Number(button.getAttribute("data-answer-index"));
        state.currentAnsweredIndex = selectedIndex;
        state.questionResolved = true;
        state.showAnswer = true;
        if (selectedIndex === state.currentQuestion.answerIndex) {
          awardPointToCurrentPlayer();
        }
        renderGame();
      });
    });
    if (state.showAnswer || state.questionResolved) {
      renderAnswerPanel();
      renderAdvanceButton();
    }
  }

  function renderFreeResponseQuestion() {
    if (state.showAnswer || state.questionResolved) {
      renderAnswerPanel();
    }
    if (!state.questionResolved) {
      dom.questionActions.innerHTML = [
        '<button class="btn-secondary" type="button" data-free-action="reveal"><i class="fa-solid fa-eye" aria-hidden="true"></i><span>Reveal Answer</span></button>',
        '<button class="btn" type="button" data-free-action="correct"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Award Point</span></button>',
        '<button class="btn-ghost" type="button" data-free-action="wrong"><i class="fa-solid fa-circle-xmark" aria-hidden="true"></i><span>No Point</span></button>',
      ].join("");
      Array.from(dom.questionActions.querySelectorAll("[data-free-action]")).forEach(function (button) {
        button.addEventListener("click", function () {
          const action = String(button.getAttribute("data-free-action") || "");
          if (action === "reveal") {
            state.showAnswer = true;
            renderGame();
            return;
          }
          state.questionResolved = true;
          state.showAnswer = true;
          if (action === "correct") {
            awardPointToCurrentPlayer();
          }
          renderGame();
        });
      });
      return;
    }
    renderAdvanceButton();
  }

  function renderAnswerPanel() {
    dom.answerPanel.hidden = false;
    dom.answerHeading.textContent = state.mode === "multiple-choice" ? "Correct answer" : "Official answer";
    dom.answerText.textContent = state.currentQuestion.choices[state.currentQuestion.answerIndex];
    dom.answerExplanation.textContent = state.currentQuestion.explanation || "";
  }

  function renderAdvanceButton() {
    if (state.winnerId) {
      dom.questionActions.innerHTML = '<button class="btn" type="button" data-show-winner="true"><i class="fa-solid fa-trophy" aria-hidden="true"></i><span>Show Winner</span></button>';
      const winnerButton = dom.questionActions.querySelector("[data-show-winner]");
      if (winnerButton) {
        winnerButton.addEventListener("click", function () {
          renderWinnerOverlay();
        });
      }
      return;
    }
    dom.questionActions.innerHTML = '<button class="btn" type="button" data-next-turn="true"><i class="fa-solid fa-forward" aria-hidden="true"></i><span>Next Turn</span></button>';
    const nextButton = dom.questionActions.querySelector("[data-next-turn]");
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        advanceTurn();
      });
    }
  }

  function awardPointToCurrentPlayer() {
    const playerId = getCurrentPlayerId();
    if (!playerId) {
      return;
    }
    state.scores[playerId] = (state.scores[playerId] || 0) + 1;
    if (isWinningScore(playerId)) {
      state.winnerId = playerId;
    }
  }

  function isWinningScore(playerId) {
    const score = state.scores[playerId] || 0;
    if (score < state.pointsToWin) {
      return false;
    }
    if (!state.winByTwo) {
      return true;
    }
    const otherScores = state.order
      .filter(function (id) { return id !== playerId; })
      .map(function (id) { return state.scores[id] || 0; });
    const highestOther = otherScores.length ? Math.max.apply(null, otherScores) : 0;
    return score - highestOther >= 2;
  }

  function advanceTurn() {
    if (state.winnerId) {
      renderWinnerOverlay();
      return;
    }
    state.turnIndex = (state.turnIndex + 1) % Math.max(state.order.length, 1);
    state.currentCategory = "";
    state.currentQuestion = null;
    state.currentAnsweredIndex = null;
    state.questionResolved = false;
    state.showAnswer = false;
    state.recycleNotice = "";
    renderGame();
  }

  function spinWheelForTurn() {
    if (state.spinning || state.winnerId || !state.categories.length) {
      return;
    }
    const categoryIndex = Math.floor(Math.random() * state.categories.length);
    const category = state.categories[categoryIndex];
    const question = chooseQuestion(category, state.difficulty);
    if (!question) {
      state.recycleNotice = "No questions are available for " + category + " on " + formatDifficultyLabel(state.difficulty) + ".";
      renderGame();
      return;
    }

    state.spinning = true;
    state.currentCategory = "";
    state.currentQuestion = null;
    state.currentAnsweredIndex = null;
    state.questionResolved = false;
    state.showAnswer = false;
    const anglePer = 360 / state.categories.length;
    const desiredRotation = normalizeRotation(360 - ((categoryIndex * anglePer) + (anglePer / 2)));
    const currentRotation = normalizeRotation(state.wheelRotation);
    const deltaRotation = normalizeRotation(desiredRotation - currentRotation);
    state.wheelRotation += 1440 + deltaRotation;
    renderGame();

    window.clearTimeout(state.spinTimer);
    state.spinTimer = window.setTimeout(function () {
      state.spinning = false;
      state.currentCategory = category;
      state.currentQuestion = question;
      state.recycleNotice = question.recycleNotice || "";
      renderGame();
    }, 1550);
  }

  function chooseQuestion(category, difficulty) {
    const matchingQuestions = QUESTION_BANK.filter(function (question) {
      return question.category === category && question.difficulty === difficulty;
    });
    if (!matchingQuestions.length) {
      return null;
    }

    let usedIds = new Set(loadUsedQuestionIds());
    const inGame = new Set(state.usedInGameIds);
    let candidates = matchingQuestions.filter(function (question) {
      return !usedIds.has(question.id) && !inGame.has(question.id);
    });
    let recycleNotice = "";

    if (!candidates.length) {
      const recycledIds = new Set(matchingQuestions.map(function (question) {
        return question.id;
      }));
      usedIds = new Set(Array.from(usedIds).filter(function (id) {
        return !recycledIds.has(id);
      }));
      saveUsedQuestionIds(Array.from(usedIds));
      recycleNotice = "That " + category + " pool was exhausted, so it has been refreshed.";
      candidates = matchingQuestions.filter(function (question) {
        return !usedIds.has(question.id) && !inGame.has(question.id);
      });
    }

    if (!candidates.length) {
      candidates = matchingQuestions.filter(function (question) {
        return !inGame.has(question.id);
      });
    }

    if (!candidates.length) {
      return null;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(selected.id);
    saveUsedQuestionIds(Array.from(usedIds));
    state.usedInGameIds.push(selected.id);
    return {
      ...selected,
      recycleNotice: recycleNotice,
    };
  }

  function loadUsedQuestionIds() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.usedQuestionIds) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveUsedQuestionIds(ids) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.usedQuestionIds, JSON.stringify(ids));
    } catch (_error) {
      return;
    }
  }

  function getCurrentPlayerId() {
    return state.order[state.turnIndex] || "";
  }

  function getCurrentPlayer() {
    return getPlayerById(getCurrentPlayerId());
  }

  function getJudgePlayer() {
    if (state.order.length <= 1) {
      return null;
    }
    const judgeIndex = (state.turnIndex + 1) % state.order.length;
    return getPlayerById(state.order[judgeIndex]);
  }

  function getPlayerById(playerId) {
    return state.players.find(function (player) {
      return player.id === playerId;
    }) || null;
  }

  function showStep(stepId) {
    [
      dom.landingStep,
      dom.playerCountStep,
      dom.playerSetupStep,
      dom.modeStep,
      dom.pointsStep,
      dom.difficultyStep,
      dom.categoriesStep,
      dom.orderStep,
      dom.gameStep,
    ].forEach(function (step) {
      if (!step) return;
      step.classList.toggle("is-active", step.id === stepId);
    });
    state.currentStep = stepId;
    document.body.classList.toggle("trivia-subpage-active", stepId !== "landingStep");
    document.documentElement.classList.toggle("trivia-immersive", stepId !== "landingStep" || !!document.fullscreenElement);
    scheduleFitActiveStep();
  }

  function enterImmersiveMode() {
    document.documentElement.classList.add("trivia-immersive");
    document.body.classList.add("trivia-subpage-active");
  }

  function syncImmersiveState() {
    const shouldHideChrome = state.currentStep !== "landingStep" || !!document.fullscreenElement;
    document.documentElement.classList.toggle("trivia-immersive", shouldHideChrome);
    document.body.classList.toggle("trivia-subpage-active", shouldHideChrome);
  }

  function scheduleFitActiveStep() {
    window.cancelAnimationFrame(state.fitFrame);
    state.fitFrame = window.requestAnimationFrame(fitActiveStep);
  }

  function fitActiveStep() {
    const activeStep = document.querySelector(".step.is-active");
    const container = document.querySelector(".content-inner");
    if (!activeStep || !container) {
      return;
    }

    activeStep.style.removeProperty("--fit-scale");
    activeStep.style.removeProperty("--fit-width");

    const availableHeight = Math.max(320, container.clientHeight - 2);
    const naturalHeight = activeStep.scrollHeight;
    const scale = Math.max(0.68, Math.min(1, availableHeight / Math.max(1, naturalHeight)));

    activeStep.style.setProperty("--fit-scale", scale.toFixed(4));
    activeStep.style.setProperty("--fit-width", (100 / scale).toFixed(4) + "%");
  }

  function runTransition(callback) {
    dom.transitionOverlay.classList.add("is-active");
    window.clearTimeout(state.transitionTimer);
    state.transitionTimer = window.setTimeout(function () {
      dom.transitionOverlay.classList.remove("is-active");
      callback();
    }, 900);
  }

  function drawWheel() {
    const canvas = dom.categoryWheelCanvas;
    if (!canvas) {
      return;
    }
    const categories = state.categories.length ? state.categories : DEFAULT_CATEGORIES;
    const context = canvas.getContext("2d");
    const cssSize = Math.round(canvas.getBoundingClientRect().width || 320);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssSize, cssSize);

    const center = cssSize / 2;
    const radius = cssSize / 2;
    const anglePer = (Math.PI * 2) / categories.length;

    categories.forEach(function (category, index) {
      const startAngle = (-Math.PI / 2) + (anglePer * index);
      const endAngle = startAngle + anglePer;
      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, startAngle, endAngle);
      context.closePath();
      context.fillStyle = getCategoryColor(category);
      context.fill();

      context.save();
      context.translate(center, center);
      context.rotate(startAngle + (anglePer / 2));
      context.textAlign = "right";
      context.fillStyle = "#091016";
      context.font = "800 " + Math.max(12, cssSize * 0.042) + "px Avenir Next, Segoe UI, Arial";
      context.fillText(category, radius - 20, 6);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, radius * 0.23, 0, Math.PI * 2);
    context.fillStyle = "#0a1118";
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = "rgba(255,255,255,0.16)";
    context.stroke();
  }

  function renderWinnerOverlay() {
    const winner = getPlayerById(state.winnerId);
    if (!winner) {
      dom.winnerOverlay.classList.remove("is-active");
      return;
    }
    dom.winnerOverlay.classList.add("is-active");
    dom.winnerIcon.src = winner.iconSrc;
    dom.winnerIcon.alt = winner.name + " icon";
    dom.winnerHeading.textContent = winner.name + " wins!";
    dom.winnerSummary.textContent = winner.name + " reached " + state.scores[winner.id] + " point" + (state.scores[winner.id] === 1 ? "" : "s") + " first.";
  }

  function resetEntireTriviaFlow() {
    window.clearTimeout(state.spinTimer);
    window.clearTimeout(state.transitionTimer);
    dom.transitionOverlay.classList.remove("is-active");
    dom.winnerOverlay.classList.remove("is-active");
    state.playerCount = 2;
    state.editingPlayerIndex = 0;
    state.mode = "multiple-choice";
    state.pointsToWin = 11;
    state.winByTwo = true;
    state.difficulty = "medium";
    state.categories = DEFAULT_CATEGORIES.slice();
    state.order = [];
    state.turnIndex = 0;
    state.scores = {};
    state.currentCategory = "";
    state.currentQuestion = null;
    state.currentAnsweredIndex = null;
    state.questionResolved = false;
    state.showAnswer = false;
    state.winnerId = "";
    state.recycleNotice = "";
    state.spinning = false;
    state.usedInGameIds = [];
    dom.playerCountInput.value = "2";
    dom.pointsToWinInput.value = "11";
    dom.winByTwoInput.checked = true;
    rebuildPlayers(2);
    renderPlayerSetup();
    renderModeCards();
    renderDifficultyCards();
    renderGameDifficultySwitcher();
    renderCategoryBank();
    renderOrderList();
    renderGame();
    showStep("landingStep");
  }

  function setStatus(element, message) {
    if (element) {
      element.textContent = message || "";
    }
  }

  function clearStatus(element) {
    if (element) {
      element.textContent = "";
    }
  }

  function formatDifficultyLabel(value) {
    const lower = String(value || "").toLowerCase();
    return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : "Medium";
  }

  function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getCategoryColor(category) {
    return CATEGORY_META[category]?.color || "#70c9ff";
  }

  function applyQuestionTheme(category) {
    if (!dom.questionCard) {
      return;
    }
    const accent = getCategoryColor(category);
    dom.questionCard.style.setProperty("--question-accent", accent);
    dom.questionCard.style.setProperty("--question-accent-soft", rgbaFromHex(accent, 0.14));
    dom.questionCard.style.setProperty("--question-accent-border", rgbaFromHex(accent, 0.28));
    dom.questionCard.style.setProperty("--question-accent-ink", mixHex(accent, "#11161d", 0.58));
  }

  function normalizeRotation(value) {
    return ((value % 360) + 360) % 360;
  }

  function rgbaFromHex(hex, alpha) {
    const rgb = hexToRgb(hex);
    return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ")";
  }

  function mixHex(hex, targetHex, weight) {
    const base = hexToRgb(hex);
    const target = hexToRgb(targetHex);
    const clampedWeight = Math.min(Math.max(weight, 0), 1);
    const r = Math.round((base.r * clampedWeight) + (target.r * (1 - clampedWeight)));
    const g = Math.round((base.g * clampedWeight) + (target.g * (1 - clampedWeight)));
    const b = Math.round((base.b * clampedWeight) + (target.b * (1 - clampedWeight)));
    return rgbToHex(r, g, b);
  }

  function hexToRgb(hex) {
    const normalized = String(hex || "").replace("#", "");
    const expanded = normalized.length === 3
      ? normalized.split("").map(function (char) { return char + char; }).join("")
      : normalized;
    const safe = expanded.padEnd(6, "0").slice(0, 6);
    return {
      r: parseInt(safe.slice(0, 2), 16),
      g: parseInt(safe.slice(2, 4), 16),
      b: parseInt(safe.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (value) {
      return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    }).join("");
  }

  function svgAvatar(kind, primary, secondary, accent, earStyle, label) {
    const earShapes = {
      triangle: '<path d="M34 18 46 38 24 38Z" fill="' + primary + '"/><path d="M94 18 104 38 84 38Z" fill="' + primary + '"/>',
      cat: '<path d="M34 18 46 40 24 38Z" fill="' + primary + '"/><path d="M94 18 104 38 84 40Z" fill="' + primary + '"/>',
      bear: '<circle cx="34" cy="32" r="14" fill="' + primary + '"/><circle cx="94" cy="32" r="14" fill="' + primary + '"/>',
      round: '<circle cx="34" cy="28" r="15" fill="' + primary + '"/><circle cx="94" cy="28" r="15" fill="' + primary + '"/>',
      owl: '<path d="M32 24c4-10 20-10 24 0" stroke="' + primary + '" stroke-width="10" stroke-linecap="round"/><path d="M76 24c4-10 20-10 24 0" stroke="' + primary + '" stroke-width="10" stroke-linecap="round"/>',
      bunny: '<rect x="24" y="4" width="18" height="40" rx="9" fill="' + primary + '"/><rect x="86" y="4" width="18" height="40" rx="9" fill="' + primary + '"/>',
      penguin: '<path d="M34 20c8-10 18-10 26 0" stroke="' + primary + '" stroke-width="10" stroke-linecap="round"/><path d="M72 20c8-10 18-10 26 0" stroke="' + primary + '" stroke-width="10" stroke-linecap="round"/>',
      dog: '<path d="M18 28c10-14 24-16 28 0" fill="' + primary + '"/><path d="M82 28c4-16 18-14 28 0" fill="' + primary + '"/>',
    };
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="' + label + ' icon">',
      '<rect width="128" height="128" rx="28" fill="#101924"/>',
      '<circle cx="64" cy="78" r="44" fill="' + primary + '"/>',
      earShapes[earStyle] || "",
      '<circle cx="64" cy="84" r="24" fill="' + secondary + '"/>',
      '<circle cx="48" cy="72" r="5" fill="' + accent + '"/>',
      '<circle cx="80" cy="72" r="5" fill="' + accent + '"/>',
      kind === "frog"
        ? '<circle cx="44" cy="58" r="12" fill="#efffe5"/><circle cx="84" cy="58" r="12" fill="#efffe5"/><circle cx="44" cy="58" r="4" fill="' + accent + '"/><circle cx="84" cy="58" r="4" fill="' + accent + '"/>'
        : "",
      kind === "penguin"
        ? '<path d="M58 80h12l-6 10z" fill="#ffcb67"/>'
        : '<circle cx="64" cy="84" r="4" fill="' + accent + '"/>',
      '<path d="M50 98c6 6 22 6 28 0" fill="none" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/>',
      '</svg>',
    ].join("");
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }
})();
