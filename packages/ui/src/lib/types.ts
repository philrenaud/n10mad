/**
 * Shared types for the UI package
 */

export interface Focus {
  type?: 'topic' | 'author';
  query?: string;
}

export interface Topic {
  term: string;
  tfidf: number;
}

export interface Week {
  weekStart: number;
  weekEnd: number;
  count: number;
  uniqueAuthorCount: number;
  authors: string[];
  terms?: Topic[];
  milestone?: {
    title: string;
    [key: string]: string | unknown;
  };
}

export interface TopicWeek {
  year: string;
  weekNumber: number;
  weekStart: number;
  weekEnd: number;
  terms: Topic[];
} 
