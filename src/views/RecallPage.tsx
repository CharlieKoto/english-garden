import { useState, useEffect } from 'react';
import { Image, Eye, RotateCw, Check, X } from 'lucide-react';
import type { Store } from '@/lib/store';
import type { View, Word, RecallMode } from '@/lib/types';

export function RecallPage({
  store,
  navigate,
  mode: initialMode = 'random',
}: {
  store: Store;
  navigate: (v: View) => void;
  mode?: RecallMode;
}) {
  const [mode, setMode] = useState<RecallMode>(initialMode);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[] | null>(null);

  useEffect(() => {
    if (!store.loading && sessionWords === null) {
      let base = store.words;
      if (mode === 'mistakes') base = base.filter((w) => w.status === 'dont_know');
      else if (mode === 'difficult') base = base.filter((w) => w.difficulty >= 4);
      else base = base.filter((w) => w.status !== 'dont_know');
      setSessionWords(base);
    }
  }, [store.loading, sessionWords, store.words, mode]);

  if (store.loading || sessionWords === null) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <div className="animate-pulse text-ink-400">Loading…</div>
      </div>
    );
  }

  if (sessionWords.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <Image size={48} className="mx-auto mb-4 text-ink-300" />
        <h2 className="text-xl font-medium mb-2">No words to recall</h2>
        <p className="text-ink-400 mb-6">Add some words first, or change the recall mode.</p>
        <button onClick={() => navigate({ name: 'add' })} className="btn btn-primary px-5 py-2.5">
          Add a word
        </button>
      </div>
    );
  }

  if (idx >= sessionWords.length) {
    const total = sessionWords.length;
    const pct = Math.round((known.length / total) * 100);
    return (
      <div className="max-w-2xl mx-auto px-5 py-12 text-center animate-fade-in">
        <h2 className="font-serif text-3xl font-medium mb-2">Recall complete</h2>
        <p className="text-ink-500 dark:text-ink-300 mb-8">
          You recalled {known.length} of {total} words correctly ({pct}%).
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setIdx(0); setRevealed(false); setKnown([]); setUnknown([]); }}
            className="btn btn-ghost px-5 py-2.5"
          >
            <RotateCw size={18} /> Again
          </button>
          <button onClick={() => navigate({ name: 'home' })} className="btn btn-primary px-5 py-2.5">
            Done
          </button>
        </div>
      </div>
    );
  }

  const word = sessionWords[idx];
  const currentMode = mode === 'random' ? (['image', 'definition', 'example', 'word'] as RecallMode[])[idx % 4] : mode;

  const markKnown = () => {
    setKnown((p) => [...p, word.id]);
    setRevealed(false);
    setIdx((i) => i + 1);
  };
  const markUnknown = () => {
    setUnknown((p) => [...p, word.id]);
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate({ name: 'home' })} className="text-ink-400 hover:text-ink-700 text-sm">
          ← Back
        </button>
        <span className="text-sm text-ink-400">{idx + 1} / {sessionWords.length}</span>
      </div>

      <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-sage-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / sessionWords.length) * 100}%` }}
        />
      </div>

      <div className="card p-8 mb-6 animate-slide-up" key={word.id}>
        <RecallCard word={word} mode={currentMode} revealed={revealed} />
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="btn btn-primary w-full py-3.5 text-base"
        >
          <Eye size={20} /> Reveal
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <button onClick={markUnknown} className="btn btn-ghost py-3.5 border border-ink-200 dark:border-ink-700 text-error">
            <X size={20} /> Didn't know
          </button>
          <button onClick={markKnown} className="btn btn-primary py-3.5">
            <Check size={20} /> Knew it
          </button>
        </div>
      )}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wider text-ink-400 mb-3 text-center">Recall mode</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(['random', 'image', 'definition', 'example', 'word', 'mistakes', 'difficult'] as RecallMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setIdx(0); setRevealed(false); setKnown([]); setUnknown([]); setSessionWords(null); }}
              className={`chip ${mode === m ? 'bg-sage-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecallCard({ word, mode, revealed }: { word: Word; mode: RecallMode; revealed: boolean }) {
  const escapedWord = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blankedExample = word.example
    ? word.example.replace(new RegExp(escapedWord, 'gi'), '_____')
    : null;

  if (mode === 'image') {
    return (
      <div className="text-center">
        {word.image_url ? (
          <img src={word.image_url} alt="" className="w-full max-h-72 object-cover rounded-2xl mb-4" />
        ) : (
          <div className="py-12 text-ink-400">
            <Image size={48} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No image for this word</p>
          </div>
        )}
        {revealed && (
          <div className="animate-slide-up mt-4">
            <h2 className="font-serif text-3xl font-medium">{word.word}</h2>
            {word.definition && <p className="text-ink-500 dark:text-ink-400 mt-2">{word.definition}</p>}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'definition') {
    return (
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Definition</p>
        <p className="text-xl text-ink-700 dark:text-ink-200 font-serif">{word.definition || 'No definition available'}</p>
        {word.part_of_speech && <p className="text-sm text-ink-400 italic mt-2">{word.part_of_speech}</p>}
        {revealed && (
          <div className="animate-slide-up mt-4">
            <h2 className="font-serif text-3xl font-medium">{word.word}</h2>
            {word.example && <p className="text-sm text-ink-500 italic mt-2">"{word.example}"</p>}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'example') {
    return (
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Fill in the blank</p>
        <p className="text-xl text-ink-700 dark:text-ink-200 font-serif italic">
          {blankedExample || `"This sentence uses _____ in context."`}
        </p>
        {revealed && (
          <div className="animate-slide-up mt-4">
            <h2 className="font-serif text-3xl font-medium">{word.word}</h2>
            {word.definition && <p className="text-sm text-ink-500 mt-2">{word.definition}</p>}
          </div>
        )}
      </div>
    );
  }

  // word, random, mistakes, difficult
  return (
    <div className="text-center">
      {word.image_url && <img src={word.image_url} alt="" className="w-full max-h-48 object-cover rounded-2xl mb-4" />}
      {!revealed && mode === 'word' && (
        <h2 className="font-serif text-3xl font-medium">{word.word}</h2>
      )}
      {!revealed && mode !== 'word' && <p className="text-ink-400 text-sm">Try to recall this word</p>}
      {revealed && (
        <div className="animate-slide-up">
          <h2 className="font-serif text-3xl font-medium">{word.word}</h2>
          {word.ipa && <p className="text-sm text-ink-400 font-mono mt-1">{word.ipa}</p>}
          {word.definition && <p className="text-ink-500 dark:text-ink-400 mt-2">{word.definition}</p>}
          {word.example && <p className="text-sm text-ink-400 italic mt-2">"{word.example}"</p>}
        </div>
      )}
    </div>
  );
}
