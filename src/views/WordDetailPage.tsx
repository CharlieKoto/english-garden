import { useState } from 'react';
import type { Store } from '@/lib/store';
import type { View } from '@/lib/types';
import { StatusBadge } from '@/components/Badges';
import { cn, formatDate, relativeDays } from '@/lib/utils';
import {
  ArrowLeft, Star, Trash2, Edit3, BookOpen, History, Save, X,
} from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
  wordId: string;
}

export function WordDetailPage({ store, navigate, wordId }: Props) {
  const word = store.words.find((w) => w.id === wordId);
  const [editing, setEditing] = useState(false);
  const [editWord, setEditWord] = useState(word?.word || '');
  const [editIpa, setEditIpa] = useState(word?.ipa || '');
  const [editPos, setEditPos] = useState(word?.part_of_speech || '');
  const [editDefinition, setEditDefinition] = useState(word?.definition || '');
  const [editExample, setEditExample] = useState(word?.example || '');
  const [editImage, setEditImage] = useState(word?.image_url || '');
  const [editAssociation, setEditAssociation] = useState(word?.association || '');
  const [editStory, setEditStory] = useState(word?.story || '');
  const [editNotes, setEditNotes] = useState(word?.notes || '');
  const [editDifficulty, setEditDifficulty] = useState(word?.difficulty || 1);
  const [editCategoryId, setEditCategoryId] = useState(word?.category_id || '');
  const [editFavorite, setEditFavorite] = useState(word?.favorite || false);

  if (!word) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12 text-center">
        <p className="text-ink-400 mb-4">This word could not be found.</p>
        <button onClick={() => navigate({ name: 'words' })} className="btn btn-primary px-5 py-2.5">Back to words</button>
      </div>
    );
  }

  const category = store.categories.find((c) => c.id === word.category_id);

  async function handleSave() {
    await store.updateWord(word!.id, {
      word: editWord.trim(),
      ipa: editIpa.trim() || null,
      part_of_speech: editPos || null,
      definition: editDefinition.trim() || null,
      example: editExample.trim() || null,
      image_url: editImage.trim() || null,
      association: editAssociation.trim() || null,
      story: editStory.trim() || null,
      notes: editNotes.trim() || null,
      difficulty: editDifficulty,
      category_id: editCategoryId || null,
      favorite: editFavorite,
    });
    setEditing(false);
  }

  async function handleDelete() {
    await store.deleteWord(word!.id);
    navigate({ name: 'words' });
  }

  async function toggleFavorite() {
    await store.updateWord(word!.id, { favorite: !word!.favorite });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <button onClick={() => navigate({ name: 'words' })} className="btn btn-ghost px-3 py-2 mb-6 -ml-2 text-sm">
        <ArrowLeft size={16} />
        All words
      </button>

      {/* Header */}
      <div className="card p-6 md:p-8 mb-6 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {editing ? (
              <input value={editWord} onChange={(e) => setEditWord(e.target.value)} className="input text-2xl font-serif font-medium mb-2" />
            ) : (
              <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">{word.word}</h1>
            )}
            <div className="flex items-center gap-3 mt-2">
              {editing ? (
                <input value={editIpa} onChange={(e) => setEditIpa(e.target.value)} placeholder="/ipa/" className="input font-mono text-sm w-40" />
              ) : (
                word.ipa && <p className="text-ink-400 font-mono text-base">{word.ipa}</p>
              )}
              {editing ? (
                <input value={editPos} onChange={(e) => setEditPos(e.target.value)} placeholder="part of speech" className="input text-sm w-40" />
              ) : (
                word.part_of_speech && <span className="text-ink-400 italic text-sm">{word.part_of_speech}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleFavorite} className="btn btn-ghost p-2.5 rounded-full">
              <Star size={20} className={word.favorite ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
            <button onClick={() => setEditing(!editing)} className="btn btn-ghost p-2.5 rounded-full">
              <Edit3 size={18} />
            </button>
            <button onClick={handleDelete} className="btn btn-ghost p-2.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusBadge status={word.status} />
          {category && (
            <span className="chip text-xs" style={{ background: `${category.color}20`, color: category.color }}>
              {category.name}
            </span>
          )}
          {editing ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setEditDifficulty(n)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-all',
                    n <= editDifficulty ? 'bg-sage-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <span className="chip bg-ink-100 dark:bg-ink-800 text-xs">
              Difficulty: {'★'.repeat(word.difficulty)}{'☆'.repeat(5 - word.difficulty)}
            </span>
          )}
          {editing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setEditFavorite(!editFavorite)}
                className={cn('w-10 h-6 rounded-full transition-colors relative', editFavorite ? 'bg-sage-500' : 'bg-ink-200 dark:bg-ink-700')}
              >
                <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', editFavorite ? 'translate-x-5' : 'translate-x-1')} />
              </button>
              <span className="text-xs text-ink-500">Favorite</span>
            </label>
          )}
        </div>

        {/* Image */}
        {word.image_url && !editing && (
          <img src={word.image_url} alt={word.word} className="w-full h-56 object-cover rounded-2xl mb-5" />
        )}
        {editing && (
          <div className="mb-5">
            <Label text="Image URL" />
            <input value={editImage} onChange={(e) => setEditImage(e.target.value)} className="input" placeholder="Paste image URL" />
          </div>
        )}

        {/* Definition */}
        <div className="mb-5">
          <Label icon={BookOpen} text="Definition" />
          {editing ? (
            <textarea value={editDefinition} onChange={(e) => setEditDefinition(e.target.value)} className="input min-h-[60px]" />
          ) : (
            <p className="text-lg text-ink-800 dark:text-ink-100">{word.definition || 'No definition yet.'}</p>
          )}
        </div>

        {/* Example */}
        <div className="mb-5">
          <Label icon={BookOpen} text="Example" />
          {editing ? (
            <textarea value={editExample} onChange={(e) => setEditExample(e.target.value)} className="input min-h-[60px]" />
          ) : (
            <p className="text-ink-600 dark:text-ink-300 italic border-l-2 border-sage-300 pl-4">
              {word.example ? `"${word.example}"` : 'No example yet.'}
            </p>
          )}
        </div>

        {/* Association */}
        <div className="mb-5">
          <Label text="My association" />
          {editing ? (
            <textarea value={editAssociation} onChange={(e) => setEditAssociation(e.target.value)} className="input min-h-[80px]" placeholder="Your personal memory trick..." />
          ) : (
            <p className="text-ink-600 dark:text-ink-300">{word.association || 'Add a personal association to strengthen your memory.'}</p>
          )}
        </div>

        {/* Story */}
        <div className="mb-5">
          <Label text="My story" />
          {editing ? (
            <textarea value={editStory} onChange={(e) => setEditStory(e.target.value)} className="input min-h-[80px]" placeholder="A personal story..." />
          ) : (
            <p className="text-ink-600 dark:text-ink-300">{word.story || 'No personal story yet.'}</p>
          )}
        </div>

        {/* Notes */}
        <div className="mb-5">
          <Label text="Notes" />
          {editing ? (
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="input min-h-[60px]" />
          ) : (
            <p className="text-ink-600 dark:text-ink-300">{word.notes || 'No notes.'}</p>
          )}
        </div>

        {/* Category edit */}
        {editing && (
          <div className="mb-5">
            <Label text="Folder" />
            <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="input cursor-pointer">
              <option value="">No folder</option>
              {store.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {editing && (
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary px-5 py-2.5">
              <Save size={18} /> Save changes
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost px-5 py-2.5">
              <X size={18} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Review history & progress */}
      <div className="card p-6">
        <Label icon={History} text="Review history" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Reps" value={word.srs_reps} />
          <Stat label="Interval" value={`${word.srs_interval}d`} />
          <Stat label="Ease" value={word.srs_ease.toFixed(2)} />
          <Stat label="Next due" value={relativeDays(word.srs_due)} />
        </div>
        <div className="text-sm text-ink-400 space-y-1">
          <p>Added: {formatDate(word.created_at)}</p>
          <p>Last reviewed: {formatDate(word.last_reviewed)}</p>
        </div>
      </div>
    </div>
  );
}

function Label({ icon: Icon, text }: { icon?: typeof BookOpen; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon size={15} className="text-sage-500" />}
      <span className="text-xs uppercase tracking-wider font-medium text-ink-400">{text}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
