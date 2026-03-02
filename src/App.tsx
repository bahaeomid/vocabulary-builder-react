import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import type { VocabWord, ParsedVocabData, ProcessStatus } from './types';
import { parseHtmlFile, findCloseMatches, normalizeForMatch } from './parser';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #f5f7fa;
    color: #333;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }

  .comment-header {
    font-weight: bold;
    cursor: pointer;
  }

  .comment-bullet {
    margin-left: 15px;
    font-style: italic;
    font-size: 0.9em;
    color: #555;
  }

  @media (max-width: 600px) {
    .nav-tabs > li > a {
      font-size: 13px;
      padding: 4px 8px !important;
    }
    .related-link {
      font-size: 12px;
      padding: 1px 3px;
    }
    .bullet-list {
      margin-left: 10px;
    }
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  width: 340px;
  background: white;
  border-right: 1px solid #e1e4e8;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    border-right: none;
    border-bottom: 1px solid #e1e4e8;
    max-height: 40vh;
  }
`;

const MainPanel = styled.main`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #fafbfc;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const UploadSection = styled.div`
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
  
  &:hover {
    border-color: #667eea;
    background: #f0f4ff;
  }
`;

const UploadLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #495057;
  font-size: 0.95rem;
  
  span {
    font-size: 0.8em;
    color: #6c757d;
    font-style: italic;
  }
  
  a {
    color: #4da6ff;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9rem;
  color: #495057;
  margin-bottom: 6px;
  display: block;
`;

const WordSelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  background: #4da6ff;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: #3d8fe0;
  }
  
  &:disabled {
    background: #c9cdd4;
    cursor: not-allowed;
  }
`;

const WordInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const WordDropdown = styled(Select)`
  flex: 1;
`;

const ProgressBarContainer = styled.div`
  position: relative;
  width: 100%;
  height: 20px;
  background-color: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.$percentage}%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-weight: 600;
  color: #333;
  line-height: 20px;
  font-size: 0.8rem;
`;

const EmojiLegend = styled.div`
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #6c757d;
`;

const CollapsibleBox = styled.div<{ $bgColor: string; $borderColor: string }>`
  border: 1px solid ${props => props.$borderColor};
  border-radius: 6px;
  background-color: ${props => props.$bgColor};
  font-size: 0.95em;
  overflow: hidden;
`;

const CollapsibleHeader = styled.div`
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
  
  &:hover {
    filter: brightness(0.98);
  }
`;

const CollapsibleContent = styled.div<{ $visible: boolean }>`
  display: ${props => props.$visible ? 'block' : 'none'};
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  line-height: 1.4;
`;

const UnmatchedWarning = styled(CollapsibleBox)`
  border-color: #ef9a9a;
  background-color: #ffebee;
  
  ${CollapsibleHeader} {
    color: #c62828;
  }
`;

const WordInfoCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
`;

const TabsContainer = styled.div`
  display: flex;
  background: #f1f3f5;
  border-bottom: 1px solid #dee2e6;
  overflow-x: auto;
  flex-wrap: nowrap;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#333' : '#6c757d'};
  font-size: 0.95rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  white-space: nowrap;
  border-radius: ${props => props.$active ? '8px 8px 0 0' : '0'};
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? 'white' : '#e9ecef'};
  }
`;

const TabContent = styled.div`
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: #495057;
  font-weight: 600;
`;

const WordDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WordText = styled.span`
  font-size: 1.1rem;
  font-weight: 500;
`;

const IconButton = styled.button<{ $copied?: boolean }>`
  border: none;
  background: ${props => props.$copied ? '#d4edda' : 'none'};
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const BulletList = styled.ul`
  margin-left: 20px;
  line-height: 1.6;
  
  li {
    margin-bottom: 6px;
  }
`;

const RelatedWordsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const RelatedWordChip = styled.span<{ $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  background-color: ${props => props.$bgColor};
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.9rem;
  
  a {
    text-decoration: none;
    color: #333;
    margin-right: 4px;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const CommentSection = styled.div`
  margin-top: 20px;
`;

const CommentHeader = styled.div`
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  
  &:hover {
    background: #e9ecef;
  }
`;

const CommentContent = styled.div<{ $visible: boolean }>`
  display: ${props => props.$visible ? 'block' : 'none'};
  margin-top: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
`;

const NoMatchCard = styled.div`
  padding: 24px;
  border: 1px solid #f5c2c7;
  border-radius: 8px;
  background-color: #fff5f5;
`;

const SuggestionButton = styled.button`
  margin: 4px;
  padding: 6px 12px;
  background-color: #f0f8ff;
  border: 1px solid #7ec0ff;
  border-radius: 4px;
  color: #00796b;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    background: #e0f0ff;
  }
`;

const DictLink = styled.a`
  color: #2e7d32;
  font-weight: bold;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ActiveIndicator = styled.div<{ $active: boolean }>`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.$active ? '#4CAF50' : '#bbb'};
  transition: background-color 0.3s;
  z-index: 9999;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  text-align: center;
  padding: 40px;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'loading' }>`
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  
  ${props => props.$type === 'success' && `
    background: #e8f5e9;
    border: 1px solid #c8e6c9;
    color: #2e7d32;
  `}
  
  ${props => props.$type === 'error' && `
    background: #ffebee;
    border: 1px solid #ffcdd2;
    color: #c62828;
  `}
  
  ${props => props.$type === 'loading' && `
    background: #e3f2fd;
    border: 1px solid #bbdefb;
    color: #1565c0;
  `}
`;

const SearchModeToggle = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  border: 1px solid ${props => props.$active ? '#667eea' : '#dee2e6'};
  background: ${props => props.$active ? '#667eea' : 'white'};
  color: ${props => props.$active ? 'white' : '#495057'};
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #667eea;
  }
`;

const App: React.FC = () => {
  const [vocabData, setVocabData] = useState<ParsedVocabData | null>(null);
  const [selectedHighCat, setSelectedHighCat] = useState<string>('All');
  const [selectedLowCat, setSelectedLowCat] = useState<string>('All');
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [wordInput, setWordInput] = useState<string>('');
  const [searchMode, setSearchMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [status, setStatus] = useState<ProcessStatus>({ type: 'loading', message: '' });
  const [showUnmatched, setShowUnmatched] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [showFileDetails, setShowFileDetails] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [autoLoadAttempted, setAutoLoadAttempted] = useState<boolean>(false);
  const [copiedWords, setCopiedWords] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const loadFile = useCallback(async (content: string, fileName: string, uploaded: boolean = false) => {
    try {
      setStatus({ type: 'loading', message: 'Processing file...' });

      const parsed = parseHtmlFile(content, fileName, {
        onProgress: (stage, percent) => {
          setStatus({ type: 'loading', message: `${stage} (${percent}%)` });
        }
      });
      setVocabData(parsed);
      
      const mainNorm: string[] = parsed.words.filter(w => w.Word_norm !== '').map(w => w.Word_norm);
      const relatedNorm: string[] = parsed.words.flatMap(w => w.Related_List_norm).filter(w => w !== '');
      const allWords: string[] = [...new Set([...mainNorm, ...relatedNorm])];
      
      if (allWords.length > 0) {
        setSelectedWord(allWords[0]);
        setWordInput(allWords[0]);
        setCurrentWordIndex(1);
      } else {
        setSelectedWord('');
        setWordInput('');
        setCurrentWordIndex(0);
      }
      
      const fileDateLine = uploaded 
        ? '<b>File Download Date:</b> Today' 
        : `<b>File Download Date:</b> ${parsed.fileDate}`;
      
      const statusHtml = `
        <div>
          <div style='cursor:pointer; font-weight:600;' onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
            ✅ Click to View File Details
          </div>
          <div style='display:none; padding-top:8px;'>
            ${fileDateLine}<br><br>
            <b>${parsed.stats.uniqueMainWords}</b> unique main words.<br>
            <b>${parsed.stats.uniqueRelatedWords}</b> unique related words.<br>
            <b>${parsed.stats.totalUniqueWords}</b> total unique words
          </div>
        </div>
      `;
      
      setStatus({ type: 'success', message: statusHtml });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus({
        type: 'error',
        message: `❌ Processing failed: ${errMsg}`
      });
    }
  }, []);
  
  useEffect(() => {
    if (!autoLoadAttempted) {
      setAutoLoadAttempted(true);

      // Try loading test sample first, then fall back to original file
      fetch('/data/vocabulary-test-sample.html')
        .then(response => {
          if (!response.ok) {
            // Fall back to original file
            return fetch('/data/Vocabulary Builder 08-12-2025.html');
          }
          return response;
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('No local HTML file found. Please upload one!');
          }
          return response.text();
        })
        .then(html => {
          loadFile(html, 'vocabulary-test-sample.html', false);
        })
        .catch(() => {
          setStatus({
            type: 'error',
            message: `<span style='font-size:1.1em;'>❌</span> No local HTML file found. Please upload one!`
          });
        });
    }
  }, [autoLoadAttempted, loadFile]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 500);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('WakeLock error:', err);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      loadFile(content, file.name, true);
    };
    reader.readAsText(file);
  };
  
  const getFilteredWords = useCallback((): VocabWord[] => {
    if (!vocabData) return [];
    
    let filtered = vocabData.words;
    
    if (selectedHighCat !== 'All') {
      filtered = filtered.filter(w => w.Category_High === selectedHighCat);
    }
    if (selectedLowCat !== 'All') {
      filtered = filtered.filter(w => w.Category_Low === selectedLowCat);
    }
    
    return filtered;
  }, [vocabData, selectedHighCat, selectedLowCat]);
  
  const getLowCatOptions = useCallback((): string[] => {
    if (!vocabData) return ['All'];
    
    const filtered = selectedHighCat === 'All' 
      ? vocabData.words 
      : vocabData.words.filter(w => w.Category_High === selectedHighCat);
    
    const lowCats = [...new Set(filtered.map(w => w.Category_Low).filter(c => c))];
    return ['All', ...lowCats.sort()];
  }, [vocabData, selectedHighCat]);
  
  const getHighCatOptions = useCallback((): string[] => {
    if (!vocabData) return ['All'];
    const highCats = [...new Set(vocabData.words.map(w => w.Category_High).filter(c => c))];
    return ['All', ...highCats.sort()];
  }, [vocabData]);

  const getFilteredAllWords = useCallback((): string[] => {
    const filtered = getFilteredWords();
    
    const mainNorm = filtered.filter(w => w.Word_norm !== '').map(w => w.Word_norm);
    const relatedNorm = filtered.flatMap(w => w.Related_List_norm).filter(w => w !== '');
    
    return [...new Set([...mainNorm, ...relatedNorm])];
  }, [getFilteredWords]);
  
  const handleNextWord = () => {
    const words = getFilteredAllWords();
    if (words.length === 0) return;
    
    const idx = words.indexOf(selectedWord);
    let newIdx;
    
    if (idx === -1) {
      // If selected word is not in the filtered list, go to first word
      newIdx = 0;
    } else if (idx === words.length - 1) {
      // If at the end, wrap to beginning
      newIdx = 0;
    } else {
      // Go to next word
      newIdx = idx + 1;
    }
    
    setSelectedWord(words[newIdx]);
    setWordInput(words[newIdx]);
    setCurrentWordIndex(newIdx + 1);
  };
  
  const handlePrevWord = () => {
    const words = getFilteredAllWords();
    if (words.length === 0) return;
    
    const idx = words.indexOf(selectedWord);
    let newIdx;
    
    if (idx === -1) {
      // If selected word is not in the filtered list, go to last word
      newIdx = words.length - 1;
    } else if (idx === 0) {
      // If at the beginning, wrap to end
      newIdx = words.length - 1;
    } else {
      // Go to previous word
      newIdx = idx - 1;
    }
    
    setSelectedWord(words[newIdx]);
    setWordInput(words[newIdx]);
    setCurrentWordIndex(newIdx + 1);
  };
  
  const handleWordSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const word = e.target.value;
    setSelectedWord(word);
    setWordInput(word);
    const words = getFilteredAllWords();
    const idx = words.indexOf(word);
    setCurrentWordIndex(idx >= 0 ? idx + 1 : 1);
  };
  
  const handleWordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWordInput(e.target.value);
    setSearchMode(true);
  };
  
  const handleWordInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const allWords = getFilteredAllWords();
      
      // Try exact match first (case-insensitive)
      const matchingWord = allWords.find(w => w.toLowerCase() === wordInput.toLowerCase());
      
      if (matchingWord) {
        setSelectedWord(matchingWord);
        const idx = allWords.indexOf(matchingWord);
        setCurrentWordIndex(idx >= 0 ? idx + 1 : 1);
        setSearchMode(false);
        return;
      }
      
      // If no exact match, try close matches
      const closeMatches = findCloseMatches(wordInput, allWords);
      if (closeMatches.length > 0) {
        setSelectedWord(closeMatches[0]);
        setWordInput(closeMatches[0]);
        const idx = allWords.indexOf(closeMatches[0]);
        setCurrentWordIndex(idx >= 0 ? idx + 1 : 1);
        setSearchMode(false);
        return;
      }
      
      // If no matches found, stay in search mode
      setSearchMode(true);
    }
  };
  
  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      setCopiedWords(prev => ({ ...prev, [word]: true }));
      setTimeout(() => {
        setCopiedWords(prev => ({ ...prev, [word]: false }));
      }, 800);
    } catch (err) {
      console.log('Failed to copy:', err);
    }
  };
  
  const handlePronounce = (word: string) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(word);
      msg.lang = 'en-US';
      window.speechSynthesis.speak(msg);
    } else {
      alert('Sorry, your browser does not support text-to-speech.');
    }
  };
  
  const toggleComments = (index: number) => {
    setShowComments(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const getWordMatches = (): VocabWord[] => {
    if (!vocabData || !selectedWord) return [];
    
    return vocabData.words.filter(w => 
      w.Word_norm === selectedWord || w.Related_List_norm.includes(selectedWord)
    );
  };
  
  const matches = getWordMatches();
  const allFilteredWords = getFilteredAllWords();
  const progressPercentage = allFilteredWords.length > 0 && currentWordIndex > 0
    ? Math.round((currentWordIndex / allFilteredWords.length) * 100) 
    : 0;
  
  const isSingleWord = (w: string): boolean => {
    return !/[,\/]|\s+vs\.?|\s+and\s+|&|\(|\)/.test(w);
  };
  
  const filteredDropdownOptions = useMemo(() => {
    if (!searchMode || !wordInput) return allFilteredWords;
    if (!wordInput.trim()) return allFilteredWords;
    
    return allFilteredWords.filter(w => 
      w.toLowerCase().includes(wordInput.toLowerCase())
    );
  }, [allFilteredWords, wordInput, searchMode]);
  
  const renderWordInfo = () => {
    if (!vocabData || !selectedWord) {
      return (
        <EmptyState>
          <EmptyIcon>📚</EmptyIcon>
          <h2>Welcome to Vocabulary Builder!</h2>
          <p>Upload an HTML file exported from Notion to get started.</p>
        </EmptyState>
      );
    }
    
    if (matches.length === 0) {
      const allWordList = [
        ...vocabData.words.map(w => w.Word_norm),
        ...vocabData.words.flatMap(w => w.Related_List_norm)
      ].filter(w => w);
      
      const closeMatches = findCloseMatches(selectedWord, allWordList);
      const dictLink = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(selectedWord.toLowerCase())}`;
      
      return (
        <NoMatchCard>
          <p style={{ color: '#c62828', fontWeight: 'bold' }}>
            ⚠️ No matches found for <u>{selectedWord}</u> in the Vocabulary Builder.
          </p>
          
          {closeMatches.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              Potential matches:{' '}
              {closeMatches.map(match => (
                <SuggestionButton key={match} onClick={() => {
                  setSelectedWord(match);
                  setWordInput(match);
                  const idx = allFilteredWords.indexOf(match);
                  if (idx >= 0) setCurrentWordIndex(idx + 1);
                }}>
                  {match}
                </SuggestionButton>
              ))}
            </div>
          )}
          
          <p>
            {closeMatches.length > 0 ? 'Or ' : ''}
            Look it up on{' '}
            <DictLink href={dictLink} target="_blank">
              📖 Merriam-Webster
            </DictLink>
          </p>
        </NoMatchCard>
      );
    }
    
    return (
      <WordInfoCard>
        <TabsContainer>
          {matches.map((match, idx) => {
            const isMain = match.Word_norm === selectedWord;
            const label = isMain ? `🟢 ${match.Word_orig}` : `🟠 ${match.Word_orig}`;
            
            return (
              <Tab
                key={match.id}
                $active={activeTab === idx}
                onClick={() => setActiveTab(idx)}
              >
                {label}
              </Tab>
            );
          })}
        </TabsContainer>
        
        <TabContent>
          {matches.map((match, idx) => {
            if (idx !== activeTab) return null;
            
            const allRelatedWords = [
              match.Word_orig,
              ...match.Related_Words_orig
            ].filter(w => w && w.trim() && isSingleWord(w));
            
            return (
              <div key={match.id}>
                <Section>
                  <SectionTitle>Category</SectionTitle>
                  <p>{match.Category || '-'}</p>
                </Section>
                
                <Section>
                  <SectionTitle>Word</SectionTitle>
                  <WordDisplay>
                    <WordText>{match.Word_orig}</WordText>
                    <IconButton 
                      onClick={() => handleCopyWord(match.Word_orig)} 
                      title="Copy"
                      $copied={copiedWords[match.Word_orig]}
                    >
                      {copiedWords[match.Word_orig] ? '✅' : '📋'}
                    </IconButton>
                    <IconButton onClick={() => handlePronounce(match.Word_orig)} title="Pronounce">
                      🔊
                    </IconButton>
                  </WordDisplay>
                </Section>
                
                <Section>
                  <SectionTitle>Definition</SectionTitle>
                  {match.Definition ? (
                    <BulletList>
                      {match.Definition.split('\n').map((def, i) => (
                        <li key={i}>{def}</li>
                      ))}
                    </BulletList>
                  ) : (
                    <p>-</p>
                  )}
                </Section>
                
                <Section>
                  <SectionTitle>Example(s)</SectionTitle>
                  {match.Example ? (
                    <BulletList>
                      {match.Example.split('\n').map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </BulletList>
                  ) : (
                    <p>-</p>
                  )}
                </Section>
                
{allRelatedWords.length > 0 && (
                 <Section>
                   <SectionTitle>See Also</SectionTitle>
                   <RelatedWordsGrid>
            {allRelatedWords.map((w, i) => {
              const normalizedW = normalizeForMatch(w);
              const bgColor = normalizedW === match.Word_norm
                ? '#d0f0c0'
                : normalizedW === selectedWord
                ? '#fcd580'
                : '#fefefe';

              return (
                <RelatedWordChip key={i} $bgColor={bgColor}>
                  <a
                    href={`https://www.merriam-webster.com/dictionary/${encodeURIComponent(w.toLowerCase())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {w}
                  </a>
                  <IconButton
                    onClick={() => {
                      // Navigate to related word (use normalized version for lookup)
                      const allWords = getFilteredAllWords();
                      if (allWords.includes(normalizedW)) {
                        setSelectedWord(normalizedW);
                        setWordInput(normalizedW);
                        const idx = allWords.indexOf(normalizedW);
                        setCurrentWordIndex(idx + 1);
                        setActiveTab(0); // Reset to first tab
                      }
                      // Also copy the word
                      handleCopyWord(w);
                    }}
                    title="Copy & Navigate"
                    $copied={copiedWords[w]}
                  >
                    {copiedWords[w] ? '✅' : '📋'}
                  </IconButton>
                </RelatedWordChip>
              );
            })}
                   </RelatedWordsGrid>
                 </Section>
                 )}
                
{(match.My_Commentary.length > 0 || (match.Definition && match.Definition !== 'User comment')) && (
                   <CommentSection>
                     <CommentHeader onClick={() => toggleComments(match.id)}>
                       📝 {match.My_Commentary.length > 0 ? 'My Commentary' : 'User Comment'} {showComments[match.id] ? '▼' : '▶'}
                     </CommentHeader>
                     <CommentContent $visible={showComments[match.id]}>
                       {match.My_Commentary.length > 0 ? (
                         <div dangerouslySetInnerHTML={{ 
                           __html: match.My_Commentary.join('') 
                         }} />
                       ) : (
                         <div>
                           {match.Definition.split('\n').map((line, i) => (
                             <p key={i} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                               {line}
                             </p>
                           ))}
                         </div>
                       )}
                     </CommentContent>
                   </CommentSection>
                 )}
              </div>
            );
          })}
        </TabContent>
      </WordInfoCard>
);
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          <Title>📖 Vocabulary Builder</Title>
        </Header>
        
        <MainContent>
          <Sidebar>
            <UploadSection>
              <UploadLabel>
                📤 Upload Your HTML File
                <span>
                  (Click <a 
                    href="https://www.notion.so/Vocabulary-Builder-10a64bc18fb280c5a9e8d065c88f6c2f?source=copy_link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    here
                  </a> to export from Notion)
                </span>
                <small style={{ fontSize: '0.75em', color: '#6c757d', marginTop: '4px', display: 'block' }}>
                  Supports Notion HTML exports with vocabulary data
                </small>
                <HiddenInput
                  ref={fileInputRef}
                  type="file"
                  accept=".html"
                  onChange={handleFileUpload}
                />
              </UploadLabel>
            </UploadSection>
            
            {vocabData && (
              <>
                <div>
                  <Label>📂 Category</Label>
                  <Select 
                    value={selectedHighCat} 
                    onChange={(e) => {
                      setSelectedHighCat(e.target.value);
                      setSelectedLowCat('All');
                    }}
                  >
                    {getHighCatOptions().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label>🗃️ Subcategory</Label>
                  <Select 
                    value={selectedLowCat} 
                    onChange={(e) => setSelectedLowCat(e.target.value)}
                  >
                    {getLowCatOptions().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label>🔍 Search Word</Label>
                  <WordSelectorContainer>
                    <NavButton onClick={handlePrevWord} disabled={allFilteredWords.length === 0}>
                      ◀
                    </NavButton>
                    {searchMode ? (
                      <WordInput 
                        type="text"
                        value={wordInput}
                        onChange={handleWordInputChange}
                        onKeyDown={handleWordInputKeyDown}
                        placeholder="Type and press Enter..."
                        autoFocus
                      />
                    ) : (
                      <WordDropdown 
                        value={selectedWord} 
                        onChange={handleWordSelect}
                      >
                        {filteredDropdownOptions.map(word => {
                          const orig = vocabData.words.find(w => w.Word_norm === word)?.Word_orig || word;
                          return (
                            <option key={word} value={word}>{orig}</option>
                          );
                        })}
                      </WordDropdown>
                    )}
                    <NavButton onClick={handleNextWord} disabled={allFilteredWords.length === 0}>
                      ▶
                    </NavButton>
                  </WordSelectorContainer>
                  <SearchModeToggle 
                    $active={searchMode}
                    onClick={() => setSearchMode(!searchMode)}
                    style={{ marginTop: '8px', width: '100%' }}
                  >
                    {searchMode ? 'Switch to Dropdown' : 'Switch to Search'}
                  </SearchModeToggle>
                </div>
                
                {selectedWord && allFilteredWords.length > 0 && (
                  <div>
                    <ProgressBarContainer>
                      <ProgressFill $percentage={progressPercentage} />
                      <ProgressText>Word {currentWordIndex} of {allFilteredWords.length}</ProgressText>
                    </ProgressBarContainer>
                  </div>
                )}
                
                <EmojiLegend>
                  <span>🟢 Main</span>
                  <span>🟠 Selected Related</span>
                </EmojiLegend>
              </>
            )}
            
            <StatusMessage 
              $type={status.type}
              dangerouslySetInnerHTML={{ __html: status.message }}
              onClick={() => {
                if (status.type === 'success') {
                  setShowFileDetails(!showFileDetails);
                }
              }}
              style={{ cursor: status.type === 'success' ? 'pointer' : 'default' }}
            />
            
            {vocabData && vocabData.unmatchedHighlights.length > 0 && (
              <UnmatchedWarning 
                $bgColor="#ffebee" 
                $borderColor="#ef9a9a"
              >
                <CollapsibleHeader onClick={() => setShowUnmatched(!showUnmatched)}>
                  <span>⚠️</span> 
                  Click to View Unmatched Comments
                  {showUnmatched ? ' ▼' : ' ▶'}
                </CollapsibleHeader>
                <CollapsibleContent $visible={showUnmatched}>
                  {vocabData.unmatchedHighlights.join(', ')}
                </CollapsibleContent>
              </UnmatchedWarning>
            )}
          </Sidebar>
          
          <MainPanel>
            {status.type === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '2em', marginBottom: '16px' }}>⏳</div>
              <p>{status.message}</p>
            </div>
          ) : renderWordInfo()}
          </MainPanel>
        </MainContent>
        
        <ActiveIndicator $active={isActive} />
      </AppContainer>
    </>
  );
};

export default App;
