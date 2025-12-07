export interface JournalEvent {
  id: string;
  userId: string;
  day: number; // 1-31
  text: string;
  timestamp: string; // ISO String
  position: {
    x: number;
    y: number;
  };
  zIndex: number;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type ViewMode = 'board' | 'list';

export const DAYS_IN_MONTH = 31;
