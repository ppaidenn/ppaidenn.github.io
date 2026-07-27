# Trivia Question Bank and Review

The game uses a local, browser-loaded question bank. It does not fetch questions or store player data remotely.

- `question-bank.js` contains the original hand-curated general-trivia foundation.
- `question-bank-extra.js` adds 432 tougher challenge prompts, bringing the total to 1,008 questions across Music, Sports, Movies & TV, History, Science, and Geography. The Geography challenge layer emphasizes landmarks, physical geography, and places rather than capital-city recall.
- The category mix follows the broad six-category structure of classic Trivial Pursuit as a design reference; questions are original and locally maintained.
- Challenge prompts are favored during play, while the full deck remains available so long games stay varied.
- Multiple-choice answers are drawn from the same subject pool as the correct answer instead of unrelated, obvious distractors.

Run `node trivia/build-question-bank.mjs` from the repository root to validate the combined bank, including question count, unique ids, and four distinct choices per question. Run `node trivia/verify-challenge-answers.mjs` to verify every generated challenge prompt maps to its intended answer.
