// Test script to debug the parser
import { parseHtmlFile } from './dist/src/parser.js';

// Read the HTML file
const fs = require('fs');
const htmlContent = fs.readFileSync('public/data/Vocabulary Builder 08-12-2025.html', 'utf8');

console.log('Testing parser with HTML file...');
console.log('HTML length:', htmlContent.length);

try {
  const result = parseHtmlFile(htmlContent, 'Vocabulary Builder 08-12-2025.html');
  console.log('Parser result:');
  console.log('- Total words:', result.words.length);
  console.log('- File date:', result.fileDate);
  console.log('- Stats:', result.stats);
  console.log('- First word:', result.words[0]);
  console.log('- Categories found:', [...new Set(result.words.map(w => w.Category_High))]);
  console.log('- Unmatched highlights:', result.unmatchedHighlights);
} catch (error) {
  console.error('Parser error:', error.message);
  console.error('Stack:', error.stack);
}