import type { VocabWord, ParsedVocabData, ProgressCallback } from './types';

// ============================================================
// NORMALIZATION FUNCTIONS
// ============================================================

export const normalizeForMatch = (x: string): string => {
  if (!x) return '';
  let result = x.toLowerCase();
  result = result.replace(/[\u00A0\u200B\t\r\n]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  // Match R's [[:punct:]] which includes: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
  result = result.replace(/^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+|[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/g, '');
  return result;
};

const normalizeText = (x: string): string => {
  if (!x) return '';
  let result = x;
  result = result.replace(/\u00A0/g, ' ');
  result = result.replace(/[.,!?;:'"()\[\]{}]+$/, '');
  result = result.replace(/\s+/g, ' ').trim();
  result = result.toLowerCase();
  return result;
};

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ============================================================
// LEVENSHTEIN DISTANCE (FUZZY MATCHING)
// ============================================================

const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const findCloseMatches = (query: string, wordList: string[]): string[] => {
  const matches: { word: string; distance: number }[] = [];
  const lowerQuery = query.toLowerCase();

  wordList.forEach(word => {
    const lowerWord = word.toLowerCase();
    if (lowerWord === lowerQuery) {
      matches.push({ word, distance: 0 });
      return;
    }

    const maxLen = Math.max(lowerQuery.length, lowerWord.length);
    if (maxLen === 0) return;

    const distance = levenshteinDistance(lowerQuery, lowerWord);
    const threshold = Math.ceil(maxLen * 0.2);

    if (distance <= threshold) {
      matches.push({ word, distance });
    }
  });

  return matches
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(m => m.word);
};

// ============================================================
// HTML HELPER FUNCTIONS
// ============================================================

const findPrecedingH2 = (element: Element): string => {
  let current: Element | null = element;

  // First, check previous siblings of each parent
  while (current) {
    // Check previous siblings
    let prev: Element | null = current.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H2') {
        return prev.textContent?.trim() || '';
      }
      // Check for h2 nested inside
      const h2 = prev.querySelector(':scope > h2');
      if (h2) {
        return h2.textContent?.trim() || '';
      }
      prev = prev.previousElementSibling;
    }
    // Move up to parent
    current = current.parentElement;
  }
  
  // Fallback: search the entire document for h2 elements before this element
  const allH2s = document.querySelectorAll('h2');
  let lastH2 = '';
  for (const h2 of Array.from(allH2s)) {
    if (h2.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
      lastH2 = h2.textContent?.trim() || '';
    }
  }
  return lastH2;
};

const isSingleWord = (w: string): boolean => {
  return !/[,\/]|\s+vs\.?|\s+and\s+|&|\(|\)/.test(w);
};

// ============================================================
// VOCABULARY ENTRY PARSING
// ============================================================

interface RawVocabEntry {
  category: string;
  wordOrig: string;
  definition: string;
  example: string;
  relatedWordsOrig: string[];
}

const parseVocabularyEntries = (doc: Document): RawVocabEntry[] => {
  const entries: RawVocabEntry[] = [];

  // EXACT MATCH of R's XPath: //details//div[@class='indented']//ul[@class='toggle']/li/details
  // This finds: details -> div.indented -> ul.toggle -> li -> details (word entries)
  const wordDetails = doc.querySelectorAll('details div.indented ul.toggle li details');

  wordDetails.forEach((detailsEl) => {
    // Get category from preceding h2
    const category = findPrecedingH2(detailsEl);

    // Get word name from summary
    const summary = detailsEl.querySelector('summary');
    const wordOrig = summary ? summary.textContent?.trim() || '' : '';

    if (!wordOrig) return;

  // Get all bullet points: .//ul/li (any ul/li descendant, matching R's XPath)
  const bullets: string[] = [];
  detailsEl.querySelectorAll('ul li').forEach((li: Element) => {
    const liText = li.textContent?.trim() || '';
    if (liText) bullets.push(liText);
  });

  // Categorize bullets - EXACT MATCH of R logic: str_starts(b, "Example") and str_starts(b, "Variants & Related Words")
  const defs: string[] = [];
  const exs: string[] = [];
  const rels: string[] = [];

  for (const b of bullets) {
    if (b.startsWith('Example')) {
      exs.push(b.replace(/^Example:?\s*/, ''));
    } else if (b.startsWith('Variants & Related Words')) {
      rels.push(b.replace(/^Variants & Related Words:?\s*/, ''));
    } else {
      defs.push(b);
    }
  }

  const definition = defs.join('\n');
  const example = exs.join('\n');

  // EXACT MATCH of R: if(length(rels) == 0) character(0) else str_split(paste(rels, collapse = ", "), ",\\s*")[[1]]
  let relatedWordsOrig: string[] = [];
  if (rels.length > 0) {
    relatedWordsOrig = rels.join(', ').split(/,\s*/);
    }

    entries.push({
      category,
      wordOrig,
      definition,
      example,
      relatedWordsOrig
    });
  });

  return entries;
};

// ============================================================
// INLINE COMMENTS PARSING
// ============================================================

interface RawComment {
  highlightWord: string;
  commentLines: string[];
}

const parseInlineComments = (doc: Document): RawComment[] => {
  const comments: RawComment[] = [];

  // Find the "Inline comments" section
  const allDetails = doc.querySelectorAll('details');
  let inlineCommentsSection: Element | null = null;

  for (const details of Array.from(allDetails)) {
    const summary = details.querySelector('summary');
    if (summary?.textContent?.includes('Inline comments')) {
      inlineCommentsSection = details;
      break;
    }
  }

  if (!inlineCommentsSection) {
    return comments;
  }

  // Find all paragraphs with "Block text" and <mark> elements
  // There can be multiple .indented divs, each containing one comment block
  const indentedDivs = inlineCommentsSection.querySelectorAll('.indented');
  
  indentedDivs.forEach((indentedDiv) => {
    // Find the paragraph with Block text
    const allParagraphs = indentedDiv.querySelectorAll('p');
    
    allParagraphs.forEach((pElement) => {
      // Check if this paragraph contains "Block text" in a <b> element
      const boldElement = pElement.querySelector('b');
      if (!boldElement || !boldElement.textContent?.includes('Block text')) return;

      // Extract the highlighted word from <mark> element
      const markElement = pElement.querySelector('mark');
      const highlightWord = markElement?.textContent?.trim() || '';
      if (!highlightWord) return;

      // Find the next sibling <ul> element to get comment content
      // Comments are in the <ul class="toggle"> that follows the <p>
      let commentContainer: Element | null = pElement.nextElementSibling;
      while (commentContainer && commentContainer.tagName !== 'UL') {
        commentContainer = commentContainer.nextElementSibling;
      }

      const commentLines: string[] = [];

      if (commentContainer) {
        // Get all <div> elements within <li> elements
        commentContainer.querySelectorAll('li > div').forEach((div) => {
          // Skip divs that contain user info
          if (div.querySelector('.user')) return;

          // Get inner HTML and process it
          let innerHtml = div.innerHTML || '';

          // Split on <br> tags
          innerHtml = innerHtml.replace(/<br\s*\/?>/gi, '\n');

          // Strip remaining HTML tags
          innerHtml = innerHtml.replace(/<[^>]+>/g, '');

          // Split into lines and clean
          const lines = innerHtml.split('\n').map(l => l.trim()).filter(l => l);
          commentLines.push(...lines);
        });
      }

      comments.push({
        highlightWord,
        commentLines
      });
    });
  });

  return comments;
};

// ============================================================
// COMMENT MATCHING ALGORITHM (3-TIER)
// ============================================================

const buildCommentHtml = (highlightWord: string, commentLines: string[]): string => {
  if (commentLines.length === 0) return '';
  
  return `<div style='margin-bottom:6px;'><div class='comment-header'>💭 ${highlightWord}</div><ul style='margin-left:15px;'>${commentLines.map(line => `<li class='comment-bullet'>${line}</li>`).join('')}</ul></div>`;
};

const matchCommentsToVocab = (
  vocabEntries: VocabWord[],
  rawComments: RawComment[]
): { unmatchedHighlights: string[] } => {
  const unmatchedHighlights: string[] = [];

  // Pre-compute normalized versions for matching (matching R's approach)
  const wordNorms = vocabEntries.map(w => w.Word_norm);
  const defNorms = vocabEntries.map(w => normalizeText(w.Definition));
  const exNorms = vocabEntries.map(w => normalizeText(w.Example));
  // R app concatenates related words into a single string for regex matching
  const relNorms = vocabEntries.map(w => normalizeText(w.Related_Words_orig.join(' ')));

  // Process each comment
  for (const comment of rawComments) {
    const { highlightWord, commentLines } = comment;
    const highlightLower = normalizeText(highlightWord);

    if (!highlightLower) continue;

    // TIER 1: Exact match with word_norm OR match in concatenated related words
    // R uses: word_norm == highlight_lower | stri_detect_regex(rel_norm, "\\bhighlight\\b")
    const matches: number[] = [];
    const regex = new RegExp(`\\b${escapeRegex(highlightLower)}\\b`, 'i');

    for (let i = 0; i < vocabEntries.length; i++) {
      if (wordNorms[i] === highlightLower || regex.test(relNorms[i])) {
        matches.push(i);
      }
    }

    // TIER 2: Match in definition or example (if no matches from tier 1)
    const defExMatches: number[] = [];
    if (matches.length === 0) {
      for (let i = 0; i < vocabEntries.length; i++) {
        if (regex.test(defNorms[i]) || regex.test(exNorms[i])) {
          defExMatches.push(i);
        }
      }
    }

    // Combine all matches
    const allMatches = [...new Set([...matches, ...defExMatches])];

    // Append comment to matched entries
    if (allMatches.length > 0) {
      const commentHtml = buildCommentHtml(highlightWord, commentLines);
      for (const idx of allMatches) {
        if (commentHtml) {
          vocabEntries[idx].My_Commentary.push(commentHtml);
        }
      }
    } else {
      // Track unmatched highlight
      unmatchedHighlights.push(highlightWord);
    }
  }

  return { unmatchedHighlights };
};

// ============================================================
// MAIN PARSE FUNCTION
// ============================================================

export interface ParseOptions {
  onProgress?: ProgressCallback;
}

export const parseHtmlFile = (
  htmlContent: string,
  fileName: string,
  options?: ParseOptions
): ParsedVocabData => {
  const { onProgress } = options || {};

  // Stage 1: Parse HTML
  onProgress?.('Reading file...', 5);
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Stage 2: Extract vocabulary entries
  onProgress?.('Extracting vocabulary entries...', 10);
  const vocabEntries = parseVocabularyEntries(doc);

  if (vocabEntries.length === 0) {
    throw new Error('No vocabulary entries found in the expected format.');
  }

  // Stage 3: Convert to VocabWord format
  onProgress?.('Processing entries...', 30);
  const rawComments = parseInlineComments(doc);

  let wordIndex = 0;
  const words: VocabWord[] = vocabEntries.map(entry => {
    const catSplit = entry.category.split('|');
    const categoryHigh = catSplit[0]?.trim() || '';
    const categoryLow = catSplit.length > 1 ? catSplit[1].trim() : '';

    return {
      id: wordIndex++,
      Category: entry.category,
      Category_High: categoryHigh,
      Category_Low: categoryLow,
      Word_orig: entry.wordOrig,
      Word_norm: normalizeForMatch(entry.wordOrig),
      Definition: entry.definition,
      Example: entry.example,
      Related_Words_orig: entry.relatedWordsOrig,
      Related_List_norm: entry.relatedWordsOrig.map(r => normalizeForMatch(r)),
      My_Commentary: []
    };
  });

  // Stage 4: Match comments
  onProgress?.('Matching comments...', 70);
  const { unmatchedHighlights } = matchCommentsToVocab(words, rawComments);

  // Stage 5: Calculate stats
  onProgress?.('Calculating statistics...', 90);
  const mainWords = words.filter(w => w.Word_norm !== '').map(w => w.Word_norm);
  const relatedWords = words.flatMap(w => w.Related_List_norm).filter(w => w !== '');
  const allWords = [...new Set([...mainWords, ...relatedWords])];

  const fileDateMatch = fileName.match(/\d{2}-\d{2}-\d{4}/);
  const fileDate = fileDateMatch ? fileDateMatch[0] : '(unknown)';

  // Complete
  onProgress?.('Complete!', 100);

  return {
    words,
    stats: {
      uniqueMainWords: new Set(mainWords).size,
      uniqueRelatedWords: new Set(relatedWords).size,
      totalUniqueWords: allWords.length
    },
    fileDate,
    unmatchedHighlights
  };
};

// ============================================================
// HELPER EXPORTS
// ============================================================

export const getAllWordsForSelector = (wordsData: VocabWord[]): { norm: string; orig: string }[] => {
  const result: { norm: string; orig: string }[] = [];

  wordsData.forEach(word => {
    if (word.Word_norm) {
      result.push({ norm: word.Word_norm, orig: word.Word_orig });
    }
    word.Related_Words_orig.forEach((rel, idx) => {
      if (rel && word.Related_List_norm[idx]) {
        result.push({ norm: word.Related_List_norm[idx], orig: rel });
      }
    });
  });

  return result;
};

// Re-export isSingleWord for use in UI
export { isSingleWord };
