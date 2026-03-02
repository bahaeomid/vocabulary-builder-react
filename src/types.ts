export interface VocabWord {
  id: number;
  Category: string;
  Category_High: string;
  Category_Low: string;
  Word_orig: string;
  Word_norm: string;
  Definition: string;
  Example: string;
  Related_Words_orig: string[];
  Related_List_norm: string[];
  My_Commentary: string[];
}

export interface ParsedVocabData {
  words: VocabWord[];
  stats: {
    uniqueMainWords: number;
    uniqueRelatedWords: number;
    totalUniqueWords: number;
  };
  fileDate: string;
  unmatchedHighlights: string[];
}

export type ProcessStatus = {
  type: 'loading' | 'success' | 'error';
  message: string;
};
