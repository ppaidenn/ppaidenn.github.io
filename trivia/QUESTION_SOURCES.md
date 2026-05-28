**Trivia Sources**

The large local trivia bank in [question-bank.js](/c:/Users/pen/OneDrive/Documents/paiden.com/paiden.github.io/trivia/question-bank.js:1) is adapted from:

- OpenTriviaQA by `uberspot`
- Repo: https://github.com/uberspot/OpenTriviaQA
- License: CC BY-SA 4.0

For paiden.com, the source material is modified by:

- selecting only the categories used by the game
- combining `movies` and `television` into `Movies & TV`
- normalizing and deduplicating questions
- trimming entries to four answer choices
- assigning local `easy`, `medium`, `hard`, and `impossible` buckets for browser play

To rebuild the local bank:

```powershell
node .\trivia\build-question-bank.mjs
```
