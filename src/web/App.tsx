import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { DEMO_SITE_ID } from './lib/demo';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Sites } from './pages/Sites';

export function navigate(to: string) {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path;
}

export function App() {
  const path = usePath();
  const [auth, setAuth] = useState<boolean | null>(null);
  const isDemo = path === '/demo' || path.startsWith('/demo/');

  useEffect(() => {
    if (isDemo) {
      setAuth(true);
      return;
    }
    setAuth(null);
    api<{ loggedIn: boolean }>('/api/auth/me').then((r) => setAuth(r.loggedIn), () => setAuth(false));
    const out = () => setAuth(false);
    window.addEventListener('pm:logout', out);
    return () => window.removeEventListener('pm:logout', out);
  }, [isDemo]);

  if (isDemo) return <Dashboard siteId={DEMO_SITE_ID} demo />;
  if (auth === null) return null;
  if (!auth) return <Login onLogin={() => setAuth(true)} />;

  const settings = /^\/site\/([\w-]+)\/settings\/?$/.exec(path);
  if (settings) return <Settings siteId={settings[1]} />;
  const site = /^\/site\/([\w-]+)\/?$/.exec(path);
  if (site) return <Dashboard siteId={site[1]} />;
  return <Sites />;
}
