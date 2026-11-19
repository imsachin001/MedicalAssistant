import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Assistant from './pages/Assistant';
import AuthModal from './pages/AuthModal';

const App = () => {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const googleToken = hash.get('google_token');
    const googleUser = hash.get('google_user');
    if (googleToken && googleUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(googleUser));
        localStorage.setItem('doctalk_token', googleToken);
        setUser(parsedUser);
        setPage('assistant');
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        localStorage.removeItem('doctalk_token');
      }
    }

    const authError = hash.get('auth_error');
    if (authError) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const token = localStorage.getItem('doctalk_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('doctalk_token'))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleAuthenticated = (data) => {
    localStorage.setItem('doctalk_token', data.token);
    setUser(data.user);
    setAuthMode(null);
    setPage('assistant');
  };

  const handleLogout = () => {
    localStorage.removeItem('doctalk_token');
    setUser(null);
    setPage('home');
  };

  const openAssistant = () => {
    if (user) setPage('assistant');
    else setAuthMode('login');
  };

  if (!authChecked) return null;

  return (
    <>
      <Navbar
        setPage={(nextPage) => nextPage === 'assistant' ? openAssistant() : setPage(nextPage)}
        user={user}
        onLogin={() => setAuthMode('login')}
        onSignup={() => setAuthMode('signup')}
        onLogout={handleLogout}
      />
      {page === 'home' && <Home onTryNow={openAssistant} />}
      {page === 'assistant' && user && <Assistant token={localStorage.getItem('doctalk_token')} />}
      {authMode && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onAuthenticated={handleAuthenticated}
          onClose={() => setAuthMode(null)}
        />
      )}
    </>
  );
};

export default App;
