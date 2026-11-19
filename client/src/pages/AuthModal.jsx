import React, { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import './AuthModal.css';

const AuthModal = ({ onAuthenticated, onClose }) => {
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
            const apiResponse = await fetch(`${API_URL}/api/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential })
            });
            const data = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(data.error || 'Google sign-in failed');
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
        text: 'signin_with',
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
  }, [googleClientId, onAuthenticated]);

  return (
    <div className="auth-modal__backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="oauth-signin-title" onMouseDown={event => event.stopPropagation()}>
        <button className="auth-modal__close" type="button" onClick={onClose} aria-label="Close">&times;</button>
        <h2 id="oauth-signin-title">Sign in to MediQuery</h2>
        <p className="auth-modal__description">Use your Google account to continue.</p>
        {googleClientId && <div className="auth-modal__google" ref={googleButtonRef} />}
        {googleRedirectEnabled && (
          <button
            type="button"
            className="auth-modal__google-link"
            onClick={() => {
              window.location.href = `${API_URL}/api/auth/google/redirect`;
            }}
          >
            Continue with Google
          </button>
        )}
        {!googleClientId && !googleRedirectEnabled && (
          <div className="auth-modal__error">Google sign-in is not configured.</div>
        )}
        {loading && <div className="auth-modal__status">Signing in...</div>}
        {error && <div className="auth-modal__error">{error}</div>}
      </section>
    </div>
  );
};

export default AuthModal;
