import { readFile } from "node:fs/promises";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);

const baseSource = await readFile(new URL("./question-bank.js", import.meta.url), "utf8");
let extraSource = await readFile(new URL("./question-bank-extra.js", import.meta.url), "utf8");

vm.runInContext(baseSource, sandbox);
extraSource = extraSource.replace(/\}\)\(\);\s*$/, "\nwindow.__challengeReview = { GEOGRAPHY_PLACES, SCIENCE_ATOMIC_NUMBERS, MUSIC_ALBUMS, SPORTS_MOMENTS, SCREEN_QUOTES, HISTORY_EVENTS };\n})();");
vm.runInContext(extraSource, sandbox);

const bank = sandbox.window.PAIDEN_TRIVIA_QUESTION_BANK;
const review = sandbox.window.__challengeReview;

function answerFor(prompt) {
  const matches = bank.filter((question) => question.prompt === prompt);
  if (matches.length !== 1) throw new Error(`Expected one question for: ${prompt}`);
  const question = matches[0];
  return question.choices[question.answerIndex];
}

const groups = [
  {
    key: "GEOGRAPHY_PLACES",
    forward: (left) => `${left} is located in which country?`,
    reverse: (left) => `In which country would you find ${left}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (_left, right) => right,
  },
  {
    key: "SCIENCE_ATOMIC_NUMBERS",
    forward: (_left, right) => `Which element has atomic number ${right}?`,
    reverse: (left) => `What is the atomic number of ${left}?`,
    forwardAnswer: (left) => left,
    reverseAnswer: (_left, right) => right,
  },
  {
    key: "MUSIC_ALBUMS",
    forward: (left) => `Who released the album ${left}?`,
    reverse: (left) => `Which artist is behind the album ${left}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (_left, right) => right,
  },
  {
    key: "SPORTS_MOMENTS",
    forward: (_left, right) => `Which athlete is associated with ${right}?`,
    reverse: (_left, right) => `Name the athlete known for ${right}.`,
    forwardAnswer: (left) => left,
    reverseAnswer: (left) => left,
  },
  {
    key: "SCREEN_QUOTES",
    forward: (left) => `Which film features the line "${left}"?`,
    reverse: (left) => `The line "${left}" appears in which film?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (_left, right) => right,
  },
  {
    key: "HISTORY_EVENTS",
    forward: (left) => `In what year did ${left} occur?`,
    reverse: (left) => `Date this event: ${left}.`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (_left, right) => right,
  },
];

let checked = 0;
for (const group of groups) {
  for (const [left, right] of review[group.key]) {
    if (answerFor(group.forward(left, right)) !== group.forwardAnswer(left, right)) {
      throw new Error(`Forward answer mapping failed for ${group.key}: ${left}`);
    }
    if (answerFor(group.reverse(left, right)) !== group.reverseAnswer(left, right)) {
      throw new Error(`Reverse answer mapping failed for ${group.key}: ${left}`);
    }
    checked += 2;
  }
}

const ambiguousOpenAnswerPatterns = [
  /^Which song is most closely associated with /,
  /^Which .+ team plays in .+\?$/,
  /^Which of these characters comes from /,
  /^Which of these events happened in /,
  /^Which line comes from /,
  /^Which achievement or distinction is associated with /,
  /^Which event occurred in /,
  /^Which landmark, region, or natural site is in /,
  /^Which album was released by /,
];
const ambiguousQuestions = bank.filter((question) => ambiguousOpenAnswerPatterns.some((pattern) => pattern.test(question.prompt)));
if (ambiguousQuestions.length) {
  throw new Error(`Found ${ambiguousQuestions.length} list-style question(s) that are not valid for Speak It mode.`);
}

console.log(`Verified ${checked} generated challenge prompt-to-answer mappings and all bank prompts are valid for Speak It mode.`);
