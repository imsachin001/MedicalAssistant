
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './Sidebar.css';

const Sidebar = ({ onSelectChat, onNewChat, onSaveChat, currentSessionId, token }) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchChats() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/chat/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setChatSessions(data);
      } catch (err) {
        setChatSessions([]);
      }
      setLoading(false);
    }
    fetchChats();
  }, [currentSessionId]);

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <button className="sidebar__btn" onClick={onNewChat}>New chat</button>
        <button className="sidebar__btn" onClick={onSaveChat}>Save chat</button>
      </div>
      <div className="sidebar__chats">
        {loading && <div>Loading...</div>}
        {chatSessions.map((chat) => (
          <div
            className={`sidebar__chat${chat._id === currentSessionId ? ' sidebar__chat--active' : ''}`}
            key={chat._id}
            onClick={() => onSelectChat(chat._id)}
            style={{ cursor: 'pointer' }}
          >
            {chat.name}
          </div>
        ))}
        {chatSessions.length === 0 && !loading && <div>No chats found.</div>}
      </div>
    </aside>
  );
};

export default Sidebar;
