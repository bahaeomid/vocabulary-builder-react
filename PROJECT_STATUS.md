# Vocabulary Builder - Project Status & Handover

**Last Updated**: March 5, 2026
**Project Location**: `C:\Users\AI_Lab\Desktop\AI Projects\Vocab_Orig`

---

## 📋 Project Overview

This is a React/TypeScript rewrite of the original R Shiny Vocabulary Builder application. The app parses Notion HTML exports containing vocabulary words, definitions, examples, and inline comments, then displays them in an interactive interface.

### Original Reference
- **Original R Shiny App**: `C:\Users\AI_Lab\Desktop\AI Projects\00 Published Repositories\Vocabulary Builder\app.R`

---

## ✅ Completed Work

### Phase 1: Critical Functionality (COMPLETED)
- [x] Comment matching algorithm (3-tier matching)
  - Tier 1: Exact word match
  - Tier 2: Related words match
  - Tier 3: Definition/Example text match
- [x] Levenshtein distance fuzzy matching
- [x] Inline comments HTML parsing
- [x] 41 comprehensive tests passing

### Phase 2: Moderate Enhancements (COMPLETED)
- [x] Progress callbacks for multi-stage processing
- [x] Improved regex escaping
- [x] Better punctuation normalization

### Phase 3: Polish & UX (COMPLETED)
- [x] Mobile responsive styles (@media queries)
- [x] Responsive sidebar and header

### Phase 4: Bug Fixes & Feature Parity (COMPLETED)
- [x] Fixed parser to handle Notion HTML export structure
- [x] Fixed related words navigation (using normalized words)
- [x] Fixed category/subcategory dropdowns
- [x] Fixed blank page issue (tabs reset on word change)
- [x] Fixed comment parsing (finds all `.indented` divs)
- [x] Fixed file details toggle (React state instead of inline onclick)
- [x] Searchable dropdown with Enter to add custom words (like R selectizeInput)
- [x] NoMatchCard shows close matches + Merriam-Webster link

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 19 + TypeScript
- **Styling**: styled-components
- **Testing**: Vitest + @testing-library/jest-dom
- **Build**: Vite 7

### Key Files

| File | Purpose |
|------|---------|
| `src/parser.ts` | HTML parsing, comment matching, fuzzy search |
| `src/App.tsx` | Main UI component with all features |
| `src/types.ts` | TypeScript interfaces |
| `src/parser.test.ts` | 41 test cases |

### Data Files
| File | Description |
|------|-------------|
| `public/data/Vocabulary Builder 08-12-2025.html` | Full vocabulary export from Notion |
| `public/data/vocabulary-test-sample.html` | Test sample with 10 words |

---

## 🔧 How the Parser Works

### Notion HTML Structure (Discovered)
```html
<ul class="toggle">
  <li>
    <details open="">
      <summary>Word Name</summary>
      <ul class="bulleted-list">
        <li>Definition text</li>
      </ul>
      <ul class="bulleted-list">
        <li>Example: sentence</li>
      </ul>
      <ul class="bulleted-list">
        <li>Variants & Related Words: word1, word2</li>
      </ul>
    </details>
  </li>
</ul>
```

### Inline Comments Structure
```html
<details>
  <summary>Inline comments</summary>
  <div class="indented">
    <div>
      <p><b>Block text</b>: <mark>word</mark></p>
      <ul class="toggle">
        <li><div>Comment line 1</div></li>
      </ul>
    </div>
  </div>
  <div class="indented">
    ...another comment block...
  </div>
</details>
```

### Selectors Used
1. `ul.toggle > li > details` (primary)
2. `div.indented ul.toggle li details` (fallback)
3. `.toggle li details` (fallback)

### Bullet Parsing
- Looks for `ul.bulleted-list` elements
- Categorizes by prefix: "Example:", "Variants & Related Words:"
- Collects from ALL bullet lists within each entry

---

## 📊 Current State

### Build Status
```
✓ TypeScript compilation: PASS
✓ Tests: 41/41 PASS
✓ Production build: SUCCESS (249 KB, 80 KB gzipped)
```

### Git History
```
e7b2105 feat: searchable dropdown with Enter to add custom words, fix tab blank page, fix comment parsing
d843bbb fix: load full vocabulary file by default, fallback to test sample
7c0de42 fix: update parser for different Notion HTML export structure
151fca1 fix: use normalized words for related word navigation
f834725 fix: add proper test sample file with vocabulary entries
1908b5d feat: implement Phase 2 and 3 - progress callbacks and mobile responsive
4816001 feat: implement Phase 1 - critical comment matching functionality
```

---

## 🚀 How to Continue

### Start Development Server
```bash
cd "C:\Users\AI_Lab\Desktop\AI Projects\Vocab_Orig"
npm run dev
```
Opens at http://localhost:5174

### Run Tests
```bash
npm run test
npm run test:ui    # UI mode
npm run test:run   # Single run
```

### Build for Production
```bash
npm run build
npm run preview    # Preview build
```

---

## 🔍 Known Issues & Gaps

### Resolved Issues
1. ~~Category/Subcategory Dropdowns Empty~~ - ROOT CAUSE: Full HTML file only contains inline comments, not vocabulary entries. Need to re-export from Notion.
2. ~~User Comment Section Not Showing~~ - Fixed: Parser finds all `.indented` divs
3. ~~File Details Stats Not Displaying~~ - Fixed: Uses React state
4. ~~Search Feature~~ - Fixed: Searchable dropdown with Enter to add custom words

### Unmatched Comments Section
- Shows words from inline comments that couldn't be matched to vocabulary entries
- Located at bottom of left sidebar (collapsible)
- Example: "verbatim, persiflage, opera" - these appear in comments but not in vocabulary list

### Potential Future Work

1. **File Size Validation**
   - Add 100MB upload limit check
   - Better error messages for large files

2. **Debug Mode**
   - Optional debug panel showing parsing stages
   - Log comment matching results

3. **Visual Comparison Testing**
   - Side-by-side comparison with original R Shiny app
   - Verify all features match exactly

---

## 📝 Key Implementation Notes

### Search Functionality (Matches R Script)
- Searchable input field (like R's `selectizeInput` with `create=TRUE`)
- Type any word and press Enter
- If exact match found → navigates to word
- If not found → shows NoMatchCard with:
  - Close matches as clickable buttons (using agrep-style 20% distance)
  - Merriam-Webster dictionary link

### Comment Matching Algorithm
Located in `src/parser.ts`, function `matchCommentsToVocab()`:
1. Pre-computes normalized versions for performance
2. Three-tier matching with early exit
3. Tracks unmatched highlights for data loss prevention

### Fuzzy Search
- Uses Levenshtein distance
- 20% threshold: `Math.ceil(maxLen * 0.2)`
- Returns up to 5 closest matches

### Normalization
- `normalizeForMatch()`: For word lookup (lowercase, remove punctuation, trim)
- `normalizeText()`: For definition/example text matching

### Tab Behavior
- `activeTab` state resets to 0 when `selectedWord` changes
- Prevents blank page when navigating between words

---

## 🧪 Testing Strategy

### Test Coverage
- Normalization functions
- Levenshtein distance calculations
- Comment matching (all 3 tiers)
- HTML parsing (vocabulary entries, inline comments)
- Integration tests (full workflow)

### Sample Data
- Test HTML file with 10 words across 3 categories
- Includes matched and unmatched inline comments

---

## 📦 Dependencies

### Production
- react ^19.2.0
- react-dom ^19.2.0
- styled-components ^6.3.11

### Development
- vitest ^4.0.18
- @vitest/ui ^4.0.18
- @testing-library/jest-dom ^6.9.1
- jsdom ^28.1.0
- typescript ~5.9.3
- vite ^7.3.1

---

## 🔗 Quick Links

- **Original App**: `C:\Users\AI_Lab\Desktop\AI Projects\00 Published Repositories\Vocabulary Builder\app.R`
- **Notion Export Help**: https://www.notion.so/Vocabulary-Builder-10a64bc18fb280c5a9e8d065c88f6c2f

---

## 💡 Session Start Checklist

When starting a new session:

1. Read this file first
2. Check `git log --oneline -10` for recent changes
3. Run `npm run test:run` to verify tests pass
4. Run `npm run dev` to start development server
5. Test with vocabulary-test-sample.html upload (full file has no vocabulary entries)

---

*Last updated after completing searchable dropdown and bug fixes.*
