import React from 'react';
import './Navbar.css';

const Navbar = ({ setPage, user, onLogin, onSignup, onLogout }) => (
  <nav className="navbar">
    <div className="navbar__left">
      <button className="navbar__menu" aria-label="Menu">&#9776;</button>
      <span className="navbar__logo">DocTalk</span>
    </div>
    <div className="navbar__links">
      <button className="navbar__link" onClick={() => setPage('home')}>Home</button>
      <button className="navbar__link" onClick={() => setPage('assistant')}>Assistant</button>
    </div>
    <div className="navbar__right">
      {user ? (
        <>
          <span className="navbar__user">{user.name}</span>
          <button className="navbar__btn" onClick={onLogout}>Log Out</button>
        </>
      ) : (
        <>
          <button className="navbar__btn" onClick={onSignup}>Sign Up</button>
          <button className="navbar__btn" onClick={onLogin}>Log In</button>
        </>
      )}
    </div>
  </nav>
);

export default Navbar;
