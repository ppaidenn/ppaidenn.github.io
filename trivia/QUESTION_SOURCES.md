**Trivia Sources**

The local trivia bank in [question-bank.js](/C:/Users/pen/OneDrive/Documents/paiden.com/paiden.github.io/trivia/question-bank.js:1) is now a hand-curated classic game-night set.

It is built around:

- direct general-knowledge question writing for paiden.com
- broadly recognizable world capitals, landmarks, songs, films, athletes, historical figures, and science facts
- a single `classic` difficulty instead of easy/medium/hard/impossible buckets
- deterministic answer shuffling so the same bank can be validated locally

The validator script checks the bank shape, total counts, and duplicate choices:

```powershell
node .\trivia\build-question-bank.mjs
```
