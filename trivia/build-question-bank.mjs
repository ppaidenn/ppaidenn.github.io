import { readFile } from "node:fs/promises";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);

for (const file of ["question-bank.js", "question-bank-extra.js"]) {
  const source = await readFile(new URL(`./${file}`, import.meta.url), "utf8");
  vm.runInContext(source, sandbox);
}

const bank = sandbox.window.PAIDEN_TRIVIA_QUESTION_BANK;
if (!Array.isArray(bank) || bank.length < 1000) {
  throw new Error("The trivia bank must contain at least 1,000 questions.");
}

const ids = new Set();
const counts = {};
for (const question of bank) {
  if (ids.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`);
  ids.add(question.id);
  if (!question.prompt || !Array.isArray(question.choices) || question.choices.length !== 4) {
    throw new Error(`Malformed question: ${question.id}`);
  }
  if (question.answerIndex < 0 || question.answerIndex > 3) {
    throw new Error(`Invalid answer index: ${question.id}`);
  }
  const choices = new Set(question.choices.map((choice) => String(choice).trim().toLowerCase()));
  if (choices.size !== 4) throw new Error(`Duplicate choices: ${question.id}`);
  counts[question.category] = (counts[question.category] || 0) + 1;
}

console.log(JSON.stringify({
  version: sandbox.window.PAIDEN_TRIVIA_BANK_VERSION || "unknown",
  total: bank.length,
  counts,
}, null, 2));
