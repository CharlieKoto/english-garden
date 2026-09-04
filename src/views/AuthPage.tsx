import { useState, type FormEvent } from 'react';
import { useAuth, validateUsername, USERNAME_RULES } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Sprout, Loader2, AlertCircle, User, Lock } from 'lucide-react';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameProblem = mode === 'signup' && username ? validateUsername(username) : null;
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && !busy && !nameProblem;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signUp(username, password);
      } else {
        await signIn(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-500 text-white mb-4">
            <Sprout size={28} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">English Garden</h1>
          <p className="text-ink-400 mt-1.5 text-sm">Grow your vocabulary</p>
        </div>

        <div className="card p-6">
          <div className="flex p-1 rounded-xl bg-ink-100 dark:bg-ink-800 mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  mode === m
                    ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 shadow-sm'
                    : 'text-ink-500 dark:text-ink-400'
                )}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sasha"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  className="input pl-9"
                />
              </div>
              {mode === 'signup' && (
                <p className={cn('text-xs mt-1.5', nameProblem ? 'text-rose-500' : 'text-ink-400')}>
                  {nameProblem ?? USERNAME_RULES}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="input pl-9"
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-ink-400 mt-1.5">At least 6 characters.</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary w-full py-3 disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 mt-6 leading-relaxed">
          {mode === 'signin'
            ? 'Your words, folders and progress sync to your account.'
            : 'Your username is how other people share folders with you.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Shown when a session exists but no `usernames` row does — e.g. sign-up
 * succeeded but the follow-up insert failed. Lets the user finish setup
 * instead of landing in an app that can't identify them.
 */
export function ClaimUsernamePage() {
  const { claimUsername, signOut, userId } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problem = username ? validateUsername(username) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || problem || busy) return;
    setBusy(true);
    setError(null);
    try {
      await claimUsername(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-500 text-white mb-4">
            <Sprout size={28} />
          </div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">Pick your username</h1>
          <p className="text-ink-400 mt-1.5 text-sm">
            Your account is ready, it just needs a handle so others can share folders with you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sasha"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                className="input pl-9"
              />
            </div>
            <p className={cn('text-xs mt-1.5', problem ? 'text-rose-500' : 'text-ink-400')}>
              {problem ?? USERNAME_RULES}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !!problem || busy}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Continue
          </button>

          {userId && (
            <button
              type="button"
              onClick={signOut}
              className="w-full text-xs text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors"
            >
              Sign out instead
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
