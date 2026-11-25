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
- 🔁 **Irregular verbs:** past simple and past participle forms (e.g. *go → went → gone*).
- 🔄 **Synonyms and opposites:** shown for adjectives, nouns, verbs, adverbs, determiners and pronouns (e.g. *cheap → expensive*, *success → failure*, *increase → decrease*, *quickly → slowly*, *many → few*). Turn them on or off with the **⇄ Synonyms** button.
- 🇺🇿 **Uzbek translation:** every word is translated into Uzbek.
- 📈 **CEFR levels:** the **A**, **B** and **C** buttons show the example sentences of both levels in the group (A1 + A2, B1 + B2, C1 + C2). They can be combined: **A** and **C** together show A1, A2, C1 and C2.
- 🌐 **Translate:** shows the Uzbek translation under each example sentence: the A1–C2 sentences of the selected level groups (**A**, **B**, **C**), and the original example sentence when no group is selected. Turn it on or off with the **文 Translate** button.
- ★ **Today:** press **☆ Today** on a word card to add it to today's review list. The **★ Today** button on the main page shows the list, with **Clear** (remove all words) and **Copy URL** (a link that opens the same list on another device).
- 🔎 **Synonym details:** synonyms and opposites that are themselves words in Part 1 or Part 2 have a dotted underline. Clicking one opens a popup with all the word's synonyms and opposites that have an entry, each with its Uzbek translation and English explanation (the clicked word is highlighted).
- ⤓ **Last word:** press **⤓ Last word** on a word card to mark that word (e.g. where you stopped). Only one word is marked; marking another word moves the mark, and pressing it again on the marked word removes it. The mark is saved in the browser. The **⤓ Last word** button on the main page opens that topic and scrolls to the word.
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
├── index.html             # Home page: topic list, search, Part 1/2 and Random buttons
├── topic.html             # Topic page: all words of one topic
├── data_part1.js          # Part 1 words: meaning, IPA, Uzbek translation, example
├── examples_part1.js      # Part 1 example sentences (A1–C2)
├── data.js                # Part 2 words: meaning, IPA, Uzbek translation, example
├── examples.js            # Part 2 example sentences (A1–C2)
├── irregular.js           # Irregular verbs: past simple and past participle forms
├── tr-loader.js           # Loads one topic's Uzbek translations only when needed
├── translations/          # Uzbek translations of the A1–C2 example sentences, one file per topic
│   ├── part1/             # 0001.js … 0508.js
│   └── part2/             # 0001.js … 0080.js
├── synonyms.js            # Synonyms and opposites for adjectives, nouns, verbs, adverbs, determiners and pronouns
├── random.js              # Random word feature
├── today.js               # Today review list (main page), Clear and Copy URL
├── word-info.js           # Synonym/opposite details popup (dotted underline links)
├── last-word.js           # Last word: the word you marked (saved; main page button opens it)
├── scroll.js              # ↑ / ↓ buttons to jump to the top or bottom of a page
├── test.js                # Page tests (Node.js + jsdom)
└── README.md              # This file
```

## Run locally

No build step is needed. Open `index.html`, or run:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## License

This project is released under the **MIT License**. You are free to use, copy, modify and share it, including for commercial use, as long as you keep the original copyright and license notice. The software is provided "as is", without any warranty.


