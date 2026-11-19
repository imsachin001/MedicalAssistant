import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';
import Sidebar from '../components/Sidebar';
import './Assistant.css';


const Assistant = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load chat session by ID
  const handleSelectChat = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSessionId(data._id);
      setMessages(data.messages || []);
    } catch (err) {
      setMessages([]);
      setSessionId(null);
    }
    setLoading(false);
  };

  // Start a new chat
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
  };

  // Save current chat session
  const handleSaveChat = async () => {
    if (messages.length === 0) return;
    setLoading(true);
    try {
      // Save with first user message as name
      const name = messages.find(m => m.role === 'user')?.text?.slice(0, 40) || 'Chat';
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: '', history: messages, name, sessionId }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err) {}
    setLoading(false);
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: input, history: [...messages, userMsg], sessionId }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { role: 'assistant', text: data.answer }]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      setMessages((msgs) => [...msgs, { role: 'assistant', text: 'Error contacting assistant.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="assistant__container">
      <Sidebar
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onSaveChat={handleSaveChat}
        currentSessionId={sessionId}
        token={token}
      />
      <main className="assistant__main">
        <div className="assistant__chat-area">
          {messages.length === 0 && (
            <div className="assistant__welcome">
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 700, color: '#7b7be5' }}>
                🩺 Medical AI Assistant
              </h2>
              <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto', color: '#555', fontSize: '1.05rem', background: '#fffbe7', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(123,123,229,0.04)', marginBottom: '2rem' }}>
                <strong>Medical Disclaimer</strong>
                <br />
                This application provides AI-generated educational information based on retrieved medical reference documents. It may contain inaccurate or incomplete information. It is not intended to diagnose, treat, or prevent any disease, and should not replace advice from a qualified healthcare professional. Do not use it for emergencies.
              </div>
              <div style={{ textAlign: 'center', fontSize: '1rem', color: '#666' }}>
                <p>💡 <strong>I can help you with:</strong></p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ background: '#f8f9ff', padding: '1rem', borderRadius: '8px' }}>
                    <strong>🔍 Symptoms</strong><br/>
                    Understanding signs and symptoms
                  </div>
                  <div style={{ background: '#f8f9ff', padding: '1rem', borderRadius: '8px' }}>
                    <strong>💊 Treatments</strong><br/>
                    Treatment options and medications
                  </div>
                  <div style={{ background: '#f8f9ff', padding: '1rem', borderRadius: '8px' }}>
                    <strong>🥗 Nutrition</strong><br/>
                    Dietary advice and recommendations
                  </div>
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`assistant__msg assistant__msg--${msg.role}`}>
              {msg.role === 'assistant' ? (
                (() => {
                  let displayContent = msg.text;
                  let metadata = null;
                  
                  // Handle enhanced response format
                  if (msg.text && typeof msg.text === 'object') {
                    if (msg.text.message) {
                      displayContent = msg.text.message;
                      metadata = {
                        model: msg.text.model_used,
                        type: msg.text.type,
                        priority: msg.text.priority,
                        contextCount: msg.text.context_count
                      };
                    } else {
                      // Legacy structured format
                      const keys = Object.keys(msg.text);
                      return (
                        <div>
                          {keys.map((key) => (
                            Array.isArray(msg.text[key]) && msg.text[key].length > 0 ? (
                              <div key={key} style={{ marginBottom: 12 }}>
                                <strong style={{ textTransform: 'capitalize', color: '#2563eb' }}>
                                  {key.replace(/_/g, ' ')}:
                                </strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, lineHeight: 1.6 }}>
                                  {msg.text[key].map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </div>
                            ) : null
                          ))}
                        </div>
                      );
                    }
                  }
                  
                  return (
                    <div>
                      {/* Priority indicator for emergency responses */}
                      {metadata?.priority === 'critical' && (
                        <div style={{
                          background: '#fee2e2',
                          border: '2px solid #fca5a5',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          marginBottom: '12px',
                          color: '#991b1b',
                          fontWeight: 'bold'
                        }}>
                          🚨 URGENT MEDICAL ATTENTION REQUIRED
                        </div>
                      )}
                      
                      {/* Main response */}
                      <div style={{ 
                        lineHeight: 1.6, 
                        whiteSpace: 'pre-wrap',
                        fontSize: '15px'
                      }}>
                        {typeof displayContent === 'string' ? displayContent : JSON.stringify(displayContent)}
                      </div>
                      
                      {/* Metadata footer */}
                      {metadata && (
                        <div style={{
                          marginTop: '12px',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#64748b',
                          borderLeft: '3px solid #cbd5e1'
                        }}>
                          {metadata.model && (
                            <span>🤖 {metadata.model} • </span>
                          )}
                          {metadata.type && (
                            <span>📝 {metadata.type} • </span>
                          )}
                          {metadata.contextCount > 0 && (
                            <span>📚 {metadata.contextCount} sources</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <span style={{ fontSize: '15px' }}>
                  {typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}
                </span>
              )}
            </div>
          ))}
          {loading && (
            <div className="assistant__msg assistant__msg--assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Analyzing your medical query...
              </div>
            </div>
          )}
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
