import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, LogIn } from 'lucide-react';
import { login as loginApi, me as meApi } from '../api/authService';

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [membershipId, setMembershipId] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async () => {
      // Ensure the cookie-based session is actually established before leaving the login page.
      // This avoids the "login succeeds but requires a second try" behavior.
      try {
        await queryClient.invalidateQueries({ queryKey: ['me'] });
        await queryClient.fetchQuery({
          queryKey: ['me'],
          queryFn: meApi,
          retry: false,
        });
        toast.success('Logged in');
        navigate('/', { replace: true });
      } catch {
        toast.error('Login succeeded, but session was not established. Check cookies / CORS.');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Login failed');
    },
  });

  const submit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ membershipId: membershipId.trim(), password });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Admin Login</h1>
          <p className="text-sm text-slate-500">Sign in with your Membership ID.</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Membership ID</label>
            <input
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. IEDC-XXXX"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50"
          >
            {loginMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-xs text-slate-400">
            If you were just promoted, check your email for the password setup link.
          </p>
        </form>
      </div>
    </div>
  );
}
