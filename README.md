# Vocabulary Builder (React)

A modern React-based vocabulary learning application that parses Notion HTML exports and presents vocabulary words in an interactive, searchable interface.

## Features

### Core Functionality
- **Notion HTML Import** - Upload HTML exports from Notion to load vocabulary data
- **Word Browsing** - Browse words by category and subcategory with a searchable dropdown
- **Word Details** - View definitions, examples, and related words for each vocabulary entry
- **Progress Tracking** - Track your learning progress through the vocabulary list
- **Search & Navigation** - Search for any word, navigate with previous/next buttons, or type a custom word to find it

### Advanced Features
- **3-Tier Comment Matching** - Automatically links your Notion inline comments to vocabulary words:
  - Tier 1: Exact word match
  - Tier 2: Related words match
  - Tier 3: Definition/example text match
- **Fuzzy Search** - Find close matches using Levenshtein distance algorithm
- **Dictionary Integration** - Click any word to open its Merriam-Webster definition in a new tab
- **Text-to-Speech** - Pronounce any word with a click
- **Copy to Clipboard** - Copy words and related terms instantly

### UI/UX
- **Dark/Light Theme** - Toggle between dark and light modes
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Keyboard Support** - Use Enter to search custom words
- **Wake Lock** - Keeps screen active during study sessions

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/bahaeomid/vocabulary-builder-react.git
cd vocabulary-builder-react

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

## Data Format

### Notion HTML Export Structure

The app expects vocabulary data exported from Notion in the following format:

```html
<ul class="toggle">
  <li>
    <details open="">
      <summary>Vocabulary Word</summary>
      <ul class="bulleted-list">
        <li>Definition text</li>
      </ul>
      <ul class="bulleted-list">
        <li>Example: Use the word in a sentence</li>
      </ul>
      <ul class="bulleted-list">
        <li>Variants & Related Words: related1, related2</li>
      </ul>
    </details>
  </li>
</ul>
```

### Category Organization

Categories should be organized using `<h2>` headers in Notion. Use the pipe character (`|`) to create subcategories:

```
Business | Marketing
Business | Finance
```

### Inline Comments

Add comments in a separate "Inline comments" section in Notion:

```html
<details>
  <summary>Inline comments</summary>
  <div class="indented">
    <div>
      <p><b>Block text</b>: <mark>vocabularyword</mark></p>
      <ul class="toggle">
        <li><div>Your comment about this word</div></li>
      </ul>
    </div>
  </div>
</details>
```

## Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite 7
- **Styling**: styled-components
- **Testing**: Vitest + @testing-library/jest-dom

## Project Structure

```
├── src/
│   ├── App.tsx           # Main application component
│   ├── parser.ts         # HTML parsing and comment matching logic
│   ├── types.ts          # TypeScript interfaces
│   ├── parser.test.ts   # Unit tests
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── public/
│   └── data/             # Sample vocabulary HTML files
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## License

MIT License - see LICENSE file for details.

## Credits

This project is a React rewrite of the original R Shiny Vocabulary Builder application. The parsing logic replicates the behavior of the R version to maintain feature parity while leveraging modern React patterns.
