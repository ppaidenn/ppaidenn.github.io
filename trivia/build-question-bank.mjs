import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CATEGORY_CONFIG = [
  { label: "Music", key: "music", sources: ["music"] },
  { label: "Sports", key: "sports", sources: ["sports"] },
  { label: "Movies & TV", key: "movies-tv", sources: ["movies", "television"] },
  { label: "History", key: "history", sources: ["history"] },
  { label: "Science", key: "science", sources: ["science-technology"] },
  { label: "Geography", key: "geography", sources: ["geography", "world"] },
];

const DIFFICULTIES = ["easy", "medium", "hard", "impossible"];
const QUESTIONS_PER_DIFFICULTY = 200;
const REQUIRED_PER_CATEGORY = DIFFICULTIES.length * QUESTIONS_PER_DIFFICULTY;
const SOURCE_ROOT = "https://raw.githubusercontent.com/uberspot/OpenTriviaQA/master/categories/";

async function main() {
  const allQuestions = [];
  const summary = [];

  for (const category of CATEGORY_CONFIG) {
    const sourceRecords = [];
    for (const sourceName of category.sources) {
      const raw = await fetchText(SOURCE_ROOT + sourceName);
      sourceRecords.push(...parseOpenTriviaBlocks(raw, sourceName));
    }

    const normalized = normalizeRecords(sourceRecords, category);
    if (normalized.length < REQUIRED_PER_CATEGORY) {
      throw new Error(
        category.label +
          " only has " +
          normalized.length +
          " usable unique questions after cleanup; " +
          REQUIRED_PER_CATEGORY +
          " are required."
      );
    }

    const bucketed = assignDifficultyBuckets(normalized, category);
    for (const difficulty of DIFFICULTIES) {
      const records = bucketed[difficulty];
      summary.push(category.label + " / " + difficulty + ": " + records.length);
      allQuestions.push(...records);
    }
  }

  const output = buildQuestionBankJs(allQuestions);
  const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "question-bank.js");
  await writeFile(outputPath, output, "utf8");

  console.log("Wrote " + allQuestions.length + " unique trivia questions to " + outputPath);
  summary.forEach(function (line) {
    console.log(" - " + line);
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "paiden-trivia-build",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch " + url + ": " + response.status + " " + response.statusText);
  }
  return response.text();
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

function normalizeRecords(records, category) {
  const dedupe = new Map();

  records.forEach(function (record) {
    const normalized = normalizeRecord(record, category);
    if (!normalized) {
      return;
    }
    const key = buildRecordKey(normalized.prompt, normalized.answer);
    if (!dedupe.has(key)) {
      dedupe.set(key, normalized);
    }
  });

  return Array.from(dedupe.values());
}

function normalizeRecord(record, category) {
  const prompt = cleanText(record.prompt);
  const answer = cleanText(record.answer);

  if (!prompt || !answer || prompt.length < 10) {
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
    const choiceKey = normalizeForCompare(cleaned);
    if (seenChoices.has(choiceKey)) {
      return;
    }
    seenChoices.add(choiceKey);
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

  return {
    category: category.label,
    prompt,
    answer,
    choices: finalizedChoices,
    answerIndex,
    explanation: "",
    sourceName: record.sourceName,
    score: computeDifficultyScore(prompt, answer, finalizedChoices),
  };
}

function assignDifficultyBuckets(records, category) {
  const sorted = records
    .slice()
    .sort(function (left, right) {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return compareByHash(left.prompt + "::" + left.answer, right.prompt + "::" + right.answer);
    });

  const quartileSize = Math.floor(sorted.length / 4);
  if (quartileSize < QUESTIONS_PER_DIFFICULTY) {
    throw new Error(category.label + " does not have enough questions per difficulty quartile.");
  }

  const quartiles = {
    easy: sorted.slice(0, quartileSize),
    medium: sorted.slice(quartileSize, quartileSize * 2),
    hard: sorted.slice(quartileSize * 2, quartileSize * 3),
    impossible: sorted.slice(quartileSize * 3),
  };

  const bucketed = {};
  DIFFICULTIES.forEach(function (difficulty) {
    const selected = deterministicShuffle(
      quartiles[difficulty],
      category.key + "::" + difficulty + "::bucket"
    ).slice(0, QUESTIONS_PER_DIFFICULTY);

    bucketed[difficulty] = selected.map(function (record, index) {
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
  });

  return bucketed;
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
    "// Modified for paiden.com by selecting categories, normalizing text, deduplicating prompts,",
    "// trimming to four choices, and assigning local difficulty buckets for browser-only play.",
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

function computeDifficultyScore(prompt, answer, choices) {
  const promptWords = countWords(prompt);
  const answerWords = countWords(answer);
  const averageChoiceWords =
    choices.reduce(function (sum, choice) {
      return sum + countWords(choice);
    }, 0) / Math.max(choices.length, 1);
  const digitCount = (prompt.match(/\d/g) || []).length + (answer.match(/\d/g) || []).length;
  const commaCount = (prompt.match(/,/g) || []).length;
  const clueWeight = /\blyrics|sings|lineup|roster|born|released|debut|founded|capital|battle|dynasty|catalogued\b/i.test(prompt)
    ? 4
    : 0;
  const listWeight = prompt.includes(",") ? 3 : 0;
  const longPromptWeight = prompt.length > 120 ? 5 : prompt.length > 90 ? 3 : 0;
  const punctuationWeight = /["'()\-]/.test(prompt) ? 1.5 : 0;

  return (
    promptWords * 1.75 +
    answerWords * 2.25 +
    averageChoiceWords * 0.85 +
    digitCount * 1.5 +
    commaCount * 0.75 +
    clueWeight +
    listWeight +
    longPromptWeight +
    punctuationWeight
  );
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
    .trim();
}

function buildRecordKey(prompt, answer) {
  return normalizeForCompare(prompt) + "::" + normalizeForCompare(answer);
}

function normalizeForCompare(value) {
  return cleanText(value)
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

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
