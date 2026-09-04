export type WordStatus = 'dont_know' | 'learning' | 'know';
export type ReviewRating = 'easy' | 'good' | 'hard' | 'forgot';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface Word {
  id: string;
  word: string;
  definition: string | null;
  part_of_speech: string | null;
  ipa: string | null;
  example: string | null;
  image_url: string | null;
  association: string | null;
  story: string | null;
  status: WordStatus;
  category_id: string | null;
  difficulty: number;
  favorite: boolean;
  notes: string | null;
  srs_interval: number;
  srs_ease: number;
  srs_reps: number;
  srs_due: string; // date string
  last_reviewed: string | null; // ISO timestamp
  created_at: string;
}

export interface Review {
  id: string;
  word_id: string;
  rating: ReviewRating;
  reviewed_at: string;
  prev_interval: number | null;
  new_interval: number | null;
}

export interface ReviewDay {
  id: string;
  review_date: string;
  review_count: number;
  learned_count: number;
}

export type View =
  | { name: 'home' }
  | { name: 'words' }
  | { name: 'add' }
  | { name: 'word'; id: string }
  | { name: 'review' }
  | { name: 'recall'; mode?: RecallMode }
  | { name: 'stats' }
  | { name: 'categories' }
  | { name: 'settings' };

export type RecallMode =
  | 'image'
  | 'definition'
  | 'example'
  | 'word'
  | 'random'
  | 'mistakes'
  | 'difficult';
