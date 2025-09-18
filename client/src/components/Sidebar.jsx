import React from 'react';
import './Sidebar.css';

const chats = [
  'React Node.js Medical Chatbot',
  'Code debugging guidance',
  'Connect GitHub repo vscode',
  'MLE debug and fix',
  'Data warehousing introduction',
  'Substitution in predicate logic',
  'DBMS exam topics explained',
  'Code debugging assistance',
  'Code debugging explanation',
];

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar__top">
      <button className="sidebar__btn">New chat</button>
      <button className="sidebar__btn">Search chats</button>
    </div>
    <div className="sidebar__chats">
      {chats.map((chat, i) => (
        <div className="sidebar__chat" key={i}>{chat}</div>
      ))}
    </div>
  </aside>
);

export default Sidebar;
