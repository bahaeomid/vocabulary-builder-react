import { parseHtmlFile } from './src/parser.ts';
import * as fs from 'fs';

const html = fs.readFileSync('./public/data/Vocabulary Builder 08-12-2025.html', 'utf-8');
const result = parseHtmlFile(html, 'test.html');

console.log('Total entries parsed:', result.words.length);
console.log('Stats:', result.stats);
console.log('Unmatched highlights:', result.unmatchedHighlights);

// Check first 10 words
console.log('\nFirst 10 words:');
result.words.slice(0, 10).forEach((w, i) => {
  console.log(`${i+1}. "${w.Word_orig}" - Category: "${w.Category}"`);
});

// Check for category-level entries being parsed as words
const suspicious = result.words.filter(w => 
  w.Word_orig.includes('&') || 
  w.Word_orig.toLowerCase().includes('variant') ||
  w.Category === ''
);
if (suspicious.length > 0) {
  console.log('\nSuspicious entries (might be category headers):');
  suspicious.slice(0, 10).forEach(w => {
    console.log(`- "${w.Word_orig}"`);
  });
}
