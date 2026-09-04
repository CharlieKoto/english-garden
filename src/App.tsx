import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import type { View } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Home, BookOpen, Plus, Repeat, Brain, BarChart3, FolderTree, Compass, Settings,
  Sun, Moon, Sprout, Search, Command, LogOut, Loader2, AlertCircle, X,
} from 'lucide-react';
import { HomePage } from '@/views/HomePage';
import { WordsPage } from '@/views/WordsPage';
import { AddWordPage } from '@/views/AddWordPage';
import { WordDetailPage } from '@/views/WordDetailPage';
import { ReviewPage } from '@/views/ReviewPage';
import { RecallPage } from '@/views/RecallPage';
import { StatsPage } from '@/views/StatsPage';
import { CategoriesPage } from '@/views/CategoriesPage';
import { DiscoverPage } from '@/views/DiscoverPage';
import { SharedFolderPage } from '@/views/SharedFolderPage';
import { SettingsPage } from '@/views/SettingsPage';
import { AuthPage, ClaimUsernamePage } from '@/views/AuthPage';
import type { Store } from '@/lib/store';

const NAV: { icon: typeof Home; label: string; view: View; shortcut: string }[] = [
  { icon: Home, label: 'Home', view: { name: 'home' }, shortcut: '1' },
  { icon: BookOpen, label: 'Words', view: { name: 'words' }, shortcut: '2' },
  { icon: Plus, label: 'Add', view: { name: 'add' }, shortcut: '3' },
  { icon: Repeat, label: 'Review', view: { name: 'review' }, shortcut: '4' },
  { icon: Brain, label: 'Recall', view: { name: 'recall' }, shortcut: '5' },
  { icon: BarChart3, label: 'Stats', view: { name: 'stats' }, shortcut: '6' },
  { icon: FolderTree, label: 'Folders', view: { name: 'categories' }, shortcut: '7' },
  { icon: Compass, label: 'Discover', view: { name: 'discover' }, shortcut: '8' },
  { icon: Settings, label: 'Settings', view: { name: 'settings' }, shortcut: '9' },
];

/** Decides between the auth screens and the app itself. */
function App() {
  const { loading, session, needsUsername } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-sage-500" />
      </div>
    );
  }
  if (!session) return <AuthPage />;
  if (needsUsername) return <ClaimUsernamePage />;
  return <Garden />;
}

function Garden() {
  const { theme, toggle } = useTheme();
  const { username, signOut } = useAuth();
  const store = useStore();
  const [view, setView] = useState<View>({ name: 'home' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState(false);

  const navigate = useCallback((v: View) => {
    setView(v);
    setSidebarOpen(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') (target as HTMLElement).blur();
        return;
      }
      if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey) {
        const item = NAV[parseInt(e.key) - 1];
        if (item) navigate(item.view);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const isActive = (v: View) => view.name === v.name;

  const navList = (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.view);
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.view)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              active
                ? 'bg-sage-100 text-sage-700 dark:bg-sage-800/40 dark:text-sage-200'
                : 'text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
            )}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{item.label}</span>
            <kbd className={cn('text-[10px] font-mono opacity-50', active && 'opacity-70')}>
              {item.shortcut}
            </kbd>
          </button>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="px-3 py-3 border-t border-ink-100 dark:border-ink-800 space-y-0.5">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 transition-all"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
      </button>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-7 h-7 shrink-0 rounded-full bg-sage-500 text-white flex items-center justify-center text-xs font-semibold uppercase">
          {username?.slice(0, 1) ?? '?'}
        </div>
        <span className="flex-1 text-sm font-medium truncate">{username}</span>
        <button
          onClick={signOut}
          title="Sign out"
          className="btn btn-ghost p-1.5 rounded-lg text-ink-400 hover:text-rose-500 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-60 flex-col border-r border-ink-100 dark:border-ink-800 glass-strong">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sage-500 text-white">
            <Sprout size={20} />
          </div>
          <div>
            <h1 className="font-serif text-lg font-medium leading-none">English Garden</h1>
            <p className="text-xs text-ink-400 mt-0.5">Grow your vocabulary</p>
          </div>
        </div>
        {navList}
        {sidebarFooter}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 glass-strong border-r border-ink-100 dark:border-ink-800 flex flex-col animate-slide-up">
            <div className="flex items-center gap-2.5 px-6 py-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sage-500 text-white">
                <Sprout size={20} />
              </div>
              <h1 className="font-serif text-lg font-medium">English Garden</h1>
            </div>
            {navList}
            {sidebarFooter}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 glass-strong border-b border-ink-100 dark:border-ink-800 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="btn btn-ghost p-2 rounded-lg">
            <Sprout size={20} className="text-sage-500" />
          </button>
          <h1 className="font-serif text-base font-medium">English Garden</h1>
          <button onClick={toggle} className="btn btn-ghost p-2 rounded-lg">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {/* Sync failures used to be swallowed silently — surface them instead. */}
        {store.error && (
          <div className="mx-5 md:mx-8 mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{store.error}</span>
            <button onClick={store.dismissError} className="btn btn-ghost p-0.5 rounded shrink-0">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="animate-fade-in" key={JSON.stringify(view)}>
          {view.name === 'home' && <HomePage store={store} navigate={navigate} />}
          {view.name === 'words' && <WordsPage store={store} navigate={navigate} />}
          {view.name === 'add' && <AddWordPage store={store} navigate={navigate} />}
          {view.name === 'word' && <WordDetailPage store={store} navigate={navigate} wordId={view.id} />}
          {view.name === 'review' && <ReviewPage store={store} navigate={navigate} />}
          {view.name === 'recall' && <RecallPage store={store} navigate={navigate} mode={view.mode} />}
          {view.name === 'stats' && <StatsPage store={store} />}
          {view.name === 'categories' && <CategoriesPage store={store} />}
          {view.name === 'discover' && <DiscoverPage store={store} navigate={navigate} />}
          {view.name === 'folder' && <SharedFolderPage store={store} navigate={navigate} folderId={view.id} />}
          {view.name === 'settings' && <SettingsPage store={store} />}
        </div>
      </main>

      {/* Quick search overlay */}
      {quickSearch && (
        <QuickSearch
          store={store}
          onClose={() => setQuickSearch(false)}
          onSelect={(id) => {
            navigate({ name: 'word', id });
            setQuickSearch(false);
          }}
        />
      )}

      {/* Floating search trigger - desktop */}
      <button
        onClick={() => setQuickSearch(true)}
        className="hidden md:flex fixed bottom-6 right-6 items-center gap-2 px-4 py-2.5 card shadow-float rounded-2xl text-sm text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-100 transition-all z-20"
      >
        <Search size={16} />
        <span>Quick search</span>
        <kbd className="text-[10px] font-mono opacity-50 flex items-center gap-0.5">
          <Command size={10} />K
        </kbd>
      </button>
    </div>
  );
}

function QuickSearch({
  store,
  onClose,
  onSelect,
}: {
  store: Store;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const results = q
    ? store.words
        .filter(
          (w) =>
            w.word.toLowerCase().includes(q.toLowerCase()) ||
            w.definition?.toLowerCase().includes(q.toLowerCase()) ||
            w.example?.toLowerCase().includes(q.toLowerCase()) ||
            w.association?.toLowerCase().includes(q.toLowerCase())
        )
        .slice(0, 8)
    : store.words.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl card shadow-float animate-scale-in overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <Search size={18} className="text-ink-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search words, definitions, examples..."
            className="flex-1 bg-transparent outline-none text-base"
          />
          <kbd className="text-[10px] font-mono opacity-50">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-400">No words found</p>
          ) : (
            results.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium font-serif text-base">{w.word}</span>
                  {w.part_of_speech && <span className="text-xs text-ink-400 italic">{w.part_of_speech}</span>}
                </div>
                {w.definition && <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5 line-clamp-1">{w.definition}</p>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
