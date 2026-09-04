import { useState, useMemo } from 'react';
import type { Store } from '@/lib/store';
import type { View, WordStatus } from '@/lib/types';
import { StatusBadge } from '@/components/Badges';
import { cn } from '@/lib/utils';
import { Search, Plus, Star } from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
}

export function WordsPage({ store, navigate }: Props) {
  const { words, categories } = store;
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    return words.filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && w.category_id !== categoryFilter) return false;
      if (favoritesOnly && !w.favorite) return false;
      if (q) {
        const lc = q.toLowerCase();
        return (
          w.word.toLowerCase().includes(lc) ||
          w.definition?.toLowerCase().includes(lc) ||
          w.example?.toLowerCase().includes(lc) ||
          w.association?.toLowerCase().includes(lc) ||
          w.notes?.toLowerCase().includes(lc)
        );
      }
      return true;
    });
  }, [words, q, statusFilter, categoryFilter, favoritesOnly]);

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Your Words</h1>
          <p className="text-ink-400 mt-1">{words.length} words in your garden</p>
        </div>
        <button onClick={() => navigate({ name: 'add' })} className="btn btn-primary px-4 py-2.5">
          <Plus size={18} />
          <span className="hidden sm:inline">Add word</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by word, definition, example, association..."
          className="input pl-12"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterChip>
        <FilterChip active={statusFilter === 'dont_know'} onClick={() => setStatusFilter('dont_know')}>Don't know</FilterChip>
        <FilterChip active={statusFilter === 'learning'} onClick={() => setStatusFilter('learning')}>Learning</FilterChip>
        <FilterChip active={statusFilter === 'know'} onClick={() => setStatusFilter('know')}>Known</FilterChip>
        <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1" />
        <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly((s) => !s)}>
          <Star size={14} className={favoritesOnly ? 'fill-amber-400 text-amber-400' : ''} />
          Favorites
        </FilterChip>
        {categories.length > 0 && (
          <>
            <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1" />
            <FilterChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All folders</FilterChip>
            {categories.map((c) => (
              <FilterChip key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </FilterChip>
            ))}
          </>
        )}
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink-400 mb-4">{words.length === 0 ? 'Your garden is empty. Add your first word to start growing.' : 'No words match your filters.'}</p>
          {words.length === 0 && (
            <button onClick={() => navigate({ name: 'add' })} className="btn btn-primary px-5 py-2.5">
              Add your first word
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((w) => {
            const cat = categories.find((c) => c.id === w.category_id);
            return (
              <div
                key={w.id}
                onClick={() => navigate({ name: 'word', id: w.id })}
                className="card card-hover p-4 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-serif text-xl font-medium group-hover:text-sage-600 dark:group-hover:text-sage-300 transition-colors">
                      {w.word}
                    </h3>
                    {w.ipa && <p className="text-xs text-ink-400 font-mono mt-0.5">{w.ipa}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {w.favorite && <Star size={14} className="fill-amber-400 text-amber-400" />}

                  </div>
                </div>
                {w.definition && (
                  <p className="text-sm text-ink-500 dark:text-ink-300 line-clamp-2 mb-2">{w.definition}</p>
                )}
                <div className="flex items-center justify-between">
                  <StatusBadge status={w.status} />
                  {cat && (
                    <span className="chip text-xs" style={{ background: `${cat.color}20`, color: cat.color }}>
                      {cat.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'chip cursor-pointer transition-all',
        active
          ? 'bg-sage-500 text-white'
          : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
      )}
    >
      {children}
    </button>
  );
}
