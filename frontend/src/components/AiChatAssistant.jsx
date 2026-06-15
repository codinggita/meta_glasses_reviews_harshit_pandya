import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../utils/api';

const QUICK_PROMPTS = [
  "Summarize the overall reviews verdict",
  "Is the speaker audio quality good?",
  "What are the primary cons of the Wayfarer?",
  "What is the average rating and customer satisfaction?"
];

export default function AiChatAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your MetaLens AI Review Companion. Ask me anything about customer feedback, pros/cons, audio quality, or model differences for the Meta Ray-Ban Smart Glasses."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch AI summary data once on mount so we can use it to answer questions
  useEffect(() => {
    async function getSummary() {
      const res = await apiCall('GET', '/reviews/ai-summary');
      if (res.status === 200 && res.body?.success) {
        setAiSummary(res.body.summary);
      }
    }
    getSummary();
  }, []);

  // Scroll to bottom of message list on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking and responding
    setTimeout(() => {
      let aiText = '';
      const query = textToSend.toLowerCase();

      const verdict = aiSummary?.verdict || "Highly positive reception regarding audio integration, with recurring calls for battery expansion.";
      const pros = aiSummary?.pros || ['Great speaker audio', 'Futuristic AI support', 'Video capture clarity'];
      const cons = aiSummary?.cons || ['Quick battery drain', 'Slightly heavy frame', 'Limited low-light photos'];

      if (query.includes('verdict') || query.includes('summar') || query.includes('overall')) {
        aiText = `Here is the current AI-synthesized verdict of customer experiences: "${verdict}"\n\nTop Pros highlighted: ${pros.join(', ')}.\nPrimary Concerns: ${cons.join(', ')}.`;
      } else if (query.includes('audio') || query.includes('sound') || query.includes('speaker') || query.includes('music')) {
        aiText = `Reviewers are highly enthusiastic about the audio features! The open-ear speakers are praised for "great speaker audio" and "clear vocal clarity". The main criticism regarding sound is that some users experience muted lower bass ranges or slight sound leakage at maximum volume.`;
      } else if (query.includes('battery') || query.includes('charge') || query.includes('drain')) {
        aiText = `Battery performance is the most common concern listed across all reviews. Customers report quick battery drain, especially during active video recording, photo capture, or video streaming. Many reviews suggest carrying the charging case at all times.`;
      } else if (query.includes('wayfarer')) {
        aiText = `The Wayfarer model is highly popular for its classic design. Reviews indicate it excels at video capture clarity and smart touch controls. However, some users note the frame feels slightly heavy during extended wear and it can drain battery quickly when active.`;
      } else if (query.includes('headliner')) {
        aiText = `The Headliner model is appreciated for its lightweight retro styling and comfortable fit. Sound clarity for calls is praised, though some reviews mention that the audio lacks strong bass and the charging case hinge feels somewhat delicate.`;
      } else if (query.includes('camera') || query.includes('video') || query.includes('photo')) {
        aiText = `The camera receives highly positive feedback for outdoor daylight shots and video capture. Users love the hands-free first-person perspective. The primary feedback is that video quality decreases under low-light or indoor conditions.`;
      } else if (query.includes('rating') || query.includes('satisfaction') || query.includes('star')) {
        aiText = `The platform shows a high average rating of approximately 4.2 / 5.0 stars. Over 80% of reviews are classified as positive (4 or 5 stars), indicating high customer satisfaction with the hardware, though software battery management remains a pain point.`;
      } else {
        aiText = `I analyzed the reviews database. Overall, customers love the hands-free camera, the open-ear speaker audio, and the smart assistant features. The main critiques relate to battery life (approx. 3-4 hours of mixed use) and frame weight. Let me know if you would like details on Wayfarer, Headliner, or audio quality specifically!`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText);
    }
  };

  return (
    <div className="chat-companion-layout">
      {/* Main Chat Feed */}
      <div className="chat-companion-main">
        <div className="chat-header">
          <div className="chat-avatar">🤖</div>
          <div className="chat-header-info">
            <span className="chat-header-title">MetaLens AI Assistant</span>
            <span className="chat-header-status">
              <span className="badge-dot" style={{ backgroundColor: 'var(--emerald-primary)' }}></span>
              Online • Synthesizing Reviews
            </span>
          </div>
        </div>

        <div className="chat-messages-wrap">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-msg ${msg.sender === 'user' ? 'chat-msg-sent' : 'chat-msg-received'}`}
            >
              <div className="msg-bubble">
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} style={{ marginBottom: i < msg.text.split('\n').length - 1 ? '8px' : '0' }}>
                    {line}
                  </p>
                ))}
              </div>
              <span className="msg-sender">{msg.sender === 'user' ? 'You' : 'MetaLens AI'}</span>
            </div>
          ))}

          {isTyping && (
            <div className="chat-msg chat-msg-received">
              <div className="msg-bubble" style={{ padding: '8px 16px' }}>
                <div className="pulse-loader" style={{ margin: 0 }}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Ask a question about the reviews..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSendMessage(inputText)}
            disabled={isTyping}
          >
            Send
          </button>
        </div>
      </div>

      {/* Sidebar Prompt Suggestions */}
      <div className="glass-panel chat-sidebar-card">
        <h3 className="panel-title">Quick Query Suggestions</h3>
        <p className="font-muted" style={{ fontSize: '13px', marginBottom: '8px' }}>
          Select a quick prompt to query review trends, model features, or audio quality immediately:
        </p>
        <div className="prompt-suggestions">
          {QUICK_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              className="prompt-chip"
              onClick={() => handleSendMessage(prompt)}
              disabled={isTyping}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
