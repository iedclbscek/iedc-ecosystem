import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Loader2 } from 'lucide-react';
import { setPassword as setPasswordApi } from '../api/authService';

export default function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const userId = params.get('uid') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const canSubmit = useMemo(() => {
    return Boolean(userId && token && password && password === confirm);
  }, [userId, token, password, confirm]);

  const mutation = useMutation({
    mutationFn: setPasswordApi,
    onSuccess: () => {
      toast.success('Password set. Please log in.');
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to set password');
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({ userId, token, password });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Set Password</h1>
          <p className="text-sm text-slate-500">Create your admin password to continue.</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {!userId || !token ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              This password setup link is missing required parameters.
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
            {mutation.isPending ? 'Saving...' : 'Set Password'}
          </button>

          <p className="text-xs text-slate-400">After setting your password you’ll be redirected to login.</p>
        </form>
      </div>
    </div>
  );
}
