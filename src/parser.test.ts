import { describe, it, expect } from 'vitest';
import { 
  normalizeForMatch, 
  findCloseMatches, 
  parseHtmlFile,
  isSingleWord
} from './parser';

// ============================================================
// SAMPLE HTML FOR TESTING
// ============================================================

const createSampleVocabHtml = (options?: {
  withComments?: boolean;
  empty?: boolean;
}): string => {
  if (options?.empty) {
    return '<html><body></body></html>';
  }

  const commentsSection = options?.withComments ? `
    <details>
      <summary>Inline comments</summary>
      <div class="indented">
        <p><b>Block text</b>: <mark class="highlight-yellow_background">ephemeral</mark></p>
        <ul class="toggle">
          <li>
            <div>This word is often used in poetry.</div>
            <div>Remember: epi- (upon) + hemer- (day).</div>
          </li>
        </ul>
        <p><b>Block text</b>: <mark class="highlight-yellow_background">unknown-word-xyz</mark></p>
        <ul class="toggle">
          <li>
            <div>This word doesn't exist in vocabulary.</div>
          </li>
        </ul>
      </div>
    </details>
  ` : '';

  return `
<html>
<head><title>Test Vocab</title></head>
<body>
<details open="">
<summary>General Vocabulary</summary>
<div class="indented">
<h2>General Vocabulary | Common Words</h2>
<ul class="toggle">
<li>
<details>
<summary>ephemeral</summary>
<ul>
<li>Lasting for a very short time</li>
<li>Example: The ephemeral beauty of cherry blossoms.</li>
<li>Variants & Related Words: transient, fleeting</li>
</ul>
</details>
</li>
<li>
<details>
<summary>ubiquitous</summary>
<ul>
<li>Present, appearing, or found everywhere</li>
<li>Example: Smartphones have become ubiquitous in modern society.</li>
</ul>
</details>
</li>
</ul>
<h2>General Vocabulary | Advanced</h2>
<ul class="toggle">
<li>
<details>
<summary>serendipity</summary>
<ul>
<li>The occurrence of events by chance in a happy way</li>
<li>Example: Finding that book was pure serendipity.</li>
<li>Variants & Related Words: ephemeral, luck</li>
</ul>
</details>
</li>
</ul>
</div>
</details>
${commentsSection}
</body>
</html>
`.trim();
};

const createHtmlWithDefinitionMatch = (): string => {
  return `
<html>
<head><title>Test Vocab</title></head>
<body>
<details open="">
<summary>General Vocabulary</summary>
<div class="indented">
<h2>General Vocabulary | Test</h2>
<ul class="toggle">
<li>
<details>
<summary>happiness</summary>
<ul>
<li>The state of being happy; a feeling of joy and contentment</li>
<li>Example: Her happiness was evident in her smile.</li>
</ul>
</details>
</li>
</ul>
</div>
</details>
<details>
<summary>Inline comments</summary>
<div class="indented">
<p><b>Block text</b>: <mark class="highlight-yellow_background">joy</mark></p>
<ul class="toggle">
<li>
<div>Related to the definition of happiness.</div>
</li>
</ul>
</div>
</details>
</body>
</html>
`.trim();
};

// ============================================================
// NORMALIZE FOR MATCH TESTS
// ============================================================

describe('normalizeForMatch', () => {
  it('should convert to lowercase', () => {
    expect(normalizeForMatch('HELLO')).toBe('hello');
    expect(normalizeForMatch('Hello World')).toBe('hello world');
  });

  it('should replace non-breaking spaces with regular spaces', () => {
    const input = 'hello\u00A0world';
    expect(normalizeForMatch(input)).toBe('hello world');
  });

  it('should replace zero-width spaces with regular spaces', () => {
    const input = 'hello\u200Bworld';
    expect(normalizeForMatch(input)).toBe('hello world');
  });

  it('should trim whitespace', () => {
    expect(normalizeForMatch('  hello  ')).toBe('hello');
  });

  it('should remove trailing punctuation', () => {
    expect(normalizeForMatch('hello!')).toBe('hello');
    expect(normalizeForMatch('hello.')).toBe('hello');
    expect(normalizeForMatch('hello,')).toBe('hello');
  });

  it('should handle empty strings', () => {
    expect(normalizeForMatch('')).toBe('');
  });

  it('should handle null-like input', () => {
    expect(normalizeForMatch(null as any)).toBe('');
    expect(normalizeForMatch(undefined as any)).toBe('');
  });
});

// ============================================================
// LEVENSHTEIN DISTANCE / CLOSE MATCHES TESTS
// ============================================================

describe('findCloseMatches', () => {
  it('should find exact matches with distance 0', () => {
    const wordList = ['hello', 'world', 'test'];
    const result = findCloseMatches('hello', wordList);
    expect(result).toContain('hello');
  });

  it('should find close matches within 20% threshold', () => {
    const wordList = ['hello', 'world', 'testing'];
    const result = findCloseMatches('helo', wordList);
    expect(result).toContain('hello');
  });

  it('should return up to 5 matches sorted by distance', () => {
    const wordList = ['apple', 'apply', 'apples', 'applied', 'applicant', 'application'];
    const result = findCloseMatches('apple', wordList);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0]).toBe('apple');
  });

  it('should not return matches beyond threshold', () => {
    const wordList = ['completely', 'different', 'words'];
    const result = findCloseMatches('xyz', wordList);
    expect(result).not.toContain('completely');
    expect(result).not.toContain('different');
    expect(result).not.toContain('words');
  });

  it('should be case-insensitive', () => {
    const wordList = ['Hello', 'WORLD', 'Test'];
    const result = findCloseMatches('hello', wordList);
    expect(result).toContain('Hello');
  });

  it('should handle empty word list', () => {
    const result = findCloseMatches('test', []);
    expect(result).toEqual([]);
  });

  it('should handle empty query', () => {
    const wordList = ['hello', 'world'];
    const result = findCloseMatches('', wordList);
    expect(result).toEqual([]);
  });

  it('should calculate correct Levenshtein distance', () => {
    // 'kitten' -> 'sitting' has distance 3
    const wordList = ['sitting'];
    const result = findCloseMatches('kitten', wordList);
    // 'kitten' (6) -> 'sitting' (7): distance 3, threshold = ceil(7 * 0.2) = 2
    // 3 > 2, so should NOT match
    expect(result).toEqual([]);
  });

  it('should match words with small typos', () => {
    const wordList = ['ephemeral'];
    const result = findCloseMatches('ephemral', wordList);
    // 'ephemeral' (9) -> 'ephemral' (8): distance 1, threshold = ceil(9 * 0.2) = 2
    // 1 <= 2, so should match
    expect(result).toContain('ephemeral');
  });
});

// ============================================================
// IS SINGLE WORD TESTS
// ============================================================

describe('isSingleWord', () => {
  it('should return true for single words', () => {
    expect(isSingleWord('hello')).toBe(true);
    expect(isSingleWord('ephemeral')).toBe(true);
  });

  it('should return false for words with commas', () => {
    expect(isSingleWord('hello, world')).toBe(false);
  });

  it('should return false for words with slashes', () => {
    expect(isSingleWord('hello/world')).toBe(false);
  });

  it('should return false for words with "and"', () => {
    expect(isSingleWord('hello and world')).toBe(false);
  });

  it('should return false for words with "&"', () => {
    expect(isSingleWord('hello & world')).toBe(false);
  });

  it('should return false for words with parentheses', () => {
    expect(isSingleWord('hello (world)')).toBe(false);
  });
});

// ============================================================
// PARSE HTML FILE TESTS
// ============================================================

describe('parseHtmlFile', () => {
  describe('basic parsing', () => {
    it('should parse vocabulary entries correctly', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test-01-01-2025.html');

      expect(result.words.length).toBe(3);
      expect(result.words[0].Word_orig).toBe('ephemeral');
      expect(result.words[1].Word_orig).toBe('ubiquitous');
      expect(result.words[2].Word_orig).toBe('serendipity');
    });

    it('should extract category and subcategory', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.words[0].Category).toBe('General Vocabulary | Common Words');
      expect(result.words[0].Category_High).toBe('General Vocabulary');
      expect(result.words[0].Category_Low).toBe('Common Words');
    });

    it('should parse definitions correctly', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.words[0].Definition).toBe('Lasting for a very short time');
    });

    it('should parse examples correctly', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.words[0].Example).toBe('The ephemeral beauty of cherry blossoms.');
    });

    it('should parse related words correctly', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.words[0].Related_Words_orig).toEqual(['transient', 'fleeting']);
      expect(result.words[0].Related_List_norm).toEqual(['transient', 'fleeting']);
    });

    it('should normalize word names', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.words[0].Word_norm).toBe('ephemeral');
    });
  });

  describe('statistics', () => {
    it('should calculate unique main words count', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      expect(result.stats.uniqueMainWords).toBe(3);
    });

    it('should calculate unique related words count', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      // transient, fleeting (from ephemeral), ephemeral, luck (from serendipity)
      // Note: ephemeral appears both as main word and related word
      expect(result.stats.uniqueRelatedWords).toBe(4);
    });

    it('should calculate total unique words', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'test.html');

      // ephemeral, ubiquitous, serendipity (main) + transient, fleeting, luck (related)
      // ephemeral is both main and related, so: 3 + 3 = 6 unique
      expect(result.stats.totalUniqueWords).toBe(6);
    });
  });

  describe('file date extraction', () => {
    it('should extract date from filename', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'Vocabulary Builder 08-12-2025.html');

      expect(result.fileDate).toBe('08-12-2025');
    });

    it('should return (unknown) if no date in filename', () => {
      const html = createSampleVocabHtml();
      const result = parseHtmlFile(html, 'vocabulary.html');

      expect(result.fileDate).toBe('(unknown)');
    });
  });

  describe('error handling', () => {
    it('should throw error for empty HTML', () => {
      const html = createSampleVocabHtml({ empty: true });
      expect(() => parseHtmlFile(html, 'test.html')).toThrow('No vocabulary entries found');
    });
  });
});

// ============================================================
// COMMENT MATCHING TESTS
// ============================================================

describe('comment matching', () => {
  it('should match comments to vocabulary entries (Tier 1: exact match)', () => {
    const html = createSampleVocabHtml({ withComments: true });
    const result = parseHtmlFile(html, 'test.html');

    // 'ephemeral' should have a comment
    const ephemeralEntry = result.words.find(w => w.Word_orig === 'ephemeral');
    expect(ephemeralEntry).toBeDefined();
    expect(ephemeralEntry!.My_Commentary.length).toBeGreaterThan(0);
    expect(ephemeralEntry!.My_Commentary[0]).toContain('ephemeral');
    expect(ephemeralEntry!.My_Commentary[0]).toContain('poetry');
  });

  it('should track unmatched highlights', () => {
    const html = createSampleVocabHtml({ withComments: true });
    const result = parseHtmlFile(html, 'test.html');

    // 'unknown-word-xyz' doesn't exist in vocabulary
    expect(result.unmatchedHighlights).toContain('unknown-word-xyz');
  });

  it('should match comments via definition (Tier 3)', () => {
    const html = createHtmlWithDefinitionMatch();
    const result = parseHtmlFile(html, 'test.html');

    // 'joy' appears in the definition of 'happiness'
    const happinessEntry = result.words.find(w => w.Word_orig === 'happiness');
    expect(happinessEntry).toBeDefined();
    expect(happinessEntry!.My_Commentary.length).toBeGreaterThan(0);
    expect(happinessEntry!.My_Commentary[0]).toContain('joy');
  });

  it('should build proper comment HTML structure', () => {
    const html = createSampleVocabHtml({ withComments: true });
    const result = parseHtmlFile(html, 'test.html');

    const ephemeralEntry = result.words.find(w => w.Word_orig === 'ephemeral');
    const commentHtml = ephemeralEntry!.My_Commentary[0];

    expect(commentHtml).toContain('comment-header');
    expect(commentHtml).toContain('💭');
    expect(commentHtml).toContain('comment-bullet');
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('integration tests', () => {
  it('should parse complex HTML with multiple categories', () => {
    const html = createSampleVocabHtml();
    const result = parseHtmlFile(html, 'Vocabulary Builder 01-15-2025.html');

    // Verify structure
    expect(result.words.length).toBe(3);
    expect(result.fileDate).toBe('01-15-2025');
    
    // Verify categories are split correctly
    const categories = result.words.map(w => w.Category_High);
    expect(categories).toContain('General Vocabulary');
  });

  it('should handle words without related words', () => {
    const html = createSampleVocabHtml();
    const result = parseHtmlFile(html, 'test.html');

    // 'ubiquitous' has no related words
    const ubiquitous = result.words.find(w => w.Word_orig === 'ubiquitous');
    expect(ubiquitous!.Related_Words_orig).toEqual([]);
    expect(ubiquitous!.Related_List_norm).toEqual([]);
  });

  it('should handle words without examples', () => {
    const htmlNoExample = `
<html>
<body>
<details open="">
<summary>Test Category</summary>
<div class="indented">
<h2>Test | Category</h2>
<ul class="toggle">
<li>
<details>
<summary>testword</summary>
<ul>
<li>A definition without example</li>
</ul>
</details>
</li>
</ul>
</div>
</details>
</body>
</html>
`.trim();

    const result = parseHtmlFile(htmlNoExample, 'test.html');
    expect(result.words[0].Example).toBe('');
    expect(result.words[0].Definition).toBe('A definition without example');
  });
});
