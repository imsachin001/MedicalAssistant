import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import './Assistant.css';

const Assistant = () => {
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', text: string}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { role: 'assistant', text: data.answer || 'Sorry, I could not answer.' }]);
    } catch (err) {
      setMessages((msgs) => [...msgs, { role: 'assistant', text: 'Error contacting assistant.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="assistant__container">
      <Sidebar />
      <main className="assistant__main">
        <div className="assistant__chat-area">
          {messages.map((msg, i) => (
            <div key={i} className={`assistant__msg assistant__msg--${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {loading && <div className="assistant__msg assistant__msg--assistant">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form className="assistant__searchbar-wrapper" onSubmit={sendMessage}>
          <input
            className="assistant__searchbar"
            type="text"
            placeholder="Ask anything"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </form>
      </main>
    </div>
  );
};

export default Assistant;
