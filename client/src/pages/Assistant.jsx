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
      // Send message and history to backend
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { role: 'assistant', text: data.answer }]);
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
              {msg.role === 'assistant' && msg.text && typeof msg.text === 'object' && (
                (msg.text.overview || msg.text.symptoms || msg.text.causes || msg.text.treatments || msg.text.when_to_see_doctor || msg.text.food || msg.text.exercise) ? (
                  <div>
                    {msg.text.overview && <div style={{ marginBottom: 8 }}><strong>Overview:</strong> <span>{msg.text.overview}</span></div>}
                    {msg.text.symptoms && msg.text.symptoms.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Symptoms:</strong>
                        <ul>{msg.text.symptoms.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.causes && msg.text.causes.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Causes:</strong>
                        <ul>{msg.text.causes.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.treatments && msg.text.treatments.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Treatment options:</strong>
                        <ul>{msg.text.treatments.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.when_to_see_doctor && msg.text.when_to_see_doctor.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>When to see a doctor:</strong>
                        <ul>{msg.text.when_to_see_doctor.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.food && msg.text.food.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Food suggestions:</strong>
                        <ul>{msg.text.food.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.exercise && msg.text.exercise.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Exercise suggestions:</strong>
                        <ul>{msg.text.exercise.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                      </div>
                    )}
                    {msg.text.raw && (
                      <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
                        <strong>Raw output:</strong> <pre>{msg.text.raw}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</span>
                )
              )}
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
          <button
            className="assistant__send-btn"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            ➤
          </button>
        </form>
      </main>
    </div>
  );
};

export default Assistant;
