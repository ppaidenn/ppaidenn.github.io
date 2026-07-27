# Trivia Question Bank

The game uses a local, browser-loaded question bank. It does not fetch questions or store player data remotely.

- `question-bank.js` contains the original hand-curated general-trivia foundation.
- `question-bank-extra.js` adds 432 tougher challenge prompts, bringing the total to 1,008 questions across Music, Sports, Movies & TV, History, Science, and Geography.
- Challenge prompts are favored during play, while the full deck remains available so long games stay varied.
- Multiple-choice answers are drawn from the same subject pool as the correct answer instead of unrelated, obvious distractors.

Run `node trivia/build-question-bank.mjs` from the repository root to validate the combined bank, including question count, unique ids, and four distinct choices per question.
