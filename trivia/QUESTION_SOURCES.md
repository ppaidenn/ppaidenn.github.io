**Trivia Sources**

The large local trivia bank in [question-bank.js](/c:/Users/pen/OneDrive/Documents/paiden.com/paiden.github.io/trivia/question-bank.js:1) is adapted from:

- OpenTriviaQA by `uberspot`
- Repo: https://github.com/uberspot/OpenTriviaQA
- License: CC BY-SA 4.0
- Open Trivia DB multiple-choice question material
- Site: https://opentdb.com/

For paiden.com, the source material is modified by:

- selecting only the categories used by the game
- combining `movies` and `television` into `Movies & TV`
- normalizing and deduplicating questions
- trimming entries to four answer choices
- blending in mainstream Open Trivia DB questions for easier/mid buckets
- assigning tuned local `easy`, `medium`, `hard`, and `impossible` buckets for browser play

To rebuild the local bank:

```powershell
node .\trivia\build-question-bank.mjs
```
