import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { login, me } from '../api/authService';
import FormAlert from '../components/FormAlert';
import AccountPage from './AccountPage';

function signInError(error) {
  if (!error) return '';
  if (error.code === 'SESSION_CHECK_FAILED') return error.message;
  switch (error.response?.status) {
    case 401: return 'The membership ID or password is incorrect. Check both and try again.';
    case 403: return 'This account cannot access the workspace. Ask an administrator to check your access.';
    case 429: return 'Too many sign-in attempts. Wait a moment before trying again.';
    default: return error.response
      ? 'The workspace could not sign you in. Try again in a moment.'
      : 'Could not reach the workspace. Check your connection and try again.';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const memberField = useRef(null);
  const passwordField = useRef(null);
  const shake = useRef(null);
  const [membershipId, setMembershipId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const session = useMutation({
    mutationFn: async credentials => {
      await login(credentials);
      await queryClient.cancelQueries();
      queryClient.removeQueries();
      try {
        await queryClient.fetchQuery({ queryKey: ['me'], queryFn: me, retry: false });
      } catch (error) {
        const message = error?.response?.status === 401
          ? 'The workspace could not open your session. Allow cookies for this site and sign in again.'
          : 'The workspace could not verify your session. Try signing in again.';
        throw Object.assign(new Error(message), { code: 'SESSION_CHECK_FAILED' });
      }
    },
    onError: error => {
      if (error.response?.status !== 401) return;
      passwordField.current?.focus();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      shake.current?.cancel();
      shake.current = passwordField.current?.parentElement?.animate?.(
        [0, -7, 6, -4, 3, 0].map(offset => ({ transform: 'translateX(' + offset + 'px)' })),
        { duration: 300, easing: 'ease-out' },
      );
    },
    onSuccess: () => navigate('/', { replace: true }),
  });
  const invalidCredentials = session.error?.response?.status === 401;
  const memberMissing = submitted && !membershipId.trim();
  const passwordMissing = submitted && !password;
  const errorText = signInError(session.error);

  function submit(event) {
    event.preventDefault();
    if (session.isPending) return;
    setSubmitted(true);
    if (!membershipId.trim()) return memberField.current?.focus();
    if (!password) return passwordField.current?.focus();
    session.mutate({ membershipId: membershipId.trim(), password });
  }

  return (
    <AccountPage title="Workspace sign in" description="Use your membership ID to open the IEDC workspace.">
      <form noValidate onSubmit={submit} className="account-form" aria-busy={session.isPending}>
        <div className="account-field">
          <label htmlFor="sign-in-member">Membership ID</label>
          <input ref={memberField} id="sign-in-member" required autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={membershipId} readOnly={session.isPending} placeholder="IEDC-XXXX"
            aria-invalid={memberMissing || invalidCredentials}
            aria-describedby={memberMissing ? 'sign-in-member-error' : invalidCredentials ? 'sign-in-error' : undefined}
            onChange={event => { setMembershipId(event.target.value); session.reset(); }} />
          {memberMissing && <p className="account-field-error" id="sign-in-member-error" role="alert">Enter your membership ID.</p>}
        </div>
        <div className="account-field">
          <label htmlFor="sign-in-password">Password</label>
          <div className="account-password">
            <input ref={passwordField} id="sign-in-password" type={showPassword ? 'text' : 'password'} required
              autoComplete="current-password" value={password} readOnly={session.isPending}
              aria-invalid={passwordMissing || invalidCredentials}
              aria-describedby={passwordMissing ? 'sign-in-password-error' : invalidCredentials ? 'sign-in-error' : undefined}
              onChange={event => { setPassword(event.target.value); session.reset(); }} />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="sign-in-password"
              onClick={() => setShowPassword(visible => !visible)}>
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
          {passwordMissing && <p className="account-field-error" id="sign-in-password-error" role="alert">Enter your password.</p>}
        </div>
        {errorText && <FormAlert id="sign-in-error">{errorText}</FormAlert>}
        <button className="op-primary" disabled={session.isPending}>
          {session.isPending ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : <>Sign in <ArrowRight size={16} /></>}
        </button>
        <p className="account-help">New to the workspace? Check your email for your password setup link.</p>
      </form>
    </AccountPage>
  );
}
