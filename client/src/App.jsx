import React, { useEffect, useState } from 'react';
import { API_URL } from './config';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Assistant from './pages/Assistant';
import AuthModal from './pages/AuthModal';

const App = () => {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    fetch(`${API_URL}/api/auth/me`, {
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
    setShowLogoutConfirm(false);
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
        onLogout={() => setShowLogoutConfirm(true)}
      />
      {page === 'home' && <Home onTryNow={openAssistant} />}
      {page === 'assistant' && user && <Assistant token={localStorage.getItem('doctalk_token')} />}
      {authMode && (
        <AuthModal
          onAuthenticated={handleAuthenticated}
          onClose={() => setAuthMode(null)}
        />
      )}
      {showLogoutConfirm && (
        <div className="logout-confirm__backdrop" role="presentation" onMouseDown={() => setShowLogoutConfirm(false)}>
          <section
            className="logout-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <h2 id="logout-confirm-title">Sign out?</h2>
            <p>Are you sure you want to sign out of MediQuery?</p>
            <div className="logout-confirm__actions">
              <button type="button" className="logout-confirm__cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="logout-confirm__confirm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default App;
