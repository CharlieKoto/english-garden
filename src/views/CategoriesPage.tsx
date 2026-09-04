import { useState } from 'react';
import type { Store } from '@/lib/store';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { Plus, FolderTree, Trash2, Check } from 'lucide-react';

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
          <p className="text-ink-400 mt-1">Organize your words by topic</p>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cat.color}20` }}>
                      <FolderTree size={20} style={{ color: cat.color }} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-medium">{cat.name}</h3>
                      <p className="text-xs text-ink-400">{count} words · {known} known</p>
                    </div>
                  </div>
                  <button
                    onClick={() => store.deleteCategory(cat.id)}
                    className="btn btn-ghost p-2 rounded-lg opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
    </div>
  );
}
