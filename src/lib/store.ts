import { useState, useEffect, useCallback } from 'react';
import type {
  Word, Category, Review, ReviewDay, ReviewRating,
  FolderVisibility, SharedFolder, FolderShare,
} from './types';
import { nextSrs, dueDate } from './srs';
import { todayISO, uid } from './utils';
import { supabase } from './supabase';
import { useAuth } from './auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Imported files may carry ids from elsewhere; the database only accepts UUIDs. */
function safeId(id: string | undefined): string {
  return id && UUID_RE.test(id) ? id : uid();
}

function message(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as Error).message);
  return 'Something went wrong.';
}

export function useStore() {
  const { userId } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewDays, setReviewDays] = useState<ReviewDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!userId) {
      setWords([]);
      setCategories([]);
      setReviewDays([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Everything here is scoped to the signed-in user. Folders shared *with*
    // this user are fetched separately and never mix into their own garden.
    const [w, c, rd] = await Promise.all([
      supabase.from('words').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', userId).order('name'),
      supabase.from('review_days').select('*').eq('user_id', userId),
    ]);

    const failure = w.error || c.error || rd.error;
    if (failure) {
      setError(message(failure));
    } else {
      setError(null);
    }

    setWords((w.data as Word[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setReviewDays((rd.data as ReviewDay[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------------------------------------------------------------- words

  const addWord = useCallback(
    async (data: Partial<Word>): Promise<Word | null> => {
      if (!userId) return null;
      const row = {
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
        user_id: userId,
      };

      const { data: saved, error: err } = await supabase
        .from('words').insert(row).select().single();

      if (err) {
        setError(message(err));
        return null;
      }
      const created = saved as Word;
      setWords((prev) => [created, ...prev]);
      return created;
    },
    [userId]
  );

  const updateWord = useCallback(async (id: string, data: Partial<Word>) => {
    const patch = { ...data };
    delete patch.id;

    const { data: saved, error: err } = await supabase
      .from('words').update(patch).eq('id', id).select().single();

    if (err) {
      setError(message(err));
      return;
    }
    setWords((prev) => prev.map((w) => (w.id === id ? (saved as Word) : w)));
  }, []);

  const deleteWord = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('words').delete().eq('id', id);
    if (err) {
      setError(message(err));
      return;
    }
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const reviewWord = useCallback(async (id: string, rating: ReviewRating) => {
    if (!userId) return;
    const word = words.find((w) => w.id === id);
    if (!word) return;

    const state = nextSrs(
      { interval: word.srs_interval, ease: word.srs_ease, reps: word.srs_reps },
      rating
    );
    const newStatus =
      rating === 'easy' && state.reps >= 2 ? 'know' : rating === 'forgot' ? 'dont_know' : 'learning';
    const nowISO = new Date().toISOString();
    const today = todayISO();

    const review: Review & { user_id: string } = {
      id: uid(),
      word_id: id,
      rating,
      reviewed_at: nowISO,
      prev_interval: word.srs_interval,
      new_interval: state.interval,
      user_id: userId,
    };

    const existingDay = reviewDays.find((d) => d.review_date === today);
    const updatedDay: ReviewDay = existingDay
      ? { ...existingDay, review_count: existingDay.review_count + 1 }
      : { id: uid(), review_date: today, review_count: 1, learned_count: 0 };

    const updated: Word = {
      ...word,
      srs_interval: state.interval,
      srs_ease: state.ease,
      srs_reps: state.reps,
      srs_due: dueDate(state.interval),
      last_reviewed: nowISO,
      status: newStatus,
    };

    // Optimistic: reviewing should never feel like it's waiting on the network.
    setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
    setReviewDays((prev) =>
      existingDay
        ? prev.map((d) => (d.review_date === today ? updatedDay : d))
        : [...prev, updatedDay]
    );

    const [rIns, dIns, wUpd] = await Promise.all([
      supabase.from('reviews').insert(review),
      supabase.from('review_days').upsert({ ...updatedDay, user_id: userId }),
      supabase.from('words').update({
        srs_interval: updated.srs_interval,
        srs_ease: updated.srs_ease,
        srs_reps: updated.srs_reps,
        srs_due: updated.srs_due,
        last_reviewed: updated.last_reviewed,
        status: updated.status,
      }).eq('id', id),
    ]);

    const failure = rIns.error || dIns.error || wUpd.error;
    if (failure) {
      setError(message(failure));
      await loadAll();
    }
  }, [userId, words, reviewDays, loadAll]);

  // ------------------------------------------------------------- folders

  const addCategory = useCallback(
    async (name: string, color: string, icon: string | null): Promise<Category | null> => {
      if (!userId) return null;
      const { data: saved, error: err } = await supabase
        .from('categories')
        .insert({ id: uid(), name, color, icon, user_id: userId, visibility: 'private' })
        .select()
        .single();

      if (err) {
        setError(message(err));
        return null;
      }
      const created = saved as Category;
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    [userId]
  );

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const body = { ...patch };
    delete body.id;

    const { data: saved, error: err } = await supabase
      .from('categories').update(body).eq('id', id).select().single();

    if (err) {
      setError(message(err));
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? (saved as Category) : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  const setFolderVisibility = useCallback(
    (id: string, visibility: FolderVisibility) => updateCategory(id, { visibility }),
    [updateCategory]
  );

  const deleteCategory = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('categories').delete().eq('id', id);
    if (err) {
      setError(message(err));
      return;
    }
    // The FK is ON DELETE SET NULL, so surviving words just lose their folder.
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setWords((prev) => prev.map((w) => (w.category_id === id ? { ...w, category_id: null } : w)));
  }, []);

  // -------------------------------------------------------------- sharing

  const shareFolder = useCallback(async (folderId: string, username: string) => {
    const { error: err } = await supabase.rpc('share_folder', {
      p_folder: folderId,
      p_username: username,
    });
    if (err) throw new Error(message(err));
  }, []);

  const unshareFolder = useCallback(async (folderId: string, targetUserId: string) => {
    const { error: err } = await supabase.rpc('unshare_folder', {
      p_folder: folderId,
      p_user: targetUserId,
    });
    if (err) throw new Error(message(err));
  }, []);

  const listFolderShares = useCallback(async (folderId: string): Promise<FolderShare[]> => {
    const { data, error: err } = await supabase.rpc('list_folder_shares', { p_folder: folderId });
    if (err) throw new Error(message(err));
    return (data as FolderShare[]) ?? [];
  }, []);

  const listPublicFolders = useCallback(async (search: string): Promise<SharedFolder[]> => {
    const { data, error: err } = await supabase.rpc('list_public_folders', { p_search: search });
    if (err) throw new Error(message(err));
    return (data as SharedFolder[]) ?? [];
  }, []);

  const listSharedWithMe = useCallback(async (): Promise<SharedFolder[]> => {
    const { data, error: err } = await supabase.rpc('list_shared_with_me');
    if (err) throw new Error(message(err));
    return (data as SharedFolder[]) ?? [];
  }, []);

  const getReadableFolder = useCallback(async (folderId: string): Promise<SharedFolder | null> => {
    const { data, error: err } = await supabase.rpc('get_readable_folder', { p_folder: folderId });
    if (err) throw new Error(message(err));
    const rows = (data as SharedFolder[]) ?? [];
    return rows[0] ?? null;
  }, []);

  /** Words inside a folder the current user is allowed to read. RLS enforces access. */
  const getFolderWords = useCallback(async (folderId: string): Promise<Word[]> => {
    const { data, error: err } = await supabase
      .from('words').select('*').eq('category_id', folderId).order('created_at', { ascending: false });
    if (err) throw new Error(message(err));
    return (data as Word[]) ?? [];
  }, []);

  /** Clone a readable folder into the current user's garden, with fresh SRS state. */
  const copyFolder = useCallback(async (folderId: string): Promise<string> => {
    const { data, error: err } = await supabase.rpc('copy_folder_to_my_garden', {
      p_folder: folderId,
    });
    if (err) throw new Error(message(err));
    await loadAll();
    return data as string;
  }, [loadAll]);

  // --------------------------------------------------------- bulk / import

  const importWords = useCallback(async (newWords: Word[]) => {
    if (!userId) return;
    // An imported file can carry a category_id pointing at someone else's folder.
    // Keeping it would file the word into that folder and expose it to everyone
    // the folder is shared with, so only ids the user actually owns survive.
    // Read straight from the database: a JSON import writes its folders first,
    // and those wouldn't be in component state yet.
    const { data: owned } = await supabase.from('categories').select('id').eq('user_id', userId);
    const mine = new Set((owned ?? []).map((c) => c.id as string));
    const rows = newWords.map((w) => ({
      ...w,
      id: safeId(w.id),
      category_id: w.category_id && mine.has(w.category_id) ? w.category_id : null,
      user_id: userId,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: err } = await supabase.from('words').upsert(rows.slice(i, i + 500));
      if (err) {
        setError(message(err));
        break;
      }
    }
    await loadAll();
  }, [userId, loadAll]);

  const importCategories = useCallback(async (newCats: Category[]) => {
    if (!userId) return;
    const rows = newCats.map((c) => ({
      id: safeId(c.id),
      name: c.name,
      description: c.description ?? null,
      color: c.color,
      icon: c.icon ?? null,
      visibility: c.visibility ?? 'private',
      user_id: userId,
    }));
    const { error: err } = await supabase.from('categories').upsert(rows);
    if (err) setError(message(err));
    await loadAll();
  }, [userId, loadAll]);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    // Reviews cascade from words; folders are cleared last so nothing dangles.
    for (const table of ['reviews', 'review_days', 'words', 'categories'] as const) {
      const { error: err } = await supabase.from(table).delete().eq('user_id', userId);
      if (err) {
        setError(message(err));
        break;
      }
    }
    await loadAll();
  }, [userId, loadAll]);

  return {
    words,
    categories,
    reviewDays,
    loading,
    error,
    dismissError: useCallback(() => setError(null), []),
    reload: loadAll,
    addWord,
    updateWord,
    deleteWord,
    reviewWord,
    addCategory,
    updateCategory,
    deleteCategory,
    setFolderVisibility,
    shareFolder,
    unshareFolder,
    listFolderShares,
    listPublicFolders,
    listSharedWithMe,
    getReadableFolder,
    getFolderWords,
    copyFolder,
    importWords,
    importCategories,
    clearAll,
  };
}

export type Store = ReturnType<typeof useStore>;
