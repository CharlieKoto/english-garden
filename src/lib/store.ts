import { useState, useEffect, useCallback } from 'react';
import type { Word, Category, Review, ReviewDay, ReviewRating } from './types';
import { nextSrs, dueDate } from './srs';
import { todayISO, uid } from './utils';

const DB_NAME = 'english-garden';
const DB_VERSION = 1;
const STORES = ['words', 'categories', 'reviews', 'review_days'] as const;
type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut<T>(store: StoreName, value: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbPutMany<T>(store: StoreName, values: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbClear(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useStore() {
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewDays, setReviewDays] = useState<ReviewDay[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [w, c, rd] = await Promise.all([
        dbGetAll<Word>('words'),
        dbGetAll<Category>('categories'),
        dbGetAll<ReviewDay>('review_days'),
      ]);
      w.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      c.sort((a, b) => a.name.localeCompare(b.name));
      setWords(w);
      setCategories(c);
      setReviewDays(rd);
    } catch {
      // IndexedDB unavailable — start with empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addWord = useCallback(
    async (data: Partial<Word>): Promise<Word | null> => {
      const now = new Date().toISOString();
      const row: Word = {
        id: uid(),
        word: data.word || '',
        definition: data.definition ?? null,
        part_of_speech: data.part_of_speech ?? null,
        ipa: data.ipa ?? null,
        example: data.example ?? null,
        image_url: data.image_url ?? null,
        association: data.association ?? null,
        story: data.story ?? null,
        status: data.status || 'dont_know',
        category_id: data.category_id ?? null,
        difficulty: data.difficulty || 1,
        favorite: data.favorite || false,
        notes: data.notes ?? null,
        srs_interval: 0,
        srs_ease: 2.5,
        srs_reps: 0,
        srs_due: todayISO(),
        last_reviewed: null,
        created_at: now,
      };
      await dbPut('words', row);
      setWords((prev) => [row, ...prev]);
      return row;
    },
    []
  );

  const updateWord = useCallback(async (id: string, data: Partial<Word>) => {
    const word = words.find((w) => w.id === id);
    if (!word) return;
    const updated: Word = { ...word, ...data, id };
    await dbPut('words', updated);
    setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, [words]);

  const deleteWord = useCallback(async (id: string) => {
    await dbDelete('words', id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const reviewWord = useCallback(async (id: string, rating: ReviewRating) => {
    const word = words.find((w) => w.id === id);
    if (!word) return;
    const state = nextSrs(
      { interval: word.srs_interval, ease: word.srs_ease, reps: word.srs_reps },
      rating
    );
    const newStatus = rating === 'easy' && state.reps >= 2 ? 'know' : rating === 'forgot' ? 'dont_know' : 'learning';
    const due = dueDate(state.interval);
    const nowISO = new Date().toISOString();

    const review: Review = {
      id: uid(),
      word_id: id,
      rating,
      reviewed_at: nowISO,
      prev_interval: word.srs_interval,
      new_interval: state.interval,
    };
    await dbPut('reviews', review);

    const today = todayISO();
    const existingDay = reviewDays.find((d) => d.review_date === today);
    let updatedDay: ReviewDay;
    if (existingDay) {
      updatedDay = { ...existingDay, review_count: existingDay.review_count + 1 };
    } else {
      updatedDay = { id: uid(), review_date: today, review_count: 1, learned_count: 0 };
    }
    await dbPut('review_days', updatedDay);

    const updated: Word = {
      ...word,
      srs_interval: state.interval,
      srs_ease: state.ease,
      srs_reps: state.reps,
      srs_due: due,
      last_reviewed: nowISO,
      status: newStatus,
    };
    await dbPut('words', updated);

    setReviewDays((prev) => {
      const exists = prev.find((d) => d.review_date === today);
      if (exists) return prev.map((d) => (d.review_date === today ? updatedDay : d));
      return [...prev, updatedDay];
    });
    setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, [words, reviewDays]);

  const addCategory = useCallback(async (name: string, color: string, icon: string | null) => {
    const row: Category = {
      id: uid(),
      name,
      color,
      icon,
      created_at: new Date().toISOString(),
    };
    await dbPut('categories', row);
    setCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await dbDelete('categories', id);
    const updated = words
      .filter((w) => w.category_id === id)
      .map((w) => ({ ...w, category_id: null }));
    await Promise.all(updated.map((w) => dbPut('words', w)));
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setWords((prev) => prev.map((w) => {
      const u = updated.find((x) => x.id === w.id);
      return u || w;
    }));
  }, [words]);

  const importWords = useCallback(async (newWords: Word[]) => {
    await dbPutMany('words', newWords);
    await loadAll();
  }, [loadAll]);

  const importCategories = useCallback(async (newCats: Category[]) => {
    await dbPutMany('categories', newCats);
    await loadAll();
  }, [loadAll]);

  const clearAll = useCallback(async () => {
    await Promise.all([dbClear('words'), dbClear('categories'), dbClear('reviews'), dbClear('review_days')]);
    await loadAll();
  }, [loadAll]);

  return {
    words,
    categories,
    reviewDays,
    loading,
    reload: loadAll,
    addWord,
    updateWord,
    deleteWord,
    reviewWord,
    addCategory,
    deleteCategory,
    importWords,
    importCategories,
    clearAll,
  };
}

export type Store = ReturnType<typeof useStore>;
