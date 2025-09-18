import React from 'react';
import './Navbar.css';

const Navbar = ({ setPage }) => (
  <nav className="navbar">
    <div className="navbar__left">
      <button className="navbar__menu" aria-label="Menu">&#9776;</button>
      <span className="navbar__logo">DocTalk</span>
    </div>
    <div className="navbar__links">
      <button className="navbar__link" onClick={() => setPage('home')}>Home</button>
      <button className="navbar__link" onClick={() => setPage('assistant')}>Assistant</button>
      <button className="navbar__link" onClick={() => setPage('track')}>Track</button>
    </div>
    <div className="navbar__right">
      <button className="navbar__btn">Sign Up</button>
      <button className="navbar__btn">Log In</button>
    </div>
  </nav>
);

export default Navbar;
