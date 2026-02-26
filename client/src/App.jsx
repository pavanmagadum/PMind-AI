import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles, Zap, Code, Globe, Coffee, Download, Settings, Cpu, ChevronRight, Plus, Mic, LayoutGrid, Music, Image as ImageIcon, Video, Dumbbell, Sun, Moon, Home } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState('creative');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // Load theme preference on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('pavan-theme');
        if (savedTheme === 'dark') setIsDarkMode(true);
    }, []);

    // Persist theme choice
    useEffect(() => {
        localStorage.setItem('pavan-theme', isDarkMode ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const suggestions = [
        { icon: <Code size={16} />, label: "AI Code Auditor", directive: "I want to start a code review or debug session. Please ask me to paste my code and describe the issue I'm facing." },
        { icon: <Globe size={16} />, label: "Dynamic Translator", directive: "I need to translate some text into other languages. Please ask me for the source text and the target languages." },
        { icon: <Coffee size={16} />, label: "Custom Trip Planner", directive: "I want to plan a custom trip. Please ask me for my destination, duration, companions, and budget preferences so we can build a perfect itinerary." },
    ];

    const quickChips = [
        { icon: <ImageIcon size={14} style={{ color: '#eab308' }} />, label: "Create image", prompt: "Generate a creative image description for me." },
        { icon: <Dumbbell size={14} style={{ color: '#60a5fa' }} />, label: "Explore fitness", prompt: "Suggest a 15-minute home workout routine." },
        { icon: <Music size={14} style={{ color: '#f472b6' }} />, label: "Create music", prompt: "Write lyrics for a lo-fi hip hop track about a rainy day." },
        { icon: <Sparkles size={14} style={{ color: '#c084fc' }} />, label: "Boost my day", prompt: "Give me some positive energy and a motivational quote!" },
        { icon: <LayoutGrid size={14} style={{ color: '#4ade80' }} />, label: "Write anything", prompt: "Write a short story about a time-traveling librarian." },
        { icon: <Video size={14} style={{ color: '#f87171' }} />, label: "Create video", prompt: "Write a 30-second script for a futuristic tech commercial." },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (messages.length > 0) scrollToBottom();
    }, [messages]);

    const handleSend = async (customInput = null) => {
        const finalInput = typeof customInput === 'string' ? customInput : input;
        if (!finalInput.trim() || isLoading) return;

        const userMessage = { role: 'user', content: finalInput };
        const currentHistory = [...messages, userMessage];

        setMessages(currentHistory);
        setInput('');
        setIsLoading(true);

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await fetch('http://localhost:10000/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: currentHistory.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        content: msg.content
                    })),
                    temperature: mode === 'creative' ? 0.9 : 0.2
                }),
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;

                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                    return updated;
                });
            }
        } catch (error) {
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: '⚠️ **System Quota Reached**: You have reached the maximum allowed requests for your daily free tier. Please return tomorrow or wait for the reset.' };
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = () => setIsDarkMode(!isDarkMode);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const goHome = () => { if (!isLoading) setMessages([]); };

    return (
        <div className={`app-viewport ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
                <LayoutGrid size={24} />
            </button>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header" onClick={() => { goHome(); setIsSidebarOpen(false); }} style={{ cursor: 'pointer' }}>
                    <img src="/logo.png" alt="PMind Logo" className="sidebar-logo" />
                    <span className="sidebar-brand-text">PMind AI</span>
                </div>

                <div className="sidebar-section">
                    <label>APPEARANCE</label>
                    <button className="theme-toggle-btn" onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>

                <div className="sidebar-section">
                    <label>INTELLIGENCE MODE</label>
                    <div className="mode-switch">
                        <button className={mode === 'creative' ? 'active' : ''} onClick={() => { setMode('creative'); setIsSidebarOpen(false); }}>
                            <Sparkles size={14} /> Creative
                        </button>
                        <button className={mode === 'precise' ? 'active' : ''} onClick={() => { setMode('precise'); setIsSidebarOpen(false); }}>
                            <Cpu size={14} /> Precise
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <label>DYNAMIC AGENTS</label>
                    <div className="suggestions-list">
                        {suggestions.map((s, idx) => (
                            <button key={idx} className="suggestion-btn" onClick={() => { handleSend(s.directive); setIsSidebarOpen(false); }}>
                                <div className="sug-icon">{s.icon}</div>
                                <div className="sug-text">
                                    <span className="sug-label">{s.label}</span>
                                    <span className="sug-sub">Active Agent</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="action-pill danger">
                        <Trash2 size={16} /> New Chat
                    </button>
                </div>
            </aside>

            <main className="chat-surface">
                <header className="glass-header">
                </header>

                <section className={`content-container ${messages.length === 0 ? 'centered' : ''}`}>
                    {messages.length === 0 ? (
                        <div className="zero-state">
                            <div className="greeting fade-in">
                                <div className="greeting-top">
                                    <h3>Hi PAVAN</h3>
                                </div>
                                <h2>Where should we start?</h2>
                            </div>

                            <div className="search-box-container fade-up">
                                <div className="main-search-bar">
                                    <div className="search-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Ask PMind AI"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        />
                                        <div className="search-tools">
                                            <Bot size={20} className="robot-icon" />
                                        </div>
                                    </div>
                                    <div className="search-footer-tools">
                                        <div className="left-tools">
                                            <Plus size={20} className="tool-icon" />
                                            <div className="tool-item">
                                                <LayoutGrid size={18} />
                                                <span>Tools</span>
                                            </div>
                                        </div>
                                        <div className="right-tools">
                                            <div className="model-selector">
                                                <span>Pro</span>
                                                <ChevronRight size={14} className="rotate-90" />
                                            </div>
                                            <Mic size={20} className="tool-icon" />
                                            <button className="send-circle-btn" onClick={() => handleSend()} disabled={!input.trim()}>
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="chips-container">
                                    {quickChips.map((chip, idx) => (
                                        <button key={idx} className="chip" onClick={() => handleSend(chip.prompt)}>
                                            {chip.icon}
                                            <span>{chip.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="messages-flow">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`msg-node ${msg.role}`}>
                                    <div className="msg-avatar">
                                        {msg.role === 'assistant' ? <Bot size={18} /> : <span>P</span>}
                                    </div>
                                    <div className="msg-content">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        {msg.content === '' && isLoading && (
                                            <div className="streaming-indicator">
                                                <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </section>

                {messages.length > 0 && (
                    <footer className="compact-input-dock">
                        <div className="compact-search-bar">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Message PMind AI..."
                                disabled={isLoading}
                            />
                            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="compact-send">
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="pavan-badges">
                            <span className="p-badge">Created By Pavan Magadum</span>
                            <span className="p-badge">Powered by Gemini 1.5 Flash</span>
                        </div>
                    </footer>
                )}
            </main>
        </div>
    );
}

export default App;
