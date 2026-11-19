import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { setPassword as setWorkspacePassword } from '../api/authService';
import AccountPage from './AccountPage';
import FormAlert from '../components/FormAlert';

export default function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const userId = params.get('uid');
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = Boolean(confirm && confirm !== password);
  const mutation = useMutation({
    mutationFn: setWorkspacePassword,
    onSuccess: () => {
      toast.success('Password saved. You can now sign in.');
      navigate('/login', { replace: true });
    },
  });

  if (!userId || !token) {
    return <AccountPage title="Setup link incomplete" description="Open the full password setup link in your latest IEDC email.">
      <div className="account-form"><Link to="/login" className="op-secondary">Back to sign in</Link></div>
    </AccountPage>;
  }

  return (
    <AccountPage title="Set your password" description="Choose a password for your IEDC workspace account.">
      <form className="account-form" aria-busy={mutation.isPending} onSubmit={event => {
        event.preventDefault();
        if (password && password === confirm && !mutation.isPending) mutation.mutate({ userId, token, password });
      }}>
        <label>New password
          <input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <label>Confirm password
          <input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
            aria-invalid={mismatch} aria-describedby={mismatch ? 'password-mismatch' : undefined} />
        </label>
        {mismatch && <FormAlert id="password-mismatch" role="status">Enter the same password in both fields.</FormAlert>}
        {mutation.isError && <FormAlert>{mutation.error?.response?.data?.message || 'Could not save your password. Check your connection and reopen the latest setup link.'}</FormAlert>}
        <button className="op-primary" disabled={mutation.isPending || !password || confirm !== password}>
          {mutation.isPending ? <><Loader2 size={16} className="animate-spin" />Saving…</> : <>Set password <ArrowRight size={16} /></>}
        </button>
      </form>
    </AccountPage>
  );
}
