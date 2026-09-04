import { useState, useEffect } from 'react';
import type { Store } from '@/lib/store';
import type { View, ReviewRating, Word } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/Badges';
import { ArrowLeft, Eye, Check, ChevronRight } from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
}

export function ReviewPage({ store, navigate }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [sessionWords, setSessionWords] = useState<Word[] | null>(null);

  useEffect(() => {
    if (!store.loading && sessionWords === null) {
      setSessionWords(store.words.filter((w) => w.srs_due <= today && w.status !== 'know'));
    }
  }, [store.loading, sessionWords, store.words, today]);

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ easy: 0, good: 0, hard: 0, forgot: 0 });

  if (store.loading || sessionWords === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionWords.length === 0 || done) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-sage-500" />
        </div>
        <h1 className="font-serif text-3xl font-medium mb-2">
          {done ? 'Session complete!' : 'No reviews due'}
        </h1>
        <p className="text-ink-400 mb-6">
          {done
            ? `You reviewed ${sessionWords.length} words. ${sessionStats.easy} easy, ${sessionStats.good} good, ${sessionStats.hard} hard, ${sessionStats.forgot} forgotten.`
            : 'Come back later or add new words to learn.'}
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate({ name: 'home' })} className="btn btn-primary px-5 py-2.5">
            Back home
          </button>
          <button onClick={() => navigate({ name: 'recall' })} className="btn btn-ghost px-5 py-2.5">
            Practice recall
          </button>
        </div>
      </div>
    );
  }

  const words = sessionWords;
  const word = words[idx];

  async function handleRate(rating: ReviewRating) {
    await store.reviewWord(word.id, rating);
    setSessionStats((s) => ({ ...s, [rating]: s[rating] + 1 }));
    if (idx + 1 >= words.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 md:py-12">
      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate({ name: 'home' })} className="btn btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-ink-400 mb-1.5">
            <span>Review session</span>
            <span>{idx + 1} / {sessionWords.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-300"
              style={{ width: `${((idx + 1) / sessionWords.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="card p-8 md:p-10 mb-6 animate-fade-in" key={word.id}>
        {/* Hidden word - show as image first if available */}
        {word.image_url && !revealed && (
          <div className="text-center mb-6">
            <img src={word.image_url} alt="" className="w-full max-h-64 object-cover rounded-2xl mb-4" />
            <p className="text-sm text-ink-400">What word does this image represent?</p>
          </div>
        )}

        {!revealed && !word.image_url && (
          <div className="text-center py-12">
            <p className="text-sm text-ink-400 mb-4">Try to recall this word before revealing:</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-400">
              <Eye size={16} />
              <span className="text-sm">Hint: {word.part_of_speech || 'word'}</span>
            </div>
          </div>
        )}

        {revealed && (
          <div className="text-center animate-slide-up">
            <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-2">{word.word}</h1>
            <div className="flex items-center justify-center gap-3 mb-4">
              {word.ipa && <p className="text-ink-400 font-mono">{word.ipa}</p>}
              {word.part_of_speech && <span className="text-ink-400 italic text-sm">{word.part_of_speech}</span>}
            </div>
            {word.image_url && <img src={word.image_url} alt={word.word} className="w-full max-h-48 object-cover rounded-2xl mb-4" />}
            {word.definition && <p className="text-lg text-ink-700 dark:text-ink-200 mb-3">{word.definition}</p>}
            {word.example && (
              <p className="text-ink-500 dark:text-ink-400 italic border-l-2 border-sage-300 pl-4 text-left max-w-md mx-auto">
                "{word.example}"
              </p>
            )}
            {word.association && (
              <div className="mt-4 p-3 rounded-xl bg-sage-50 dark:bg-sage-900/20 text-left max-w-md mx-auto">
                <p className="text-xs text-sage-600 dark:text-sage-400 font-medium mb-1">Your association:</p>
                <p className="text-sm text-ink-600 dark:text-ink-300">{word.association}</p>
              </div>
            )}
            <div className="mt-4">
              <StatusBadge status={word.status} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="btn btn-primary w-full py-4 text-base">
          <Eye size={20} />
          Reveal answer
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2 animate-slide-up">
          <RateButton rating="forgot" label="Forgot" color="rose" onClick={() => handleRate('forgot')} />
          <RateButton rating="hard" label="Hard" color="amber" onClick={() => handleRate('hard')} />
          <RateButton rating="good" label="Good" color="sky" onClick={() => handleRate('good')} />
          <RateButton rating="easy" label="Easy" color="emerald" onClick={() => handleRate('easy')} />
        </div>
      )}

      <p className="text-center text-xs text-ink-400 mt-4">
        Rate how well you remembered — intervals adjust automatically
      </p>
    </div>
  );
}

function RateButton({
  rating,
  label,
  color,
  onClick,
}: {
  rating: ReviewRating;
  label: string;
  color: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40',
    sky: 'bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/40',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40',
  };
  return (
    <button onClick={onClick} className={cn('btn py-3 font-medium transition-all', colors[color])}>
      {label}
    </button>
  );
}
