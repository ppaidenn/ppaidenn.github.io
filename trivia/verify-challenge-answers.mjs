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
    reverse: (_left, right) => `Which landmark, region, or natural site is in ${right}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (left) => left,
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
    reverse: (_left, right) => `Which album was released by ${right}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (left) => left,
  },
  {
    key: "SPORTS_MOMENTS",
    forward: (_left, right) => `Which athlete is associated with ${right}?`,
    reverse: (left) => `Which achievement or distinction is associated with ${left}?`,
    forwardAnswer: (left) => left,
    reverseAnswer: (_left, right) => right,
  },
  {
    key: "SCREEN_QUOTES",
    forward: (left) => `Which film features the line "${left}"?`,
    reverse: (_left, right) => `Which line comes from ${right}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (left) => left,
  },
  {
    key: "HISTORY_EVENTS",
    forward: (left) => `In what year did ${left} occur?`,
    reverse: (_left, right) => `Which event occurred in ${right}?`,
    forwardAnswer: (_left, right) => right,
    reverseAnswer: (left) => left,
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

console.log(`Verified ${checked} generated challenge prompt-to-answer mappings.`);
