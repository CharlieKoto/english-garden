import { useState, useEffect } from 'react';
import type { Store } from '@/lib/store';
import type { SharedFolder, Word, View } from '@/lib/types';
import {
  ArrowLeft, FolderTree, Loader2, AlertCircle, Copy, Check, Globe, Lock, BookOpen,
} from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
  folderId: string;
}

/**
 * Read-only view of a folder belonging to someone else — reached from Discover.
 * The owner's words are shown as-is; the only write action is copying the whole
 * folder into your own garden, which creates independent rows with fresh SRS state.
 */
export function SharedFolderPage({ store, navigate, folderId }: Props) {
  const [folder, setFolder] = useState<SharedFolder | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const { getReadableFolder, getFolderWords } = store;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getReadableFolder(folderId), getFolderWords(folderId)])
      .then(([meta, rows]) => {
        if (!active) return;
        if (!meta) {
          setError('This folder no longer exists, or it is not shared with you.');
        } else {
          setFolder(meta);
          setWords(rows);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [folderId, getReadableFolder, getFolderWords]);

  async function handleCopy() {
    if (copying) return;
    setCopying(true);
    setError(null);
    try {
      await store.copyFolder(folderId);
      setCopied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not copy this folder.');
    }
    setCopying(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-ink-400 py-24">
        <Loader2 size={18} className="animate-spin" /> Loading folder…
      </div>
    );
  }

  if (error && !folder) {
    return (
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <BackButton navigate={navigate} />
        <div className="card p-12 text-center mt-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <p className="text-ink-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!folder) return null;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <BackButton navigate={navigate} />

      <div className="flex flex-wrap items-start gap-4 mt-4 mb-6">
        <div
          className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center"
          style={{ background: `${folder.color}20` }}
        >
          <FolderTree size={26} style={{ color: folder.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-medium tracking-tight truncate">{folder.name}</h1>
          <p className="text-ink-400 mt-1 text-sm flex items-center gap-2 flex-wrap">
            <span>by {folder.owner_username}</span>
            <span>·</span>
            <span>{words.length} word{words.length === 1 ? '' : 's'}</span>
            <span className="inline-flex items-center gap-1 chip bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300 text-xs">
              {folder.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
              {folder.visibility === 'public' ? 'Public' : 'Shared with you'}
            </span>
          </p>
          {folder.description && (
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">{folder.description}</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        {copied ? (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Check size={16} />
            <span className="text-sm">Copied into your garden as a new folder.</span>
            <button
              onClick={() => navigate({ name: 'categories' })}
              className="text-sm font-medium underline underline-offset-2"
            >
              Open Folders
            </button>
          </div>
        ) : (
          <button
            onClick={handleCopy}
            disabled={copying || words.length === 0}
            className="btn btn-primary px-5 py-2.5 disabled:opacity-50"
          >
            {copying ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            Copy {words.length} word{words.length === 1 ? '' : 's'} to my garden
          </button>
        )}
        <p className="text-xs text-ink-400 mt-2">
          You get your own copy — your review progress stays separate, and later edits by{' '}
          {folder.owner_username} won't change it.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {words.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-sage-500" />
          </div>
          <p className="text-ink-400">This folder is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map((w) => (
            <div key={w.id} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-lg font-medium">{w.word}</h3>
                {w.part_of_speech && (
                  <span className="text-xs text-ink-400 italic shrink-0">{w.part_of_speech}</span>
                )}
              </div>
              {w.ipa && <p className="text-xs text-ink-400 font-mono mt-0.5">{w.ipa}</p>}
              {w.definition && (
                <p className="text-sm text-ink-600 dark:text-ink-300 mt-1.5">{w.definition}</p>
              )}
              {w.example && (
                <p className="text-sm text-ink-400 italic mt-1.5">“{w.example}”</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BackButton({ navigate }: { navigate: (v: View) => void }) {
  return (
    <button
      onClick={() => navigate({ name: 'discover' })}
      className="btn btn-ghost flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-ink-100 -ml-1"
    >
      <ArrowLeft size={16} />
      Discover
    </button>
  );
}
