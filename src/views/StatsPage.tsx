import { useMemo } from 'react';
import type { Store } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Flame, BookOpen, TrendingUp, Target, Calendar, Award, AlertTriangle } from 'lucide-react';

interface Props {
  store: Store;
}

export function StatsPage({ store }: Props) {
  const { words, reviewDays, categories } = store;

  const known = words.filter((w) => w.status === 'know').length;
  const learning = words.filter((w) => w.status === 'learning').length;
  const dontKnow = words.filter((w) => w.status === 'dont_know').length;

  // Streak calculation
  const sortedDays = reviewDays
    .filter((d) => d.review_count > 0)
    .map((d) => d.review_date)
    .sort();
  let currentStreak = 0;
  let longestStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sortedDays.length > 0) {
    const last = sortedDays[sortedDays.length - 1];
    if (last === today || last === yesterday) {
      currentStreak = 1;
      for (let i = sortedDays.length - 2; i >= 0; i--) {
        const prev = new Date(sortedDays[i + 1]);
        const cur = new Date(sortedDays[i]);
        const diff = (prev.getTime() - cur.getTime()) / 86400000;
        if (diff === 1) currentStreak++;
        else break;
      }
    }
    let temp = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i]);
      const cur = new Date(sortedDays[i - 1]);
      const diff = (prev.getTime() - cur.getTime()) / 86400000;
      if (diff === 1) temp++;
      else {
        longestStreak = Math.max(longestStreak, temp);
        temp = 1;
      }
    }
    longestStreak = Math.max(longestStreak, temp, currentStreak);
  }

  // Today's reviews
  const todayReviews = reviewDays.find((d) => d.review_date === today)?.review_count || 0;

  // Retention: known / (known + learning) — words that have been studied
  const studied = known + learning;
  const retention = studied > 0 ? Math.round((known / studied) * 100) : 0;

  // Most forgotten words: words with lowest srs_ease or most reviews with 'forgot'
  const mostForgotten = useMemo(() => {
    return [...words]
      .filter((w) => w.last_reviewed !== null)
      .sort((a, b) => a.srs_ease - b.srs_ease || b.srs_reps - a.srs_reps)
      .slice(0, 5);
  }, [words]);

  // Weakest categories
  const categoryStats = useMemo(() => {
    return categories
      .map((cat) => {
        const catWords = words.filter((w) => w.category_id === cat.id);
        const catKnown = catWords.filter((w) => w.status === 'know').length;
        const rate = catWords.length > 0 ? (catKnown / catWords.length) * 100 : 100;
        return { ...cat, total: catWords.length, known: catKnown, rate };
      })
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [words, categories]);

  // Weekly progress (last 7 days)
  const weeklyData = useMemo(() => {
    const days: { date: string; count: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().split('T')[0];
      const day = reviewDays.find((r) => r.review_date === iso);
      days.push({
        date: iso,
        count: day?.review_count || 0,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return days;
  }, [reviewDays]);

  // Monthly progress (last 30 days)
  const monthlyData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().split('T')[0];
      const day = reviewDays.find((r) => r.review_date === iso);
      days.push({ date: iso, count: day?.review_count || 0 });
    }
    return days;
  }, [reviewDays]);

  const maxWeekly = Math.max(...weeklyData.map((d) => d.count), 1);

  // Heatmap (last 12 weeks)
  const heatmapData = useMemo(() => {
    const weeks: { date: string; count: number }[][] = [];
    for (let w = 11; w >= 0; w--) {
      const week: { date: string; count: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const date = new Date(Date.now() - (w * 7 + d) * 86400000);
        const iso = date.toISOString().split('T')[0];
        const day = reviewDays.find((r) => r.review_date === iso);
        week.push({ date: iso, count: day?.review_count || 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [reviewDays]);

  if (store.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-2">Statistics</h1>
      <p className="text-ink-400 mb-8">Track your vocabulary growth and learning patterns.</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={BookOpen} label="Words learned" value={`${known}`} sub={`of ${words.length} total`} color="emerald" />
        <StatCard icon={Flame} label="Current streak" value={`${currentStreak}d`} sub={`Best: ${longestStreak}d`} color="amber" />
        <StatCard icon={Target} label="Retention" value={`${retention}%`} sub={`${studied} studied`} color="sky" />
        <StatCard icon={Calendar} label="Today" value={`${todayReviews}`} sub="reviews" color="sage" />
      </div>

      {/* Status breakdown */}
      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg font-medium mb-4">Learning status</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatusBar label="Known" value={known} total={words.length} color="emerald" />
          <StatusBar label="Learning" value={learning} total={words.length} color="amber" />
          <StatusBar label="Don't know" value={dontKnow} total={words.length} color="rose" />
        </div>
      </div>

      {/* Weekly progress */}
      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-sage-500" />
          Weekly progress
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-lg bg-sage-400 dark:bg-sage-600 transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(d.count / maxWeekly) * 100}%` }}
                  title={`${d.count} reviews`}
                />
              </div>
              <span className="text-xs text-ink-400">{d.label}</span>
              <span className="text-xs font-medium">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Learning heatmap */}
      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-sage-500" />
          Learning heatmap
        </h2>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const intensity = day.count === 0 ? 0 : Math.min(4, Math.ceil(day.count / 3));
                  const colors = [
                    'bg-ink-100 dark:bg-ink-800',
                    'bg-sage-200 dark:bg-sage-800',
                    'bg-sage-300 dark:bg-sage-700',
                    'bg-sage-400 dark:bg-sage-600',
                    'bg-sage-500 dark:bg-sage-500',
                  ];
                  return (
                    <div
                      key={day.date}
                      className={cn('w-3 h-3 rounded-sm', colors[intensity])}
                      title={`${day.date}: ${day.count} reviews`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-ink-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-ink-100 dark:bg-ink-800" />
            <div className="w-3 h-3 rounded-sm bg-sage-200 dark:bg-sage-800" />
            <div className="w-3 h-3 rounded-sm bg-sage-300 dark:bg-sage-700" />
            <div className="w-3 h-3 rounded-sm bg-sage-400 dark:bg-sage-600" />
            <div className="w-3 h-3 rounded-sm bg-sage-500" />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Most forgotten */}
        <div className="card p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Most forgotten
          </h2>
          {mostForgotten.length === 0 ? (
            <p className="text-sm text-ink-400">No data yet. Review some words to see insights.</p>
          ) : (
            <div className="space-y-2">
              {mostForgotten.map((w) => (
                <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-ink-50 dark:bg-ink-800/50">
                  <span className="font-serif font-medium">{w.word}</span>
                  <span className="text-xs text-ink-400">
                    ease {w.srs_ease.toFixed(1)} · {w.srs_reps} reps
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weakest categories */}
        <div className="card p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Award size={18} className="text-sage-500" />
            Folder mastery
          </h2>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-ink-400">No folders yet. Create folders to track mastery by topic.</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-xs text-ink-400">{cat.known}/{cat.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.rate}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly summary */}
      <div className="card p-6 mt-6">
        <h2 className="font-serif text-lg font-medium mb-4">Monthly summary</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold font-serif">{monthlyData.reduce((s, d) => s + d.count, 0)}</p>
            <p className="text-xs text-ink-400">Reviews (30d)</p>
          </div>
          <div>
            <p className="text-2xl font-semibold font-serif">{monthlyData.filter((d) => d.count > 0).length}</p>
            <p className="text-xs text-ink-400">Active days</p>
          </div>
          <div>
            <p className="text-2xl font-semibold font-serif">
              {monthlyData.filter((d) => d.count > 0).length > 0
                ? Math.round(monthlyData.reduce((s, d) => s + d.count, 0) / monthlyData.filter((d) => d.count > 0).length)
                : 0}
            </p>
            <p className="text-xs text-ink-400">Avg per day</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20',
    sage: 'text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/20',
  };
  return (
    <div className="card p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', colors[color])}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-ink-400 font-medium">{label}</p>
      <p className="text-2xl font-semibold mt-0.5 font-serif">{value}</p>
      <p className="text-xs text-ink-400 mt-0.5">{sub}</p>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-ink-500 dark:text-ink-300">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', colors[color])} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-400 mt-1">{pct}%</p>
    </div>
  );
}
