import React, { useEffect, useRef, useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ mode, onModeChange, onAuthenticated, onClose }) => {
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleRedirectEnabled = Boolean(import.meta.env.VITE_GOOGLE_REDIRECT_ENABLED);

  useEffect(() => {
    if (!googleClientId) return undefined;

    let interval;
    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setError('');
          setLoading(true);
          try {
            const apiResponse = await fetch('http://localhost:5000/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential })
            });
            const data = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(data.error || 'Google login failed');
            onAuthenticated(data);
          } catch (googleError) {
            setError(googleError.message);
          } finally {
            setLoading(false);
          }
        }
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: isSignup ? 'signup_with' : 'signin_with',
        width: 320
      });
    };

    if (window.google?.accounts?.id) initializeGoogle();
    else {
      interval = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          window.clearInterval(interval);
          initializeGoogle();
        }
      }, 200);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [googleClientId, isSignup, onAuthenticated]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal__backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <button className="auth-modal__close" type="button" onClick={onClose} aria-label="Close">&times;</button>
        <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        {googleClientId && (
          <>
            <div className="auth-modal__google" ref={googleButtonRef} />
            <div className="auth-modal__divider"><span>or</span></div>
          </>
        )}
        {googleRedirectEnabled && (
          <>
            <button
              type="button"
              className="auth-modal__google-link"
              onClick={() => {
                window.location.href = 'http://localhost:5000/api/auth/google/redirect';
              }}
            >
              Continue with Google using redirect
            </button>
            <div className="auth-modal__divider"><span>or</span></div>
          </>
        )}
        <form onSubmit={submit}>
          {isSignup && (
            <label>
              Name
              <input
                value={form.name}
                onChange={event => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={event => setForm({ ...form, email: event.target.value })}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={event => setForm({ ...form, password: event.target.value })}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={isSignup ? 8 : undefined}
              required
            />
          </label>
          {error && <div className="auth-modal__error">{error}</div>}
          <button className="auth-modal__submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        <button className="auth-modal__switch" type="button" onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'Already have an account? Log in' : 'New to DocTalk? Create an account'}
        </button>
      </section>
    </div>
  );
};

export default AuthModal;
