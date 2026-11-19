import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Search, PanelsTopLeft } from 'lucide-react';
import { workspacePages } from '../utils/workspacePages';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout, me } from '../api/authService';
import { useViewMode } from '../context/ViewModeContext';
import PageSkeleton from '../components/PageSkeleton';
import { hasWorkspacePermission, normalizePortalRole } from '../utils/authorization';
import './AdminShell.css';

const links = workspacePages.map(({ id, label, path, Icon }) => [path, id === 'dashboard' ? 'Overview' : label, id, Icon]);

function Brand() {
  return <div className="shell-brand"><img src="/iedc-mark.webp" width="34" height="34" alt=""/><div><strong>IEDC</strong><span>LBSCEK</span></div></div>;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { pathname } = useLocation();
  const drawer = useRef(null);
  const searchInput = useRef(null);
  const [pageSearch, setPageSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { mode, clubId, setIedcMode, setClubMode } = useViewMode();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: me, retry: false });
  const clubs = user?.workspaces || [];
  const active = mode === 'club' && clubs.find((club) => club.id === clubId);
  const canUseIedc = Boolean(user?.canUseIedc);
  const needsScope = user && ((mode === 'club' && !active) || (mode === 'iedc' && !canUseIedc));
  const firstClub = clubs[0]?.id;

  useEffect(() => {
    if (!needsScope) return;
    if (canUseIedc) setIedcMode();
    else if (firstClub) setClubMode(firstClub);
  }, [needsScope, canUseIedc, firstClub, setIedcMode, setClubMode]);

  const signout = useMutation({ mutationFn: logout, onSuccess: async () => {
    await client.cancelQueries(); client.clear(); setIedcMode(); navigate('/login', { replace: true });
  }, onError: () => toast.error('Could not sign out. Please try again.') });

  const visible = useMemo(() => links.filter(([, , permission]) => active
    ? (['dashboard', 'events'].includes(permission) || (permission === 'users' && active.access?.managePermissions))
    : (canUseIedc && hasWorkspacePermission(user, permission))), [active, canUseIedc, user]);
  const searchResults = pageSearch.trim() ? visible.filter(([, title]) => title.toLowerCase().includes(pageSearch.trim().toLowerCase())) : visible;

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); searchInput.current?.focus(); setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const requestNavigation = (action) => { const event = new CustomEvent('iedc:navigate', { cancelable: true, detail: action }); if (window.dispatchEvent(event)) action(); };
  const choosePage = (path) => { requestNavigation(() => navigate(path)); setPageSearch(''); setSearchOpen(false); drawer.current?.close(); };
  const sidebar = (mobile = false) => <>
    <div className="shell-rail-head"><Brand/>{mobile && <button className="shell-icon-button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X size={19}/></button>}</div>
    <p className="shell-nav-label">Workspace</p>
    <nav className="shell-nav" aria-label="Workspace navigation">{visible.map((entry) => { const [path, title] = entry; const PageIcon = entry[3]; return <NavLink end={path === '/'} key={path} to={path} onClick={() => drawer.current?.close()}><PageIcon size={17}/><span>{title}</span></NavLink>; })}</nav>
    {active && normalizePortalRole(user?.role) !== 'super_admin' && (active.access?.pageEdit || active.access?.pagePublish) && <nav className="shell-nav"><NavLink to={`/clubs/${active.id}/nexus`}><PanelsTopLeft size={17}/><span>Nexus page</span></NavLink></nav>}
    {normalizePortalRole(user?.role) === 'super_admin' && <nav className="shell-nav"><NavLink to="/nexus"><PanelsTopLeft size={17}/><span>Nexus directory</span></NavLink></nav>}
    <div className="shell-identity-card"><div className="shell-identity-top"><span className="shell-avatar">{(user?.name || user?.membershipId || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{user?.name || user?.membershipId || 'User'}</strong><small>{active?.name || 'IEDC workspace'}</small></div></div><button type="button" onClick={() => signout.mutate()} disabled={signout.isPending}><LogOut size={15}/>{signout.isPending ? 'Signing out…' : 'Sign out'}</button></div>
  </>;

  return <div className="admin-shell">
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    <aside className="shell-rail shell-desktop-rail">{sidebar()}</aside>
    <dialog ref={drawer} className="shell-rail shell-mobile-rail" aria-label="Navigation" onClick={(event) => { if (event.target === drawer.current) drawer.current.close(); }}>{sidebar(true)}</dialog>
    <div className="shell-workspace">
      <header className="shell-topbar">
        <button className="shell-menu-trigger" aria-label="Open navigation" onClick={() => { drawer.current?.showModal(); requestAnimationFrame(() => drawer.current?.querySelector('a')?.focus()); }}><Menu size={20}/></button>
        <div className="shell-page-search"><Search size={16}/><input ref={searchInput} value={pageSearch} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 100)} onChange={(event) => { setPageSearch(event.target.value); setSearchOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') { setSearchOpen(false); event.currentTarget.blur(); } if (event.key === 'Enter' && searchResults[0]) choosePage(searchResults[0][0]); }} placeholder="Find a page…" aria-label="Find a page" aria-expanded={searchOpen}/><kbd>⌘K</kbd>{searchOpen && pageSearch && <div className="shell-search-results" role="listbox">{searchResults.length ? searchResults.map((entry) => { const [path, title] = entry; const PageIcon = entry[3]; return <button key={path} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choosePage(path)}><PageIcon size={15}/><span>{title}</span></button>; }) : <p>No authorized pages found</p>}</div>}</div>
        <div className="shell-top-actions"><label className="shell-scope-picker"><span className="sr-only">Active workspace</span><span className="shell-scope-value" aria-hidden="true">{active?.name || 'IEDC workspace'}</span><select aria-label="Active workspace" value={active?.id || ''} onChange={(event) => { const id=event.target.value; requestNavigation(() => { if (id) setClubMode(id); else setIedcMode(); navigate('/'); }); }}>{canUseIedc && <option value="">IEDC workspace</option>}{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label><span className="shell-top-avatar" title={user?.name || user?.membershipId}>{(user?.name || user?.membershipId || 'U').slice(0, 1).toUpperCase()}</span></div>
      </header>
      <main id="workspace-content" tabIndex="-1" className="shell-content"><div data-scroll-surface className="page-enter" key={pathname + (active?.id || '')}>{!user || (needsScope && (canUseIedc || firstClub)) ? <PageSkeleton/> : needsScope ? <section className="surface feedback"><h1>No workspace assigned</h1><p>Ask your administrator for access.</p></section> : <Suspense fallback={<PageSkeleton/>}><Outlet/></Suspense>}</div></main>
    </div>
  </div>;
}
