import type { Word, RecallMode } from './types';

/**
 * The prompt styles a card can actually be shown as. These are a subset of
 * RecallMode — "random", "mistakes" and "difficult" pick a session of words
 * but still need one of these to decide how each individual card is presented.
 */
export type PromptMode = 'image' | 'definition' | 'example' | 'word';

const ALL_PROMPT_MODES: PromptMode[] = ['image', 'definition', 'example', 'word'];

function has(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Which prompt styles are possible for this word, given the data it actually
 * has. "word" is always possible; the rest need their supporting field.
 */
export function availablePromptModes(word: Word): PromptMode[] {
  return ALL_PROMPT_MODES.filter((m) => {
    if (m === 'word') return has(word.word);
    if (m === 'image') return has(word.image_url);
    if (m === 'definition') return has(word.definition);
    if (m === 'example') return has(word.example);
    return false;
  });
}

/**
 * Resolve the prompt style for one card.
 *
 * - A concrete request (image / definition / example / word) is honoured when
 *   the word supports it, and otherwise falls back to a random available style.
 * - "random" / "mistakes" / "difficult" pick a random available style, favouring
 *   the more interesting ones (image / definition / example) over a bare word.
 *
 * It never returns a style the word can't fulfil, so no empty or nonsensical
 * prompt can be generated.
 */
export function resolvePromptMode(
  word: Word,
  requested: RecallMode,
  seed: number = Math.random()
): PromptMode {
  const available = availablePromptModes(word);
  if (available.length === 0) return 'word'; // a word always has at least its own text

  if (
    requested === 'image' ||
    requested === 'definition' ||
    requested === 'example' ||
    requested === 'word'
  ) {
    if (available.includes(requested)) return requested;
  }

  const preferred = available.filter((m) => m !== 'word');
  const pool = preferred.length > 0 ? preferred : available;
  return pool[Math.floor(seed * pool.length) % pool.length];
}

/** The target word blanked out of its own example sentence, or null if there's no example. */
export function blankedExample(word: Word): string | null {
  if (!has(word.example)) return null;
  const escaped = word.word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return word.example;
  return word.example!.replace(new RegExp(escaped, 'gi'), '_____');
}
