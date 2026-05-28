import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CATEGORY_CONFIG = [
  { label: "Music", key: "music", sources: ["music"], otdbCategories: [12] },
  { label: "Sports", key: "sports", sources: ["sports"], otdbCategories: [21] },
  { label: "Movies & TV", key: "movies-tv", sources: ["movies", "television"], otdbCategories: [11, 14] },
  { label: "History", key: "history", sources: ["history"], otdbCategories: [23] },
  { label: "Science", key: "science", sources: ["science-technology"], otdbCategories: [17] },
  { label: "Geography", key: "geography", sources: ["geography", "world"], otdbCategories: [22] },
];

const DIFFICULTIES = ["easy", "medium", "hard", "impossible"];
const QUESTIONS_PER_DIFFICULTY = 200;
const SOURCE_ROOT = "https://raw.githubusercontent.com/uberspot/OpenTriviaQA/master/categories/";
const OPENTDB_AMOUNT = 50;

const GLOBAL_HARD_PATTERNS = [
  /\blyrics?\b/i,
  /\bthese lines\b/i,
  /\bquote\b/i,
  /\bmondegreen\b/i,
  /\bmiddle initial\b/i,
  /\boriginal voice\b/i,
  /\bdebut\b/i,
  /\bpremiere\b/i,
  /\bwhat year\b/i,
  /\bwhen did\b/i,
  /\bwhen was\b/i,
  /\bin what year\b/i,
  /\bhow many\b/i,
  /\bfinal score\b/i,
  /\bfirst .* player\b/i,
  /\blast .* player\b/i,
  /\bwhich member\b/i,
  /\bwhich single\b/i,
  /\bwhich cover song\b/i,
  /\bwhat was the nickname\b/i,
  /\bhow many emmys\b/i,
  /\bhow many grammys\b/i,
  /\bwhat piece is catalogued\b/i,
  /\bbacking band\b/i,
];

const GLOBAL_EASY_REJECT_PATTERNS = [
  /\bwhich of the following did not\b/i,
  /\bwhich of these was not\b/i,
  /\bexcept\b/i,
  /\bnot neutral\b/i,
  /\bmiddle initial\b/i,
  /\bdebut\b/i,
  /\bpremiere\b/i,
  /\boriginal voice\b/i,
  /\blyrics?\b/i,
  /\bthese lines\b/i,
  /\bquote\b/i,
  /\bhow many awards\b/i,
  /\bhow many emmys\b/i,
  /\bhow many grammys\b/i,
  /\bwhat year\b/i,
  /\bwhen did\b/i,
  /\bwhen was\b/i,
  /\bin what year\b/i,
  /\bwho was the first\b/i,
  /\bwho was the last\b/i,
  /\bwhat was the first\b/i,
  /\bwho directed\b/i,
  /\bwho plays?\b/i,
  /\bhow old was\b/i,
];

const CATEGORY_TUNING = {
  Music: {
    easyHints: [
      /\bking of pop\b/i,
      /\bbeatles\b/i,
      /\badele\b/i,
      /\btaylor swift\b/i,
      /\bqueen\b/i,
      /\bfreddie mercury\b/i,
      /\bdolly parton\b/i,
      /\bpiano\b/i,
      /\bbeethoven\b/i,
      /\bmozart\b/i,
      /\bwho wrote\b/i,
      /\bwhich instrument\b/i,
      /\bwhich singer\b/i,
    ],
    hardHints: [
      /\bwhich single\b/i,
      /\bwhich member\b/i,
      /\bcover song\b/i,
      /\blead vocalist\b/i,
      /\bgrammy\b/i,
      /\bjoined\b/i,
      /\bbacking band\b/i,
      /\bcatalogued\b/i,
    ],
  },
  Sports: {
    easyHints: [
      /\bsuper bowl\b/i,
      /\bworld cup\b/i,
      /\bwhich nfl team\b/i,
      /\bwhich team won\b/i,
      /\bin golf\b/i,
      /\btriathlon\b/i,
      /\bfree throw\b/i,
      /\btouchdown\b/i,
      /\bwimbledon\b/i,
      /\bfifa\b/i,
      /\bstanley cup\b/i,
      /\bmichael jordan\b/i,
    ],
    hardHints: [
      /\bmake his .* debut\b/i,
      /\bwhere was the first\b/i,
      /\boriginally from\b/i,
      /\bwhat year\b/i,
      /\bfirst major league baseball player from japan\b/i,
      /\bwith which team\b/i,
      /\bnickname of .* during\b/i,
      /\bwhen was the first\b/i,
    ],
  },
  "Movies & TV": {
    easyHints: [
      /\bharry potter\b/i,
      /\btoy story\b/i,
      /\bthe simpsons\b/i,
      /\bavatar\b/i,
      /\biron man\b/i,
      /\bthe office\b/i,
      /\binside out\b/i,
      /\bjack sparrow\b/i,
      /\bmarvel\b/i,
    ],
    hardHints: [
      /\bwhat year did .* premiere\b/i,
      /\bmiddle initial\b/i,
      /\bwho directed\b/i,
      /\bwho plays?\b/i,
      /\bwho played .* on the television show\b/i,
      /\bhow many emmys\b/i,
      /\boriginal voice\b/i,
      /\bwhat was the last name of the featured family\b/i,
    ],
  },
  History: {
    easyHints: [
      /\bfirst president of the united states\b/i,
      /\bberlin wall\b/i,
      /\btitanic\b/i,
      /\bstatue of liberty\b/i,
      /\bmartin luther king\b/i,
      /\bmagn[a|o] carta\b/i,
      /\baugustus\b/i,
      /\bversailles\b/i,
      /\bbastille\b/i,
    ],
    hardHints: [
      /\bfull metal jacket\b/i,
      /\bpanasonic\b/i,
      /\bvhs\b/i,
      /\blight year\b/i,
      /\bwhat was the first sport\b/i,
      /\bhow old was\b/i,
      /\bcambrian\b/i,
      /\bprovincial regions\b/i,
      /\bwhich wars were fought\b/i,
    ],
  },
  Science: {
    easyHints: [
      /\bred planet\b/i,
      /\bphotosynthesis\b/i,
      /\bh2o\b/i,
      /\bgravity\b/i,
      /\bdouble helix\b/i,
      /\bpowerhouse of the cell\b/i,
      /\bohm\b/i,
      /\bdiamond\b/i,
      /\bozone\b/i,
      /\bwhat is the symbol for\b/i,
    ],
    hardHints: [
      /\bastrology\b/i,
      /\bmost rare disease\b/i,
      /\bonly has molars\b/i,
      /\bwhich domain is used\b/i,
      /\bhow much does human hair grow\b/i,
      /\bcranial nerve\b/i,
      /\bavogadro\b/i,
    ],
  },
  Geography: {
    easyHints: [
      /\bcapital of\b/i,
      /\blargest ocean\b/i,
      /\bwhich continent\b/i,
      /\bnile\b/i,
      /\bmount everest\b/i,
      /\bequator\b/i,
      /\bnew zealand\b/i,
      /\bbering strait\b/i,
      /\bwhich country completely surrounds\b/i,
    ],
    hardHints: [
      /\bstate flower\b/i,
      /\bfirst bills\b/i,
      /\buniversity of .* nickname\b/i,
      /\bwar governors conference\b/i,
      /\bwhat type of food\b/i,
      /\bpopular swedish dish\b/i,
    ],
  },
};

async function main() {
  const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "question-bank.js");
  const summary = [];
  const allQuestions = [];
  const triviaToken = await requestOpenTdbToken();

  for (const category of CATEGORY_CONFIG) {
    const qaSourceRecords = [];
    for (const sourceName of category.sources) {
      const raw = await fetchText(SOURCE_ROOT + sourceName);
      qaSourceRecords.push(...parseOpenTriviaBlocks(raw, sourceName));
    }

    const otdbRawRecords = await fetchOpenTdbQuestions(category, triviaToken);
    const mergedRecords = mergeNormalizedRecords(category, qaSourceRecords, otdbRawRecords);
    const bucketed = assignDifficultyBuckets(mergedRecords, category);

    DIFFICULTIES.forEach(function (difficulty) {
      summary.push(category.label + " / " + difficulty + ": " + bucketed[difficulty].length);
      allQuestions.push(...bucketed[difficulty]);
    });
  }

  await writeFile(outputPath, buildQuestionBankJs(allQuestions), "utf8");

  console.log("Wrote " + allQuestions.length + " tuned trivia questions to " + outputPath);
  summary.forEach(function (line) {
    console.log(" - " + line);
  });
}

async function requestOpenTdbToken() {
  const response = await fetchJson("https://opentdb.com/api_token.php?command=request");
  if (!response || response.response_code !== 0 || !response.token) {
    throw new Error("Failed to get an Open Trivia DB session token.");
  }
  return response.token;
}

async function fetchOpenTdbQuestions(category, token) {
  const records = [];
  for (const categoryId of category.otdbCategories) {
    for (const difficulty of ["easy", "medium", "hard"]) {
      let exhausted = false;
      while (!exhausted) {
        const url =
          "https://opentdb.com/api.php?amount=" +
          OPENTDB_AMOUNT +
          "&type=multiple&category=" +
          categoryId +
          "&difficulty=" +
          difficulty +
          "&token=" +
          token;

        const payload = await fetchJson(url);
        if (!payload || typeof payload.response_code !== "number") {
          throw new Error("Unexpected Open Trivia DB response for " + category.label + " / " + difficulty + ".");
        }

        if (payload.response_code === 4) {
          exhausted = true;
          continue;
        }

        if (payload.response_code !== 0) {
          throw new Error(
            "Open Trivia DB returned response code " +
              payload.response_code +
              " for " +
              category.label +
              " / " +
              difficulty +
              "."
          );
        }

        const results = Array.isArray(payload.results) ? payload.results : [];
        results.forEach(function (item, index) {
          records.push({
            sourceType: "opentdb",
            sourceName: "opentdb-" + categoryId + "-" + difficulty,
            difficultyHint: difficulty,
            prompt: decodeHtml(cleanText(item.question)),
            answer: decodeHtml(cleanText(item.correct_answer)),
            choices: [item.correct_answer].concat(item.incorrect_answers || []).map(function (choice) {
              return decodeHtml(cleanText(choice));
            }),
            fetchIndex: index,
          });
        });

        if (results.length < OPENTDB_AMOUNT) {
          exhausted = true;
        }

        await sleep(350);
      }
    }
  }
  return records;
}

function mergeNormalizedRecords(category, qaRecords, otdbRecords) {
  const dedupe = new Map();

  normalizeRecords(otdbRecords, category).forEach(function (record) {
    const key = buildRecordKey(record.prompt, record.answer);
    dedupe.set(key, record);
  });

  normalizeRecords(qaRecords, category).forEach(function (record) {
    const key = buildRecordKey(record.prompt, record.answer);
    if (!dedupe.has(key)) {
      dedupe.set(key, record);
    }
  });

  return Array.from(dedupe.values());
}

function normalizeRecords(records, category) {
  return records
    .map(function (record) {
      return normalizeRecord(record, category);
    })
    .filter(Boolean);
}

function normalizeRecord(record, category) {
  const prompt = cleanText(record.prompt);
  const answer = cleanText(record.answer);

  if (!prompt || !answer || prompt.length < 8) {
    return null;
  }

  const rawChoices = Array.isArray(record.choices) ? record.choices : [];
  const uniqueChoices = [];
  const seenChoices = new Set();

  rawChoices.forEach(function (choice) {
    const cleaned = cleanText(choice);
    if (!cleaned) {
      return;
    }
    const key = normalizeForCompare(cleaned);
    if (seenChoices.has(key)) {
      return;
    }
    seenChoices.add(key);
    uniqueChoices.push(cleaned);
  });

  const answerKey = normalizeForCompare(answer);
  const distractors = uniqueChoices.filter(function (choice) {
    return normalizeForCompare(choice) !== answerKey;
  });

  if (distractors.length < 3) {
    return null;
  }

  const selectedDistractors = deterministicShuffle(
    distractors,
    category.key + "::" + prompt + "::distractors"
  ).slice(0, 3);

  if (selectedDistractors.length < 3) {
    return null;
  }

  const finalizedChoices = deterministicShuffle(
    [answer].concat(selectedDistractors),
    category.key + "::" + prompt + "::choices"
  );
  const answerIndex = finalizedChoices.findIndex(function (choice) {
    return normalizeForCompare(choice) === answerKey;
  });

  if (answerIndex < 0) {
    return null;
  }

  const sourceType = record.sourceType || "qa";
  const sourceHint = sourceType === "opentdb" ? String(record.difficultyHint || "") : "";
  const difficultyScore = computeDifficultyScore(category, prompt, answer, finalizedChoices, sourceType, sourceHint);

  return {
    category: category.label,
    prompt,
    answer,
    choices: finalizedChoices,
    answerIndex,
    explanation: "",
    sourceType,
    sourceName: record.sourceName || sourceType,
    difficultyHint: sourceHint,
    difficultyScore,
    easyAllowed: isAllowedForEasy(category, prompt),
  };
}

function assignDifficultyBuckets(records, category) {
  const otdbByDifficulty = {
    easy: sortByDifficultyAscending(records.filter(bySourceDifficulty("opentdb", "easy"))),
    medium: sortByDifficultyAscending(records.filter(bySourceDifficulty("opentdb", "medium"))),
    hard: sortByDifficultyAscending(records.filter(bySourceDifficulty("opentdb", "hard"))),
  };

  const qaRecords = sortByDifficultyAscending(records.filter(function (record) {
    return record.sourceType === "qa";
  }));

  const qaEasy = qaRecords.filter(function (record) {
    return record.easyAllowed;
  });
  const qaMedium = sortByDistanceFromMedian(qaRecords, 78);
  const qaHard = sortByDifficultyDescending(qaRecords.filter(function (record) {
    return record.difficultyScore >= 70;
  }));
  const qaImpossible = sortByDifficultyDescending(qaRecords.filter(function (record) {
    return record.difficultyScore >= 92;
  }));

  const chosenKeys = new Set();
  const chosenByDifficulty = {};

  chosenByDifficulty.easy = buildBucket(
    category,
    "easy",
    [
      otdbByDifficulty.easy,
      sortByDifficultyAscending(otdbByDifficulty.medium),
      qaEasy,
      sortByDifficultyAscending(qaRecords),
      sortByDifficultyAscending(otdbByDifficulty.hard),
    ],
    chosenKeys
  );

  chosenByDifficulty.medium = buildBucket(
    category,
    "medium",
    [
      sortByDifficultyAscending(otdbByDifficulty.medium),
      qaMedium,
      sortByDifficultyAscending(otdbByDifficulty.easy),
      sortByDifficultyAscending(otdbByDifficulty.hard),
      sortByDistanceFromMedian(qaRecords, 82),
    ],
    chosenKeys
  );

  chosenByDifficulty.hard = buildBucket(
    category,
    "hard",
    [
      sortByDifficultyDescending(otdbByDifficulty.hard),
      qaHard,
      sortByDifficultyDescending(otdbByDifficulty.medium),
      sortByDifficultyDescending(qaRecords),
    ],
    chosenKeys
  );

  chosenByDifficulty.impossible = buildBucket(
    category,
    "impossible",
    [
      qaImpossible,
      sortByDifficultyDescending(qaRecords),
      sortByDifficultyDescending(otdbByDifficulty.hard),
      sortByDifficultyDescending(otdbByDifficulty.medium),
    ],
    chosenKeys
  );

  return chosenByDifficulty;
}

function buildBucket(category, difficulty, candidateLists, chosenKeys) {
  const selected = [];

  candidateLists.forEach(function (list) {
    list.forEach(function (record) {
      if (selected.length >= QUESTIONS_PER_DIFFICULTY) {
        return;
      }
      const key = buildRecordKey(record.prompt, record.answer);
      if (chosenKeys.has(key)) {
        return;
      }
      chosenKeys.add(key);
      selected.push(record);
    });
  });

  if (selected.length < QUESTIONS_PER_DIFFICULTY) {
    throw new Error(
      category.label +
        " could only fill " +
        selected.length +
        " " +
        difficulty +
        " questions after tuning."
    );
  }

  return selected.slice(0, QUESTIONS_PER_DIFFICULTY).map(function (record, index) {
    return {
      id: category.key + "-" + difficulty + "-" + String(index + 1).padStart(3, "0"),
      category: category.label,
      difficulty,
      prompt: record.prompt,
      choices: record.choices,
      answerIndex: record.answerIndex,
      explanation: record.explanation,
    };
  });
}

function bySourceDifficulty(sourceType, difficultyHint) {
  return function (record) {
    return record.sourceType === sourceType && record.difficultyHint === difficultyHint;
  };
}

function sortByDifficultyAscending(records) {
  return records.slice().sort(function (left, right) {
    if (left.difficultyScore !== right.difficultyScore) {
      return left.difficultyScore - right.difficultyScore;
    }
    return compareByHash(left.prompt + "::" + left.answer, right.prompt + "::" + right.answer);
  });
}

function sortByDifficultyDescending(records) {
  return records.slice().sort(function (left, right) {
    if (left.difficultyScore !== right.difficultyScore) {
      return right.difficultyScore - left.difficultyScore;
    }
    return compareByHash(left.prompt + "::" + left.answer, right.prompt + "::" + right.answer);
  });
}

function sortByDistanceFromMedian(records, targetScore) {
  return records.slice().sort(function (left, right) {
    const leftDistance = Math.abs(left.difficultyScore - targetScore);
    const rightDistance = Math.abs(right.difficultyScore - targetScore);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    return compareByHash(left.prompt + "::" + left.answer, right.prompt + "::" + right.answer);
  });
}

function buildQuestionBankJs(questions) {
  const rows = questions.map(function (question) {
    return [
      question.id,
      question.category,
      question.difficulty,
      question.prompt,
      question.choices,
      question.answerIndex,
      question.explanation,
    ];
  });

  return [
    "// Adapted from OpenTriviaQA by uberspot (CC BY-SA 4.0): https://github.com/uberspot/OpenTriviaQA",
    "// Also incorporates Open Trivia DB multiple-choice question material: https://opentdb.com/",
    "// Modified for paiden.com by selecting categories, normalizing text, deduplicating prompts,",
    "// trimming to four choices, and tuning local difficulty buckets for browser-only play.",
    "const QUESTION_ROWS = " + JSON.stringify(rows, null, 2) + ";",
    "",
    "window.PAIDEN_TRIVIA_QUESTION_BANK = QUESTION_ROWS.map(function (row) {",
    "  return {",
    "    id: row[0],",
    "    category: row[1],",
    "    difficulty: row[2],",
    "    prompt: row[3],",
    "    choices: row[4],",
    "    answerIndex: row[5],",
    "    explanation: row[6],",
    "  };",
    "});",
    "",
  ].join("\n");
}

function computeDifficultyScore(category, prompt, answer, choices, sourceType, difficultyHint) {
  const promptWords = countWords(prompt);
  const answerWords = countWords(answer);
  const averageChoiceWords =
    choices.reduce(function (sum, choice) {
      return sum + countWords(choice);
    }, 0) / Math.max(choices.length, 1);
  const properNounCount = countProperNouns(prompt) + countProperNouns(answer);
  const digitCount = (prompt.match(/\d/g) || []).length + (answer.match(/\d/g) || []).length;
  const quoteCount = (prompt.match(/["']/g) || []).length;
  const hardPatternScore = countPatternHits(GLOBAL_HARD_PATTERNS, prompt) * 8;
  const easyRejectScore = countPatternHits(GLOBAL_EASY_REJECT_PATTERNS, prompt) * 10;
  const tuning = CATEGORY_TUNING[category.label] || { easyHints: [], hardHints: [] };
  const categoryHardScore = countPatternHits(tuning.hardHints, prompt) * 8;
  const categoryEasyScore = countPatternHits(tuning.easyHints, prompt) * -7;

  let sourceBias = 0;
  if (sourceType === "opentdb") {
    if (difficultyHint === "easy") sourceBias -= 28;
    if (difficultyHint === "medium") sourceBias -= 2;
    if (difficultyHint === "hard") sourceBias += 18;
  }

  return (
    promptWords * 1.2 +
    answerWords * 1.3 +
    averageChoiceWords * 0.7 +
    properNounCount * 1.75 +
    digitCount * 1.5 +
    quoteCount * 1.5 +
    hardPatternScore +
    easyRejectScore +
    categoryHardScore +
    categoryEasyScore +
    sourceBias
  );
}

function isAllowedForEasy(category, prompt) {
  if (GLOBAL_EASY_REJECT_PATTERNS.some(function (pattern) { return pattern.test(prompt); })) {
    return false;
  }
  const tuning = CATEGORY_TUNING[category.label];
  if (tuning && tuning.hardHints.some(function (pattern) { return pattern.test(prompt); })) {
    return false;
  }
  return true;
}

function parseOpenTriviaBlocks(raw, sourceName) {
  const lines = String(raw || "").split(/\r?\n/);
  const records = [];
  let current = null;

  function pushCurrent() {
    if (!current || !current.prompt || !current.answer) {
      current = null;
      return;
    }
    records.push(current);
    current = null;
  }

  lines.forEach(function (line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      return;
    }
    if (trimmed.startsWith("#Q ")) {
      pushCurrent();
      current = {
        sourceType: "qa",
        sourceName,
        prompt: trimmed.slice(3).trim(),
        answer: "",
        choices: [],
      };
      return;
    }
    if (!current) {
      return;
    }
    if (trimmed.startsWith("^ ")) {
      current.answer = trimmed.slice(2).trim();
      return;
    }
    if (/^[A-Z] /.test(trimmed)) {
      current.choices.push(trimmed.slice(2).trim());
    }
  });

  pushCurrent();
  return records;
}

async function fetchText(url) {
  const response = await fetchWithRetries(url);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetchWithRetries(url);
  return response.json();
}

async function fetchWithRetries(url, attempt = 0) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "paiden-trivia-build",
    },
  });

  if (response.ok) {
    return response;
  }

  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    await sleep(800 * Math.pow(2, attempt));
    return fetchWithRetries(url, attempt + 1);
  }

  throw new Error("Failed to fetch " + url + ": " + response.status + " " + response.statusText);
}

function decodeHtml(text) {
  return String(text || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (match, entity) {
    const lower = String(entity || "").toLowerCase();
    const named = {
      amp: "&",
      apos: "'",
      quot: '"',
      lt: "<",
      gt: ">",
      nbsp: " ",
      hellip: "...",
      rsquo: "'",
      lsquo: "'",
      ldquo: '"',
      rdquo: '"',
      ndash: "-",
      mdash: "-",
      eacute: "e",
      agrave: "a",
      aacute: "a",
      ouml: "o",
      uuml: "u",
      ntilde: "n",
      deg: "°",
    };
    if (named[lower]) {
      return named[lower];
    }
    if (lower.startsWith("#x")) {
      return String.fromCodePoint(parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith("#")) {
      return String.fromCodePoint(parseInt(lower.slice(1), 10));
    }
    return match;
  });
}

function countPatternHits(patterns, value) {
  return patterns.reduce(function (count, pattern) {
    return count + (pattern.test(value) ? 1 : 0);
  }, 0);
}

function countProperNouns(text) {
  const matches = cleanText(text).match(/\b[A-Z][a-z]{2,}\b/g) || [];
  return matches.filter(function (token) {
    return !["Which", "What", "Who", "When", "Where", "How", "The", "This", "That", "These", "Those", "Name"].includes(token);
  }).length;
}

function countWords(text) {
  return cleanText(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/`/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[â€œâ€]/g, '"')
    .replace(/[â€˜â€™]/g, "'")
    .trim();
}

function buildRecordKey(prompt, answer) {
  return normalizeForCompare(prompt) + "::" + normalizeForCompare(answer);
}

function normalizeForCompare(value) {
  return decodeHtml(cleanText(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function deterministicShuffle(items, seed) {
  return items
    .slice()
    .map(function (item, index) {
      return {
        item,
        index,
        hash: hashString(seed + "::" + index + "::" + JSON.stringify(item)),
      };
    })
    .sort(function (left, right) {
      if (left.hash !== right.hash) {
        return left.hash - right.hash;
      }
      return left.index - right.index;
    })
    .map(function (entry) {
      return entry.item;
    });
}

function compareByHash(left, right) {
  return hashString(left) - hashString(right);
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
