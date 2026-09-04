import type { ReviewRating } from './types';

// SM-2 inspired spaced repetition with adaptive ease
export interface SrsState {
  interval: number;
  ease: number;
  reps: number;
}

export function nextSrs(state: SrsState, rating: ReviewRating): SrsState {
  let { interval, ease, reps } = state;

  if (rating === 'forgot') {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { interval, ease, reps };
  }

  reps += 1;

  if (rating === 'easy') {
    ease = Math.min(3.5, ease + 0.15);
  } else if (rating === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
  }

  if (reps === 1) {
    interval = rating === 'easy' ? 3 : rating === 'hard' ? 1 : 2;
  } else if (reps === 2) {
    interval = rating === 'easy' ? 7 : rating === 'hard' ? 3 : 5;
  } else {
    const base = Math.round(interval * ease);
    interval = rating === 'easy' ? Math.round(base * 1.3) : rating === 'hard' ? Math.max(1, Math.round(base * 0.6)) : base;
  }

  interval = Math.min(interval, 365);
  return { interval, ease, reps };
}

export function dueDate(interval: number): string {
  const d = new Date();
  d.setDate(d.getDate() + interval);
  return d.toISOString().split('T')[0];
}
