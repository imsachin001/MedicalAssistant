import React from 'react';
import './Navbar.css';

const Navbar = () => (
  <nav className="navbar">
    <div className="navbar__left">
      <button className="navbar__menu" aria-label="Menu">&#9776;</button>
      <span className="navbar__logo">DocTalk</span>
    </div>
    <div className="navbar__links">
      <a href="home" className="navbar__link">Home</a>
      <a href="assistant" className="navbar__link">Assistant</a>
      <a href="track" className="navbar__link">Track</a>
    </div>
    <div className="navbar__right">
      <button className="navbar__btn">Sign Up</button>
      <button className="navbar__btn">Log In</button>
    </div>
  </nav>
);

export default Navbar;
