import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("./question-bank.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);

const bank = Array.isArray(sandbox.window.PAIDEN_TRIVIA_QUESTION_BANK)
  ? sandbox.window.PAIDEN_TRIVIA_QUESTION_BANK
  : [];

if (!bank.length) {
  throw new Error("The trivia bank did not initialize.");
}

const counts = {};
const ids = new Set();
for (const question of bank) {
  if (ids.has(question.id)) {
    throw new Error(`Duplicate question id: ${question.id}`);
  }
  ids.add(question.id);
  if (!question.prompt || !Array.isArray(question.choices) || question.choices.length !== 4) {
    throw new Error(`Malformed question: ${question.id}`);
  }
  if (question.answerIndex < 0 || question.answerIndex > 3) {
    throw new Error(`Invalid answer index for ${question.id}`);
  }
  const uniqueChoices = new Set(question.choices.map((choice) => String(choice).trim().toLowerCase()));
  if (uniqueChoices.size !== 4) {
    throw new Error(`Duplicate answer choices found in ${question.id}`);
  }
  counts[question.category] = (counts[question.category] || 0) + 1;
}

console.log(JSON.stringify({
  version: sandbox.window.PAIDEN_TRIVIA_BANK_VERSION || "unknown",
  total: bank.length,
  counts,
}, null, 2));
