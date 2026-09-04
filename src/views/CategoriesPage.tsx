import { useState, useEffect, useCallback } from 'react';
import type { Store } from '@/lib/store';
import type { Category, FolderShare } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import {
  Plus, FolderTree, Trash2, Check, Share2, Globe, Lock, X, Loader2, AlertCircle, UserPlus, Users,
} from 'lucide-react';

interface Props {
  store: Store;
}

const COLORS = [
  '#7c9885', '#d4a574', '#c9837a', '#7ba8c4', '#9b8db5',
  '#6b9b6e', '#e0a070', '#b07878', '#6890a0', '#8a7ab0',
];

const SUGGESTED = [
  'Travel', 'Business', 'Marketing', 'UX/UI', 'Technology',
  'Health', 'Medicine', 'Daily life', 'Food', 'Emotions',
  'Work', 'Movies', 'Books', 'Slang', 'Idioms', 'Phrasal verbs',
];

export function CategoriesPage({ store }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState<Category | null>(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setCreating(true);
    await store.addCategory(name.trim(), color, null);
    setCreating(false);
    setName('');
    setColor(COLORS[0]);
    setShowAdd(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Folders</h1>
          <p className="text-ink-400 mt-1">Organize your words, and share them with others</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary px-4 py-2.5">
          <Plus size={18} />
          <span className="hidden sm:inline">New folder</span>
        </button>
      </div>

      {store.categories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center mx-auto mb-4">
            <FolderTree size={28} className="text-sage-500" />
          </div>
          <p className="text-ink-400 mb-6">No folders yet. Create one to organize your words by topic.</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-md mx-auto">
            {SUGGESTED.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setName(s);
                  setShowAdd(true);
                }}
                className="chip bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300 hover:bg-sage-100 dark:hover:bg-sage-900/30 cursor-pointer transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {store.categories.map((cat) => {
            const count = store.words.filter((w) => w.category_id === cat.id).length;
            const known = store.words.filter((w) => w.category_id === cat.id && w.status === 'know').length;
            return (
              <div key={cat.id} className="card card-hover p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${cat.color}20` }}>
                      <FolderTree size={20} style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-medium truncate">{cat.name}</h3>
                      <p className="text-xs text-ink-400">{count} words · {known} known</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => setSharing(cat)}
                      title="Share this folder"
                      className="btn btn-ghost p-2 rounded-lg text-ink-400 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => store.deleteCategory(cat.id)}
                      title="Delete folder"
                      className="btn btn-ghost p-2 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {cat.visibility === 'public' && (
                  <div className="inline-flex items-center gap-1.5 chip bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-300 text-xs mb-3">
                    <Globe size={12} />
                    Public
                  </div>
                )}

                {count > 0 && (
                  <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(known / count) * 100}%`, background: cat.color }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New folder">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Travel, Business, Movies..."
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-9 h-9 rounded-xl transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-sage-400 dark:ring-offset-ink-900 scale-110' : 'hover:scale-105'
                  )}
                  style={{ background: c }}
                >
                  {color === c && <Check size={16} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>
          {SUGGESTED.length > 0 && (
            <div>
              <p className="text-xs text-ink-400 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.filter((s) => !store.categories.find((c) => c.name === s)).slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => setName(s)}
                    className="chip bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300 hover:bg-sage-100 dark:hover:bg-sage-900/30 cursor-pointer transition-colors text-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!name.trim() || creating}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create folder'}
          </button>
        </div>
      </Modal>

      {sharing && (
        <ShareModal
          store={store}
          folder={store.categories.find((c) => c.id === sharing.id) ?? sharing}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}

function ShareModal({
  store,
  folder,
  onClose,
}: {
  store: Store;
  folder: Category;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<FolderShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPublic = folder.visibility === 'public';

  const refresh = useCallback(async () => {
    setLoadingShares(true);
    try {
      setShares(await store.listFolderShares(folder.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load who this is shared with.');
    }
    setLoadingShares(false);
  }, [store, folder.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleShare() {
    const name = recipient.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await store.shareFolder(folder.id, name);
      setRecipient('');
      setNotice(`Shared with ${name}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share this folder.');
    }
    setBusy(false);
  }

  async function handleRevoke(userId: string) {
    setError(null);
    setNotice(null);
    try {
      await store.unshareFolder(folder.id, userId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that person.');
    }
  }

  async function toggleVisibility() {
    setError(null);
    setNotice(null);
    await store.setFolderVisibility(folder.id, isPublic ? 'private' : 'public');
  }

  return (
    <Modal open onClose={onClose} title={`Share "${folder.name}"`}>
      <div className="space-y-5">
        {/* Public toggle */}
        <button
          onClick={toggleVisibility}
          className={cn(
            'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
            isPublic
              ? 'border-sage-300 bg-sage-50 dark:border-sage-700 dark:bg-sage-900/20'
              : 'border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800/50'
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isPublic ? 'bg-sage-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400'
          )}>
            {isPublic ? <Globe size={18} /> : <Lock size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{isPublic ? 'Public' : 'Private'}</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {isPublic
                ? 'Listed on Discover — anyone with an account can find and copy it.'
                : 'Only you and the people you add below can see it.'}
            </p>
          </div>
          <div className={cn(
            'w-11 h-6 rounded-full shrink-0 transition-colors relative',
            isPublic ? 'bg-sage-500' : 'bg-ink-200 dark:bg-ink-700'
          )}>
            <div className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
              isPublic ? 'left-[22px]' : 'left-0.5'
            )} />
          </div>
        </button>

        {/* Share with one person */}
        <div>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">
            Share with someone specific
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                placeholder="their username"
                autoCapitalize="none"
                spellCheck={false}
                className="input pl-9"
              />
            </div>
            <button
              onClick={handleShare}
              disabled={!recipient.trim() || busy}
              className="btn btn-primary px-4 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : 'Share'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Check size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Current recipients */}
        <div>
          <p className="text-xs text-ink-400 mb-2 flex items-center gap-1.5">
            <Users size={13} />
            Shared with
          </p>
          {loadingShares ? (
            <div className="flex items-center gap-2 text-sm text-ink-400 py-3">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-ink-400 py-3">Nobody yet.</p>
          ) : (
            <div className="space-y-1.5">
              {shares.map((s) => (
                <div
                  key={s.user_id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/50"
                >
                  <span className="text-sm font-medium">{s.username}</span>
                  <button
                    onClick={() => handleRevoke(s.user_id)}
                    title={`Stop sharing with ${s.username}`}
                    className="btn btn-ghost p-1.5 rounded-lg text-ink-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-ink-400 leading-relaxed">
          People you share with can read this folder and copy it into their own garden. They can't
          change your words, and their review progress stays separate from yours.
        </p>
      </div>
    </Modal>
  );
}
