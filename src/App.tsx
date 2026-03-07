import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import type { VocabWord, ParsedVocabData, ProcessStatus } from './types';
import { parseHtmlFile, findCloseMatches, normalizeForMatch } from './parser';

const GlobalStyle = createGlobalStyle<{ $dark: boolean }>`
  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: ${props => props.$dark ? '#1a1a2e' : '#f5f7fa'};
    color: ${props => props.$dark ? '#e8e8ef' : '#2d2d2d'};
  }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${props => props.$dark ? '#252540' : '#f1f1f1'}; }
  ::-webkit-scrollbar-thumb { background: ${props => props.$dark ? '#404060' : '#c1c1c1'}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${props => props.$dark ? '#505070' : '#a1a1a1'}; }
`;

const SearchableSelect = styled.div`position: relative; flex: 1;`;

const SearchInput = styled.input<{ $dark: boolean }>`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${props => props.$dark ? '#404060' : '#d8dde2'};
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
  color: ${props => props.$dark ? '#e8e8ef' : '#2d2d2d'};
  &:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15); }
`;

const SearchDropdown = styled.div<{ $visible: boolean; $dark: boolean }>`
  display: ${props => props.$visible ? 'block' : 'none'};
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
  border: 1px solid ${props => props.$dark ? '#404060' : '#d8dde2'};
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const SearchOption = styled.div<{ $selected: boolean; $dark: boolean }>`
  padding: 10px 14px;
  cursor: pointer;
  font-size: 0.95rem;
  background: ${props => props.$selected ? 'rgba(102, 126, 234, 0.15)' : 'transparent'};
  color: ${props => props.$dark ? '#e8e8ef' : '#2d2d2d'};
  &:hover { background: ${props => props.$dark ? '#303050' : '#f0f4ff'}; }
`;

const AppContainer = styled.div`
  display: flex; 
  flex-direction: column; 
  height: 100vh; 
  overflow: hidden;
`;

const Header = styled.header<{ $dark: boolean }>`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 18px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    padding: 12px 16`;

const Title = styled.h1`
px;
  }
  margin: 0; 
  font-size: 1.5rem; 
  font-weight: 600; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  letter-spacing: -0.3px;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    gap: 8px;
  }
`;

const ThemeToggle = styled.button<{ $isMobile?: boolean }>`
  width: 38px; height: 38px;
  border: none; border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: white; font-size: 1.1rem;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.25); }

  @media (max-width: 768px) {
    width: 36px; height: 36px;
    font-size: 1rem;
  }
`;

const MobileMenuButton = styled.button<{ $dark: boolean }>`
  display: none;
  width: 38px; height: 38px;
  border: none; border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: white; font-size: 1.2rem;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.25); }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MainContent = styled.div<{ $dark: boolean }>`
  display: flex; flex: 1; overflow: hidden;
  background: ${props => props.$dark ? '#1a1a2e' : '#f5f7fa'};
`;

const Sidebar = styled.aside<{ $dark: boolean; $isOpen: boolean }>`
  width: 360px;
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
  border-right: 1px solid ${props => props.$dark ? '#353550' : '#e4e8ec'};
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: transform 0.3s ease;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 85%;
    max-width: 320px;
    z-index: 200;
    transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(-100%)'};
    box-shadow: ${props => props.$isOpen ? '4px 0 20px rgba(0, 0, 0, 0.3)' : 'none'};
    padding-top: 80px;
    background: ${props => props.$dark ? 'rgba(37, 37, 64, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(4px);
  }
`;

const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: 150;
  }
`;

const MainPanel = styled.main<{ $dark: boolean }>`
  flex: 1;
  padding: 28px 36px;
  overflow-y: auto;
  background: ${props => props.$dark ? '#1a1a2e' : '#f8f9fb'};

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const UploadSection = styled.div<{ $dark: boolean }>`
  background: ${props => props.$dark ? '#303050' : '#f8f9fa'};
  border: 2px dashed ${props => props.$dark ? '#404060' : '#d8dde2'};
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  &:hover { border-color: #667eea; background: ${props => props.$dark ? '#383860' : '#f0f4ff'}; }
`;

const UploadLabel = styled.label<{ $dark: boolean }>`
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer;
  color: ${props => props.$dark ? '#a0a0b5' : '#5a5a6a'};
  font-size: 0.95rem;
  span { font-size: 0.8em; color: ${props => props.$dark ? '#707090' : '#7a7a8a'}; }
  a { color: #6b8cff; text-decoration: none; &:hover { text-decoration: underline; } }
`;

const HiddenInput = styled.input`display: none;`;

const CategoryDropdown = styled.div<{ $visible: boolean; $dark: boolean }>`
  display: ${props => props.$visible ? 'block' : 'none'};
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
  border: 1px solid ${props => props.$dark ? '#404060' : '#d8dde2'};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const CategoryOption = styled.div<{ $selected: boolean; $dark: boolean }>`
  padding: 10px 14px;
  cursor: pointer;
  font-size: 0.9rem;
  background: ${props => props.$selected ? 'rgba(102, 126, 234, 0.15)' : 'transparent'};
  color: ${props => props.$dark ? '#e8e8ef' : '#2d2d2d'};
  &:hover { background: ${props => props.$dark ? '#303050' : '#f0f4ff'}; }
`;

const Label = styled.label<{ $dark: boolean }>`
  font-weight: 600;
  font-size: 0.85rem;
  color: ${props => props.$dark ? '#9090a5' : '#5a5a6a'};
  margin-bottom: 8px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const WordSelectorContainer = styled.div`display: flex; align-items: center; gap: 10px;`;

const NavButton = styled.button<{ $dark: boolean }>`
  width: 44px; height: 44px;
  border: none; border-radius: 8px;
  background: #667eea;
  color: white; font-size: 1rem;
  cursor: pointer;
  &:hover { background: #5568d3; }
  &:disabled { background: ${props => props.$dark ? '#404060' : '#c8ccd4'}; cursor: not-allowed; }
`;

const ProgressBarContainer = styled.div<{ $dark: boolean }>`
  position: relative;
  width: 100%;
  height: 6px;
  background: ${props => props.$dark ? '#353550' : '#e8ecf0'};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  position: absolute; left: 0; top: 0; height: 100%;
  width: ${props => props.$percentage}%;
  background: linear-gradient(90deg, #667eea 0%, #8b5cf6 100%);
  border-radius: 3px;
`;

const ProgressText = styled.div<{ $dark: boolean }>`
  text-align: center;
  font-weight: 600;
  color: ${props => props.$dark ? '#9090a5' : '#5a5a6a'};
  font-size: 0.8rem;
  margin-top: 8px;
`;

const EmojiLegend = styled.div<{ $dark: boolean }>`
  display: flex; gap: 14px;
  font-size: 0.82rem;
  color: ${props => props.$dark ? '#707090' : '#7a7a8a'};
`;

const WordInfoCard = styled.div<{ $dark: boolean }>`
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid ${props => props.$dark ? '#353550' : '#e4e8ec'};
`;

const TabsContainer = styled.div<{ $dark: boolean }>`
  display: flex;
  background: ${props => props.$dark ? '#1a1a2e' : '#f3f5f8'};
  border-bottom: 1px solid ${props => props.$dark ? '#353550' : '#e4e8ec'};
  overflow-x: auto;
  flex-wrap: nowrap;
  padding: 6px;
  gap: 4px;
`;

const Tab = styled.button<{ $active: boolean; $dark: boolean }>`
  padding: 10px 18px;
  border: none;
  background: ${props => props.$active ? (props.$dark ? '#252540' : '#ffffff') : 'transparent'};
  color: ${props => props.$active ? (props.$dark ? '#e8e8ef' : '#2d2d2d') : (props.$dark ? '#707090' : '#7a7a8a')};
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  white-space: nowrap;
  border-radius: 6px;
  font-family: inherit;
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
  &:hover { background: ${props => props.$active ? (props.$dark ? '#252540' : '#ffffff') : (props.$dark ? '#303050' : '#f0f4ff')}; }
`;

const TabContent = styled.div<{ $dark: boolean }>`
  padding: 28px;
  background: ${props => props.$dark ? '#252540' : '#ffffff'};
`;

const Section = styled.div`margin-bottom: 24px; &:last-child { margin-bottom: 0; }`;

const SectionTitle = styled.h3<{ $dark: boolean }>`
  margin: 0 0 10px 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-weight: 600;
  color: ${props => props.$dark ? '#707090' : '#7a7a8a'};
`;

const WordDisplay = styled.div`display: flex; align-items: center; gap: 10px;`;

const WordText = styled.span<{ $dark: boolean }>`
  font-size: 1.6rem;
  font-weight: 600;
  color: ${props => props.$dark ? '#e8e8ef' : '#1a1a2e'};
  letter-spacing: -0.3px;
`;

const IconButton = styled.button<{ $copied?: boolean; $dark?: boolean }>`
  border: none;
  background: ${props => props.$copied ? 'rgba(16, 185, 129, 0.15)' : 'transparent'};
  cursor: pointer;
  font-size: 1.1rem;
  padding: 6px 8px;
  border-radius: 6px;
  &:hover { background: ${props => props.$dark ? '#303050' : '#f0f0f0'}; }
`;

const BulletList = styled.ul<{ $dark: boolean }>`
  margin: 0;
  padding-left: 22px;
  line-height: 1.75;
  color: ${props => props.$dark ? '#b0b0c0' : '#4a4a5a'};
  li { margin-bottom: 8px; &:last-child { margin-bottom: 0; } }
`;

const RelatedWordsGrid = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`;

const RelatedWordChip = styled.span<{ $dark: boolean; $isMain: boolean; $isSelected: boolean }>`
  display: inline-flex;
  align-items: center;
  background: ${props => props.$isMain ? (props.$dark ? '#1a3a2a' : '#d4edda') : props.$isSelected ? (props.$dark ? '#3a3520' : '#fff3cd') : (props.$dark ? '#2a2a3a' : '#f5f5f5')};
  border: 1px solid ${props => props.$isMain ? (props.$dark ? '#2a5a4a' : '#c3e6cb') : props.$isSelected ? (props.$dark ? '#5a5a30' : '#ffeeba') : (props.$dark ? '#404060' : '#e0e0e0')};
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.9rem;
  a { text-decoration: none; color: ${props => props.$dark ? '#c8d0e0' : '#3a3a4a'}; margin-right: 6px; &:hover { color: #8b9fff; } }
`;

const CommentSection = styled.div`margin-top: 24px;`;

const CommentHeader = styled.div<{ $dark: boolean }>`
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: ${props => props.$dark ? '#303050' : '#f5f5f5'};
  border-radius: 8px;
  color: ${props => props.$dark ? '#b0b0c0' : '#5a5a6a'};
  font-size: 0.9rem;
  &:hover { background: ${props => props.$dark ? '#383860' : '#eaeaea'}; }
`;

const CommentContent = styled.div<{ $visible: boolean; $dark: boolean }>`
  display: ${props => props.$visible ? 'block' : 'none'};
  margin-top: 10px;
  padding: 14px;
  background: ${props => props.$dark ? '#303050' : '#f5f5f5'};
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.65;
  color: ${props => props.$dark ? '#b0b0c0' : '#4a4a5a'};
`;

const NoMatchCard = styled.div<{ $dark: boolean }>`
  padding: 28px;
  border: 1px solid ${props => props.$dark ? '#504040' : '#f5c2c7'};
  border-radius: 12px;
  background: ${props => props.$dark ? '#3a2020' : '#fff5f5'};
`;

const SuggestionButton = styled.button<{ $dark: boolean }>`
  margin: 4px 6px;
  padding: 8px 14px;
  background: ${props => props.$dark ? '#303050' : '#f0f4ff'};
  border: 1px solid ${props => props.$dark ? '#404060' : '#c8d8ff'};
  border-radius: 6px;
  color: ${props => props.$dark ? '#a0b0ff' : '#4a6ada'};
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  font-family: inherit;
  &:hover { background: ${props => props.$dark ? '#404060' : '#e0e8ff'}; }
`;

const DictLink = styled.a<{ $dark: boolean }>`
  color: ${props => props.$dark ? '#34d399' : '#16a34a'};
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const EmptyState = styled.div<{ $dark: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.$dark ? '#707090' : '#7a7a8a'};
  text-align: center;
  padding: 40px;
`;

const EmptyIcon = styled.div`font-size: 4rem; margin-bottom: 16px; opacity: 0.45;`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'loading'; $dark: boolean }>`
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  ${props => props.$type === 'success' && `background: ${props.$dark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7'}; border: 1px solid ${props.$dark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0'};`}
  ${props => props.$type === 'error' && `background: ${props.$dark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2'}; border: 1px solid ${props.$dark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}; color: ${props.$dark ? '#f87171' : '#dc2626'};`}
  ${props => props.$type === 'loading' && `background: ${props.$dark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff'}; border: 1px solid ${props.$dark ? 'rgba(99, 102, 241, 0.3)' : '#c7d2fe'}; color: ${props.$dark ? '#818cf8' : '#6366f1'};`}
`;

const ActiveIndicator = styled.div<{ $active: boolean }>`
  position: fixed; bottom: 20px; left: 20px;
  width: 10px; height: 10px; border-radius: 50%;
  background-color: ${props => props.$active ? '#10b981' : '#94a3b8'};
  z-index: 9999;
`;

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [vocabData, setVocabData] = useState<ParsedVocabData | null>(null);
  const [selectedHighCat, setSelectedHighCat] = useState<string>('All');
  const [selectedLowCat, setSelectedLowCat] = useState<string>('All');
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [highCatSearch, setHighCatSearch] = useState<string>('');
  const [showHighCatDropdown, setShowHighCatDropdown] = useState<boolean>(false);
  const [lowCatSearch, setLowCatSearch] = useState<string>('');
  const [showLowCatDropdown, setShowLowCatDropdown] = useState<boolean>(false);
  const [highCatHighlight, setHighCatHighlight] = useState<number>(-1);
  const [lowCatHighlight, setLowCatHighlight] = useState<number>(-1);
  const [highCatFocused, setHighCatFocused] = useState<boolean>(false);
  const [lowCatFocused, setLowCatFocused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [status, setStatus] = useState<ProcessStatus>({ type: 'loading', message: '' });
  const [showUnmatched, setShowUnmatched] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [showFileDetails, setShowFileDetails] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [autoLoadAttempted, setAutoLoadAttempted] = useState<boolean>(false);
  const [copiedWords, setCopiedWords] = useState<Record<string, boolean>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (content: string, fileName: string) => {
    try {
      setStatus({ type: 'loading', message: 'Processing file...' });
      const parsed = parseHtmlFile(content, fileName, { onProgress: (stage, percent) => setStatus({ type: 'loading', message: `${stage} (${percent}%)` }) });
      setVocabData(parsed);
      const mainNorm: string[] = parsed.words.filter(w => w.Word_norm !== '').map(w => w.Word_norm);
      const relatedNorm: string[] = parsed.words.flatMap(w => w.Related_List_norm).filter(w => w !== '');
      const allWords: string[] = [...new Set([...mainNorm, ...relatedNorm])];
      if (allWords.length > 0) { setSelectedWord(allWords[0]); setCurrentWordIndex(1); } else { setSelectedWord(''); setCurrentWordIndex(0); }
      setStatus({ type: 'success', message: '✅ File loaded successfully!' });
    } catch (error) {
      setStatus({ type: 'error', message: `❌ Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }, []);
  
  useEffect(() => {
    if (!autoLoadAttempted) {
      setAutoLoadAttempted(true);
      fetch('/data/Vocabulary Builder 08-12-2025.html')
        .then(response => { if (!response.ok) return fetch('/data/vocabulary-test-sample.html'); return response; })
        .then(response => { if (!response.ok) throw new Error('No local HTML file found. Please upload one!'); return response.text(); })
        .then(html => loadFile(html, 'Vocabulary Builder 08-12-2025.html'))
        .catch(() => setStatus({ type: 'error', message: `<span style='font-size:1.1em;'>❌</span> No local HTML file found. Please upload one!` }));
    }
  }, [autoLoadAttempted, loadFile]);
  
  useEffect(() => {
    const interval = setInterval(() => { setIsActive(true); setTimeout(() => setIsActive(false), 500); }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} };
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') requestWakeLock(); else if (wakeLock) { wakeLock.release(); wakeLock = null; } };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); if (wakeLock) wakeLock.release(); };
  }, []);

  useEffect(() => {
    if (!vocabData || !selectedWord) return;
    const filteredWords = getFilteredAllWords();
    if (filteredWords.length > 0 && !filteredWords.includes(selectedWord)) { setSelectedWord(filteredWords[0]); setCurrentWordIndex(1); setActiveTab(0); }
  }, [vocabData, selectedHighCat, selectedLowCat]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => loadFile(e.target?.result as string, file.name);
    reader.readAsText(file);
  };
  
  const getFilteredWords = useCallback((): VocabWord[] => {
    if (!vocabData) return [];
    let filtered = vocabData.words;
    if (selectedHighCat !== 'All') filtered = filtered.filter(w => w.Category_High === selectedHighCat);
    if (selectedLowCat !== 'All') filtered = filtered.filter(w => w.Category_Low === selectedLowCat);
    return filtered;
  }, [vocabData, selectedHighCat, selectedLowCat]);

  const getLowCatOptions = useCallback((): string[] => {
    if (!vocabData) return ['All'];
    const filtered = selectedHighCat === 'All' ? vocabData.words : vocabData.words.filter(w => w.Category_High === selectedHighCat);
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
    const newIdx = idx === -1 ? 0 : idx === words.length - 1 ? 0 : idx + 1;
    const newWord = words[newIdx];
    setSelectedWord(newWord);
    setSearchTerm(vocabData?.words.find(w => w.Word_norm === newWord)?.Word_orig || newWord);
    setCurrentWordIndex(newIdx + 1);
    setIsMobileSidebarOpen(false);
  };

  const handlePrevWord = () => {
    const words = getFilteredAllWords();
    if (words.length === 0) return;
    const idx = words.indexOf(selectedWord);
    const newIdx = idx === -1 ? words.length - 1 : idx === 0 ? words.length - 1 : idx - 1;
    const newWord = words[newIdx];
    setSelectedWord(newWord);
    setSearchTerm(vocabData?.words.find(w => w.Word_norm === newWord)?.Word_orig || newWord);
    setCurrentWordIndex(newIdx + 1);
    setIsMobileSidebarOpen(false);
  };

  const handleCopyWord = async (word: string) => {
    try { await navigator.clipboard.writeText(word); setCopiedWords(prev => ({ ...prev, [word]: true })); setTimeout(() => setCopiedWords(prev => ({ ...prev, [word]: false })), 800); } catch (err) {}
  };
  
  const handlePronounce = (word: string) => { if ('speechSynthesis' in window) { const msg = new SpeechSynthesisUtterance(word); msg.lang = 'en-US'; window.speechSynthesis.speak(msg); } };
  
  const toggleComments = (index: number) => setShowComments(prev => ({ ...prev, [index]: !prev[index] }));
  
  const getWordMatches = (): VocabWord[] => { if (!vocabData || !selectedWord) return []; return vocabData.words.filter(w => w.Word_norm === selectedWord || w.Related_List_norm.includes(selectedWord)); };

  const matches = getWordMatches();
  const allFilteredWords = getFilteredAllWords();
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return allFilteredWords;
    const term = searchTerm.toLowerCase();
    return allFilteredWords.filter((word: string) => { const orig = vocabData?.words.find(w => w.Word_norm === word)?.Word_orig || word; return word.toLowerCase().includes(term) || orig.toLowerCase().includes(term); });
  }, [searchTerm, allFilteredWords, vocabData]);

  useEffect(() => setActiveTab(0), [selectedWord]);

  const progressPercentage = allFilteredWords.length > 0 && currentWordIndex > 0 ? Math.round((currentWordIndex / allFilteredWords.length) * 100) : 0;
  
  const isSingleWord = (w: string): boolean => !/[,\/]|\s+vs\.?|\s+and\s+|&|\(|\)/.test(w);

  const renderWordInfo = () => {
    if (!vocabData || !selectedWord) {
      return (
        <EmptyState $dark={darkMode}>
          <EmptyIcon>📚</EmptyIcon>
          <h2 style={{ margin: '0 0 10px', fontWeight: 600 }}>Welcome to Vocabulary Builder!</h2>
          <p style={{ margin: 0 }}>Upload an HTML file exported from Notion to get started.</p>
        </EmptyState>
      );
    }
    
    if (matches.length === 0) {
      const allWordList = [...vocabData.words.map(w => w.Word_norm), ...vocabData.words.flatMap(w => w.Related_List_norm)].filter(w => w);
      const closeMatches = findCloseMatches(selectedWord, allWordList);
      const dictLink = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(selectedWord.toLowerCase())}`;
      
      return (
        <NoMatchCard $dark={darkMode}>
          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>⚠️ No matches found for <u>{selectedWord}</u></p>
          {closeMatches.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              Suggestions:{' '}
              {closeMatches.map(match => <SuggestionButton key={match} $dark={darkMode} onClick={() => { setSelectedWord(match); const idx = allFilteredWords.indexOf(match); if (idx >= 0) setCurrentWordIndex(idx + 1); }}>{match}</SuggestionButton>)}
            </div>
          )}
          <p>Look it up on <DictLink $dark={darkMode} href={dictLink} target="_blank">📖 Merriam-Webster</DictLink></p>
        </NoMatchCard>
      );
    }
    
    return (
      <WordInfoCard $dark={darkMode}>
        <TabsContainer $dark={darkMode}>
          {matches.map((match, idx) => <Tab key={match.id} $active={activeTab === idx} $dark={darkMode} onClick={() => setActiveTab(idx)}>{match.Word_norm === selectedWord ? `🟢 ${match.Word_orig}` : `🟠 ${match.Word_orig}`}</Tab>)}
        </TabsContainer>
        
        <TabContent $dark={darkMode}>
          {matches.map((match, idx) => {
            if (idx !== activeTab) return null;
            const allRelatedWords = [match.Word_orig, ...match.Related_Words_orig].filter(w => w && w.trim() && isSingleWord(w));
            
            return (
              <div key={match.id}>
                <Section><SectionTitle $dark={darkMode}>Category</SectionTitle><p style={{ margin: 0, color: darkMode ? '#b0b0c0' : '#5a5a6a' }}>{match.Category || '-'}</p></Section>
                <Section>
                  <SectionTitle $dark={darkMode}>Word</SectionTitle>
                  <WordDisplay>
                    <WordText $dark={darkMode}>{match.Word_orig}</WordText>
                    <IconButton onClick={() => handleCopyWord(match.Word_orig)} title="Copy" $copied={copiedWords[match.Word_orig]} $dark={darkMode}>{copiedWords[match.Word_orig] ? '✅' : '📋'}</IconButton>
                    <IconButton onClick={() => handlePronounce(match.Word_orig)} title="Pronounce">🔊</IconButton>
                  </WordDisplay>
                </Section>
                <Section>
                  <SectionTitle $dark={darkMode}>Definition</SectionTitle>
                  {match.Definition ? <BulletList $dark={darkMode}>{match.Definition.split('\n').map((def, i) => <li key={i}>{def}</li>)}</BulletList> : <p style={{ margin: 0, color: darkMode ? '#707090' : '#8a8a9a' }}>-</p>}
                </Section>
                <Section>
                  <SectionTitle $dark={darkMode}>Example(s)</SectionTitle>
                  {match.Example ? <BulletList $dark={darkMode}>{match.Example.split('\n').map((ex, i) => <li key={i}>{ex}</li>)}</BulletList> : <p style={{ margin: 0, color: darkMode ? '#707090' : '#8a8a9a' }}>-</p>}
                </Section>
                {allRelatedWords.length > 0 && (
                  <Section>
                    <SectionTitle $dark={darkMode}>See Also</SectionTitle>
                    <RelatedWordsGrid>
                      {allRelatedWords.map((w, i) => {
                        const normalizedW = normalizeForMatch(w);
                        const isMain = normalizedW === match.Word_norm;
                        const isSelected = normalizedW === selectedWord;
                        return (
                          <RelatedWordChip key={i} $dark={darkMode} $isMain={isMain} $isSelected={isSelected}>
                            <a href={`https://www.merriam-webster.com/dictionary/${encodeURIComponent(w.toLowerCase())}`} target="_blank" rel="noopener noreferrer">{w}</a>
                            <IconButton onClick={() => handleCopyWord(w)} $copied={copiedWords[w]} $dark={darkMode}>{copiedWords[w] ? '✅' : '📋'}</IconButton>
                          </RelatedWordChip>
                        );
                      })}
                    </RelatedWordsGrid>
                  </Section>
                )}
                {match.My_Commentary.length > 0 && (
                  <CommentSection>
                    <CommentHeader $dark={darkMode} onClick={() => toggleComments(match.id)}>📝 My Commentary {showComments[match.id] ? '▼' : '▶'}</CommentHeader>
                    <CommentContent $visible={showComments[match.id] || false} $dark={darkMode}><div dangerouslySetInnerHTML={{ __html: match.My_Commentary.join('') }} /></CommentContent>
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
      <GlobalStyle $dark={darkMode} />
      <AppContainer>
        <Header $dark={darkMode}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MobileMenuButton $dark={darkMode} onClick={() => setIsMobileSidebarOpen(true)}>☰</MobileMenuButton>
            <Title>📖 Vocabulary Builder</Title>
          </div>
          <ThemeToggle onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️' : '🌙'}</ThemeToggle>
        </Header>
        
        <MainContent $dark={darkMode}>
          <SidebarOverlay $isOpen={isMobileSidebarOpen} onClick={() => setIsMobileSidebarOpen(false)} />
          <Sidebar $dark={darkMode} $isOpen={isMobileSidebarOpen}>
            <UploadSection $dark={darkMode}>
              <UploadLabel $dark={darkMode}>
                📤 Upload Your HTML File
                <span>(Click <a href="https://www.notion.so/Vocabulary-Builder-10a64bc18fb280c5a9e8d065c88f6c2f?source=copy_link" target="_blank" rel="noopener noreferrer">here</a> to export)</span>
                <small style={{ fontSize: '0.75em', color: darkMode ? '#606080' : '#8a8a9a', marginTop: '4px', display: 'block' }}>Supports Notion HTML exports</small>
                <HiddenInput ref={fileInputRef} type="file" accept=".html" onChange={handleFileUpload} />
              </UploadLabel>
            </UploadSection>
            
            {vocabData && (
              <>
                <div>
                  <Label $dark={darkMode}>📂 Category</Label>
                  <WordSelectorContainer>
                    <NavButton $dark={darkMode} onClick={() => { const opts = getHighCatOptions(); const idx = opts.indexOf(selectedHighCat); const newIdx = idx <= 0 ? opts.length - 1 : idx - 1; setSelectedHighCat(opts[newIdx]); setSelectedLowCat('All'); }} disabled={getHighCatOptions().length === 0}>◀</NavButton>
                    <SearchableSelect>
                      <SearchInput $dark={darkMode} type="text" value={highCatFocused ? highCatSearch : (highCatSearch || selectedHighCat)} onChange={(e) => { setHighCatSearch(e.target.value); setShowHighCatDropdown(true); setHighCatHighlight(-1); }} onKeyDown={(e) => { const opts = getHighCatOptions().filter(cat => !highCatSearch || cat.toLowerCase().includes(highCatSearch.toLowerCase())); if (e.key === 'Enter') { if (highCatHighlight >= 0 && opts[highCatHighlight]) { setSelectedHighCat(opts[highCatHighlight]); setSelectedLowCat('All'); setShowHighCatDropdown(false); setHighCatHighlight(-1); setHighCatSearch(''); setHighCatFocused(false); } else if (opts.length > 0) { setSelectedHighCat(opts[0]); setSelectedLowCat('All'); setShowHighCatDropdown(false); setHighCatHighlight(-1); setHighCatSearch(''); setHighCatFocused(false); } } else if (e.key === 'ArrowDown') { e.preventDefault(); setHighCatHighlight(prev => prev < opts.length - 1 ? prev + 1 : prev); } else if (e.key === 'ArrowUp') { e.preventDefault(); setHighCatHighlight(prev => prev > 0 ? prev - 1 : prev); } }} onFocus={() => { setShowHighCatDropdown(true); setHighCatSearch(''); setHighCatHighlight(-1); setHighCatFocused(true); }} onBlur={() => setTimeout(() => { setShowHighCatDropdown(false); setHighCatFocused(false); }, 200)} placeholder="Search..." />
                      <CategoryDropdown $visible={showHighCatDropdown} $dark={darkMode}>
                        {getHighCatOptions().filter(cat => !highCatSearch || cat.toLowerCase().includes(highCatSearch.toLowerCase())).map((cat, idx) => <CategoryOption key={cat} $selected={idx === highCatHighlight || cat === selectedHighCat} $dark={darkMode} onClick={() => { setSelectedHighCat(cat); setSelectedLowCat('All'); setHighCatSearch(''); setShowHighCatDropdown(false); setHighCatHighlight(-1); }}>{cat}</CategoryOption>)}
                      </CategoryDropdown>
                    </SearchableSelect>
                    <NavButton $dark={darkMode} onClick={() => { const opts = getHighCatOptions(); const idx = opts.indexOf(selectedHighCat); const newIdx = idx <= 0 ? opts.length - 1 : idx - 1; setSelectedHighCat(opts[newIdx]); setSelectedLowCat('All'); }} disabled={getHighCatOptions().length === 0}>▶</NavButton>
                  </WordSelectorContainer>
                </div>

                <div>
                  <Label $dark={darkMode}>🗃️ Subcategory</Label>
                  <WordSelectorContainer>
                    <NavButton $dark={darkMode} onClick={() => { const opts = getLowCatOptions(); const idx = opts.indexOf(selectedLowCat); const newIdx = idx <= 0 ? opts.length - 1 : idx - 1; setSelectedLowCat(opts[newIdx]); }} disabled={getLowCatOptions().length === 0}>◀</NavButton>
                    <SearchableSelect>
                      <SearchInput $dark={darkMode} type="text" value={lowCatFocused ? lowCatSearch : (lowCatSearch || selectedLowCat)} onChange={(e) => { setLowCatSearch(e.target.value); setShowLowCatDropdown(true); setLowCatHighlight(-1); }} onKeyDown={(e) => { const opts = getLowCatOptions().filter(cat => !lowCatSearch || cat.toLowerCase().includes(lowCatSearch.toLowerCase())); if (e.key === 'Enter') { if (lowCatHighlight >= 0 && opts[lowCatHighlight]) { setSelectedLowCat(opts[lowCatHighlight]); setShowLowCatDropdown(false); setLowCatHighlight(-1); setLowCatSearch(''); setLowCatFocused(false); } else if (opts.length > 0) { setSelectedLowCat(opts[0]); setShowLowCatDropdown(false); setLowCatHighlight(-1); setLowCatSearch(''); setLowCatFocused(false); } } else if (e.key === 'ArrowDown') { e.preventDefault(); setLowCatHighlight(prev => prev < opts.length - 1 ? prev + 1 : prev); } else if (e.key === 'ArrowUp') { e.preventDefault(); setLowCatHighlight(prev => prev > 0 ? prev - 1 : prev); } }} onFocus={() => { setShowLowCatDropdown(true); setLowCatSearch(''); setLowCatHighlight(-1); setLowCatFocused(true); }} onBlur={() => setTimeout(() => { setShowLowCatDropdown(false); setLowCatFocused(false); }, 200)} placeholder="Search..." />
                      <CategoryDropdown $visible={showLowCatDropdown} $dark={darkMode}>
                        {getLowCatOptions().filter(cat => !lowCatSearch || cat.toLowerCase().includes(lowCatSearch.toLowerCase())).map((cat, idx) => <CategoryOption key={cat} $selected={idx === lowCatHighlight || cat === selectedLowCat} $dark={darkMode} onClick={() => { setSelectedLowCat(cat); setLowCatSearch(''); setShowLowCatDropdown(false); setLowCatHighlight(-1); }}>{cat}</CategoryOption>)}
                      </CategoryDropdown>
                    </SearchableSelect>
                    <NavButton $dark={darkMode} onClick={() => { const opts = getLowCatOptions(); const idx = opts.indexOf(selectedLowCat); const newIdx = idx >= opts.length - 1 ? 0 : idx + 1; setSelectedLowCat(opts[newIdx]); }} disabled={getLowCatOptions().length === 0}>▶</NavButton>
                  </WordSelectorContainer>
                </div>

                <div>
                  <Label $dark={darkMode}>🔍 Search Word</Label>
                  <WordSelectorContainer>
                    <NavButton $dark={darkMode} onClick={handlePrevWord} disabled={allFilteredWords.length === 0}>◀</NavButton>
                    <SearchableSelect>
                      <SearchInput $dark={darkMode} type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); setHighlightedIndex(-1); }} onKeyDown={(e) => { if (e.key === 'Enter') { if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) { const word = filteredOptions[highlightedIndex]; setSelectedWord(word); setSearchTerm(vocabData?.words.find(w => w.Word_norm === word)?.Word_orig || word); setCurrentWordIndex(allFilteredWords.indexOf(word) + 1); setShowDropdown(false); setHighlightedIndex(-1); } else { const trimmedTerm = searchTerm.trim(); if (trimmedTerm) { const exactMatch = allFilteredWords.find(w => w.toLowerCase() === trimmedTerm.toLowerCase()); if (exactMatch) { setSelectedWord(exactMatch); setCurrentWordIndex(allFilteredWords.indexOf(exactMatch) + 1); setShowDropdown(false); } else { setSelectedWord(trimmedTerm); setShowDropdown(false); } } } } else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); } else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev); } }} onFocus={() => { setShowDropdown(true); setSearchTerm(''); setHighlightedIndex(-1); }} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Search..." />
                      <SearchDropdown $visible={showDropdown && filteredOptions.length > 0} $dark={darkMode}>
                        {filteredOptions.slice(0, 50).map((word: string, idx: number) => <SearchOption key={word} $selected={idx === highlightedIndex || word === selectedWord} $dark={darkMode} onClick={() => { setSelectedWord(word); setSearchTerm(vocabData.words.find(w => w.Word_norm === word)?.Word_orig || word); setCurrentWordIndex(allFilteredWords.indexOf(word) + 1); setShowDropdown(false); setHighlightedIndex(-1); }}>{vocabData.words.find(w => w.Word_norm === word)?.Word_orig || word}</SearchOption>)}
                      </SearchDropdown>
                    </SearchableSelect>
                    <NavButton $dark={darkMode} onClick={handleNextWord} disabled={allFilteredWords.length === 0}>▶</NavButton>
                  </WordSelectorContainer>
                </div>

                {selectedWord && allFilteredWords.length > 0 && (
                  <div>
                    <ProgressBarContainer $dark={darkMode}><ProgressFill $percentage={progressPercentage} /></ProgressBarContainer>
                    <ProgressText $dark={darkMode}>Word {currentWordIndex} of {allFilteredWords.length}</ProgressText>
                  </div>
                )}
                
                <EmojiLegend $dark={darkMode}><span>🟢 Main</span><span>🟠 Main's Related</span></EmojiLegend>
              </>
            )}
            
            <StatusMessage $type={status.type} $dark={darkMode} style={{ cursor: status.type === 'success' ? 'pointer' : 'default' }}>
              {status.type === 'success' ? (
                <>
                  <div onClick={() => setShowFileDetails(!showFileDetails)} style={{ cursor: 'pointer', fontWeight: 600, color: darkMode ? '#6ee7b7' : '#065f46' }}>✅ Click to View Details</div>
                  {showFileDetails && vocabData && (
                    <div style={{ paddingTop: '8px', color: darkMode ? '#6ee7b7' : '#065f46' }}>
                      <div style={{ marginBottom: '16px' }}><b>File Date:</b> {vocabData.fileDate}</div>
                      <div><b>{vocabData.stats.uniqueMainWords}</b> unique main words</div>
                      <div style={{ marginTop: '2px' }}><b>{vocabData.stats.uniqueRelatedWords}</b> unique related words</div>
                      <div style={{ marginTop: '2px' }}><b>{vocabData.stats.totalUniqueWords}</b> total unique words</div>
                    </div>
                  )}
                </>
              ) : <span dangerouslySetInnerHTML={{ __html: status.message }} />}
            </StatusMessage>
            
            {vocabData && vocabData.unmatchedHighlights.length > 0 && (
              <div style={{ border: `1px solid ${darkMode ? '#504040' : '#f5c2c7'}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div onClick={() => setShowUnmatched(!showUnmatched)} style={{ padding: '12px', cursor: 'pointer', fontWeight: 600, color: darkMode ? '#f87171' : '#dc2626', background: darkMode ? 'rgba(239,68,68,0.1)' : '#fff5f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> Unmatched Comments ({vocabData.unmatchedHighlights.length}) {showUnmatched ? '▼' : '▶'}
                </div>
                {showUnmatched && <div style={{ padding: '12px', fontSize: '0.88rem', color: darkMode ? '#b0b0c0' : '#5a5a6a' }}>{vocabData.unmatchedHighlights.join(', ')}</div>}
              </div>
            )}
          </Sidebar>
          
          <MainPanel $dark={darkMode}>
            {status.type === 'loading' ? <div style={{ textAlign: 'center', padding: '40px' }}><div style={{ fontSize: '2em', marginBottom: '16px' }}>⏳</div><p>{status.message}</p></div> : renderWordInfo()}
          </MainPanel>
        </MainContent>
        
        <ActiveIndicator $active={isActive} />
      </AppContainer>
    </>
  );
};

export default App;
