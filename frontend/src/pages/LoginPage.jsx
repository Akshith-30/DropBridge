import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { login } from '../services/authApi';
import useAuthStore from '../store/authStore';
import { formField, formInput, formLabel } from '../lib/formStyles';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      setAuth({
        accessToken: res.data.accessToken,
        user: res.data.user,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
      <div className="w-full max-w-md animate-fade-in-up rounded-[1.25rem] border border-white/12 bg-[rgba(14,14,20,0.92)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Sign in</h1>
        <p className="mb-6 text-sm text-white/55">
          Optional — you can still send files without an account. Sign in to link transfers to your profile.
        </p>

        <form onSubmit={handleSubmit} className="space-y-1">
          <div className={formField}>
            <label htmlFor="login-email" className={formLabel}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              className={formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={formField}>
            <label htmlFor="login-password" className={formLabel}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className={formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          No account?{' '}
          <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
