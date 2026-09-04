import { useMemo } from 'react';
import type { Store } from '@/lib/store';
import type { View } from '@/lib/types';
import { StatusBadge } from '@/components/Badges';
import { cn, relativeDays } from '@/lib/utils';
import { ArrowRight, Flame, BookOpen, Star, Shuffle, TrendingUp, Calendar } from 'lucide-react';

interface Props {
  store: Store;
  navigate: (v: View) => void;
}

export function HomePage({ store, navigate }: Props) {
  const { words, reviewDays } = store;
  const today = new Date().toISOString().split('T')[0];
  const dueWords = words.filter((w) => w.srs_due <= today && w.status !== 'know');
  const recent = words.slice(0, 6);
  const favorites = words.filter((w) => w.favorite).slice(0, 4);
  const known = words.filter((w) => w.status === 'know').length;
  const learning = words.filter((w) => w.status === 'learning').length;
  const dontKnow = words.filter((w) => w.status === 'dont_know').length;

  // streak
  const sortedDays = reviewDays
    .filter((d) => d.review_count > 0)
    .map((d) => d.review_date)
    .sort();
  let streak = 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (sortedDays.length > 0) {
    const last = sortedDays[sortedDays.length - 1];
    if (last === today || last === yesterday) {
      streak = 1;
      for (let i = sortedDays.length - 2; i >= 0; i--) {
        const prev = new Date(sortedDays[i + 1]);
        const cur = new Date(sortedDays[i]);
        const diff = (prev.getTime() - cur.getTime()) / 86400000;
        if (diff === 1) streak++;
        else break;
      }
    }
  }

  const todayReviews = reviewDays.find((d) => d.review_date === today)?.review_count || 0;
  const randomWord = useMemo(() => words.length > 0 ? words[Math.floor(Math.random() * words.length)] : null, [store.loading]);

  if (store.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
      {/* Hero */}
      <div className="mb-10">
        <p className="text-sm text-ink-400 mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          {dueWords.length > 0 ? (
            <>
              <span className="text-sage-500">{dueWords.length}</span> {dueWords.length === 1 ? 'word' : 'words'} to review
            </>
          ) : (
            <>All caught up</>
          )}
        </h1>
        <p className="text-ink-500 dark:text-ink-300 mt-2 text-lg">
          {dueWords.length > 0 ? 'Take a moment to tend your garden.' : 'Your garden is well tended. Come back tomorrow or add new words.'}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard icon={Flame} label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} accent="amber" />
        <StatCard icon={Calendar} label="Today" value={`${todayReviews} reviews`} accent="sage" />
        <StatCard icon={BookOpen} label="Known" value={`${known}`} accent="emerald" />
        <StatCard icon={TrendingUp} label="Learning" value={`${learning}`} accent="sky" />
      </div>

      {/* Today's reviews CTA */}
      {dueWords.length > 0 && (
        <div className="card card-hover mb-8 p-6 cursor-pointer animate-slide-up" onClick={() => navigate({ name: 'review' })}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-medium mb-1">Ready to review?</h2>
              <p className="text-ink-500 dark:text-ink-400">{dueWords.length} words are due for spaced repetition practice.</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-500 text-white">
              <ArrowRight size={24} />
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Recently added */}
        <Section title="Recently added" action={() => navigate({ name: 'words' })}>
          {recent.length === 0 ? (
            <EmptyState text="No words yet. Add your first word to begin." onClick={() => navigate({ name: 'add' })} />
          ) : (
            <div className="space-y-1">
              {recent.map((w) => (
                <WordRow key={w.id} word={w.word} pos={w.part_of_speech} status={w.status} onClick={() => navigate({ name: 'word', id: w.id })} />
              ))}
            </div>
          )}
        </Section>

        {/* Favorites */}
        <Section title="Favorite words" icon={Star} action={() => navigate({ name: 'words' })}>
          {favorites.length === 0 ? (
            <EmptyState text="Star words to find them here quickly." />
          ) : (
            <div className="space-y-1">
              {favorites.map((w) => (
                <WordRow key={w.id} word={w.word} pos={w.part_of_speech} status={w.status} onClick={() => navigate({ name: 'word', id: w.id })} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Random word */}
      {randomWord && (
        <div className="card card-hover mb-8 p-6 cursor-pointer" onClick={() => navigate({ name: 'word', id: randomWord.id })}>
          <div className="flex items-center gap-2 mb-3">
            <Shuffle size={16} className="text-sage-500" />
            <span className="text-xs uppercase tracking-wider font-medium text-ink-400">Word of the moment</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-3xl font-medium">{randomWord.word}</h3>
              {randomWord.ipa && <p className="text-ink-400 mt-1 font-mono text-sm">{randomWord.ipa}</p>}
              {randomWord.definition && <p className="text-ink-500 dark:text-ink-300 mt-2 max-w-xl">{randomWord.definition}</p>}
            </div>

          </div>
        </div>
      )}

      {/* Progress overview */}
      <Section title="Your progress">
        <div className="grid grid-cols-3 gap-3">
          <ProgressCard label="Known" value={known} total={words.length} color="emerald" />
          <ProgressCard label="Learning" value={learning} total={words.length} color="amber" />
          <ProgressCard label="New" value={dontKnow} total={words.length} color="rose" />
        </div>
      </Section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Flame; label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    sage: 'text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20',
  };
  return (
    <div className="card p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', colors[accent])}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-ink-400 font-medium">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: typeof Star;
  action?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg font-medium flex items-center gap-2">
          {Icon && <Icon size={16} className="text-sage-500" />}
          {title}
        </h2>
        {action && (
          <button onClick={action} className="text-xs text-ink-400 hover:text-sage-500 transition-colors font-medium">
            View all
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function WordRow({
  word,
  pos,
  status,
  onClick,
}: {
  word: string;
  pos: string | null;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="font-serif text-base font-medium group-hover:text-sage-600 dark:group-hover:text-sage-300 transition-colors">{word}</span>
        {pos && <span className="text-xs text-ink-400 italic">{pos}</span>}
      </div>
      <StatusBadge status={status as never} />
    </button>
  );
}

function EmptyState({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-ink-400 mb-3">{text}</p>
      {onClick && (
        <button onClick={onClick} className="btn btn-primary px-4 py-2 text-sm">
          Add a word
        </button>
      )}
    </div>
  );
}

function ProgressCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="text-center">
      <div className="relative h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden mb-2">
        <div className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-500', colors[color])} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
