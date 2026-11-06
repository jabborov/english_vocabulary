# English Vocabulary

A free website for learning English vocabulary. The words come from BBC Learning English *6 Minute English* episodes and are grouped by topic.

For each word you get:
- an English meaning
- a British IPA transcription
- an Uzbek translation
- example sentences for every CEFR level, from A1 to C2

**Live site:** https://jabborov.github.io/english_vocabulary/

## Features

- 🗂️ **Two parts:** topics are split into Part 1 and Part 2.
- 🔍 **Search:** find any word, translation or meaning.
- 🔤 **Transcription:** British IPA for every word.
- 🇺🇿 **Uzbek translation:** every word is translated into Uzbek.
- 📈 **CEFR levels:** example sentences from A1 to C2.
- 🎲 **Random word:** practise with a random word.
- ✅ **Progress:** mark words as memorized, weak or to learn.
- 🌙 **Dark mode:** switch between light and dark themes.

## Content

| Part | Topics | Words | Example sentences |
|---|---|---|---|
| Part 1 | **508** | **11,662** | **69,972** |
| Part 2 | **80** | **2,424** | **14,544** |
| **Total** | **588** | **14,086** | **84,516** |

## Project structure

```
english_vocabulary/
├── index.html          # Home page: topic list, search, Part 1/2 and Random buttons
├── topic.html          # Topic page: all words of one topic
├── data_part1.js       # Part 1 words: meaning, IPA, Uzbek translation, example
├── examples_part1.js   # Part 1 example sentences (A1–C2)
├── data.js             # Part 2 words: meaning, IPA, Uzbek translation, example
├── examples.js         # Part 2 example sentences (A1–C2)
├── random.js           # Random word feature
├── scroll.js           # ↑ / ↓ buttons to jump to the top or bottom of a page
├── test.js             # Page tests (Node.js + jsdom)
└── README.md           # This file
```

## Run locally

No build step is needed. Open `index.html`, or run:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## License

This project is released under the **MIT License**. You are free to use, copy, modify and share it, including for commercial use, as long as you keep the original copyright and license notice. The software is provided "as is", without any warranty.


