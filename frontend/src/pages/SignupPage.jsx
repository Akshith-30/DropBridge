import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import PageBackButton from '../components/PageBackButton';
import { PAGE_CONTAINER_NARROW, PAGE_MAIN } from '../lib/pageLayout';
import { register } from '../services/authApi';
import useAuthStore from '../store/authStore';
import { setDisplayName } from '../utils/deviceIdentity';
import { formField, formInput, formLabel, formLabelMuted } from '../lib/formStyles';

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayNameInput] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      setAuth({
        accessToken: res.data.accessToken,
        user: res.data.user,
      });
      if (res.data.user?.displayName) {
        setDisplayName(res.data.user.displayName);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_CONTAINER_NARROW}>
        <PageBackButton fallback="/" />
        <div className="w-full animate-fade-in-up rounded-[1.25rem] border border-white/12 bg-[rgba(14,14,20,0.92)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Create account</h1>
        <p className="mb-6 text-sm text-white/55">
          Stateless sign-in — we use a lightweight JWT, no server sessions. Guest transfers still work without an account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-1">
          <div className={formField}>
            <label htmlFor="signup-name" className={formLabel}>
              Display name <span className={formLabelMuted}>(optional)</span>
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              maxLength={80}
              className={formInput}
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayNameInput(e.target.value)}
            />
          </div>
          <div className={formField}>
            <label htmlFor="signup-email" className={formLabel}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              className={formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={formField}>
            <label htmlFor="signup-password" className={formLabel}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[0.8125rem] text-white/45">At least 8 characters</p>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-2 w-full justify-center min-h-12">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
