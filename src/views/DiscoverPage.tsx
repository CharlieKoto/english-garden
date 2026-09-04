import { useState, useEffect, useCallback } from 'react';
import type { Store } from '@/lib/store';
import type { SharedFolder, View } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Search, FolderTree, Loader2, AlertCircle, Inbox, Globe } from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
}

type Tab = 'shared' | 'public';

export function DiscoverPage({ store, navigate }: Props) {
  const [tab, setTab] = useState<Tab>('shared');
  const [sharedWithMe, setSharedWithMe] = useState<SharedFolder[]>([]);
  const [publicFolders, setPublicFolders] = useState<SharedFolder[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { listSharedWithMe, listPublicFolders } = store;

  // Folders shared directly with me — loaded once.
  useEffect(() => {
    let active = true;
    listSharedWithMe()
      .then((rows) => active && setSharedWithMe(rows))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [listSharedWithMe]);

  // Public folders — refetched as the search term settles.
  const loadPublic = useCallback((term: string) => {
    listPublicFolders(term)
      .then(setPublicFolders)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [listPublicFolders]);

  useEffect(() => {
    if (tab !== 'public') return;
    const t = setTimeout(() => loadPublic(search), 250);
    return () => clearTimeout(t);
  }, [tab, search, loadPublic]);

  const rows = tab === 'shared' ? sharedWithMe : publicFolders;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Discover</h1>
        <p className="text-ink-400 mt-1">Folders other people have shared</p>
      </div>

      <div className="flex p-1 rounded-xl bg-ink-100 dark:bg-ink-800 mb-5 max-w-sm">
        <TabButton active={tab === 'shared'} onClick={() => setTab('shared')}>
          Shared with me
          {sharedWithMe.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">{sharedWithMe.length}</span>
          )}
        </TabButton>
        <TabButton active={tab === 'public'} onClick={() => setTab('public')}>
          Public
        </TabButton>
      </div>

      {tab === 'public' && (
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search folders or usernames…"
            className="input pl-10"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && tab === 'shared' ? (
        <div className="flex items-center justify-center gap-2 text-ink-400 py-16">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState tab={tab} searching={!!search.trim()} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate({ name: 'folder', id: f.id })}
              className="card card-hover p-5 text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: `${f.color}20` }}
                >
                  <FolderTree size={20} style={{ color: f.color }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-medium truncate">{f.name}</h3>
                  <p className="text-xs text-ink-400 truncate">
                    by {f.owner_username} · {f.word_count} word{f.word_count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {f.description && (
                <p className="text-sm text-ink-500 dark:text-ink-400 line-clamp-2">{f.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 shadow-sm'
          : 'text-ink-500 dark:text-ink-400'
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab, searching }: { tab: Tab; searching: boolean }) {
  const Icon = tab === 'shared' ? Inbox : searching ? Search : Globe;
  const text =
    tab === 'shared'
      ? 'Nothing yet. When someone shares a folder with your username, it shows up here.'
      : searching
        ? 'No public folders match that search.'
        : 'No public folders yet. Make one of yours public from the Folders page.';

  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-sage-500" />
      </div>
      <p className="text-ink-400 max-w-sm mx-auto">{text}</p>
    </div>
  );
}
