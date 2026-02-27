import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Bot, User, Trash2, Sparkles, Zap, Code, Globe, Coffee, Download, Settings, Cpu, ChevronRight, Plus, Mic, LayoutGrid, Music, Image as ImageIcon, Video, Dumbbell, Sun, Moon, Home, LogOut, Check, Clipboard } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import './App.css';

// --- Static Constants (O(1) Access, Prevent Re-renders) ---
const SUGGESTIONS = [
    { icon: <Code size={16} />, label: "Code Architect", directive: "I want to start a professional code review or debug session. Please analyze my code for efficiency and security." },
    { icon: <Sparkles size={16} />, label: "Creative Genius", directive: "I need creative inspiration for a new project. Let's brainstorm some innovative ideas together." },
    { icon: <Globe size={16} />, label: "Global Strategist", directive: "I need help with international market research or cross-cultural communication strategies." },
];

const QUICK_CHIPS = [
    { icon: <ImageIcon size={18} />, label: "Visual Art Design", prompt: "Create a detailed prompt for a high-end cinematic concept art image." },
    { icon: <Zap size={18} />, label: "Logic & Strategy", prompt: "Help me break down a complex problem into a step-by-step strategic plan." },
    { icon: <Music size={18} />, label: "Audio Production", prompt: "Compose a description for a futuristic synthwave track with an energetic vibe." },
];

// --- Memoized UI Components (Prevents unnessary DOM operations) ---
const CodeRenderer = React.memo(({ lang, inline, match, isDarkMode, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        const content = String(children).replace(/\n$/, '');
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [children]);

    if (!inline && match) {
        return (
            <div className="code-block-wrapper">
                <div className="code-header">
                    <span className="code-lang">{lang.toUpperCase()}</span>
                    <button onClick={handleCopy} className="copy-btn">
                        {copied ? <><Check size={14} /> <span>Copied!</span></> : <><Clipboard size={14} /> <span>Copy code</span></> }
                    </button>
                </div>
                <SyntaxHighlighter style={isDarkMode ? atomDark : oneLight} language={lang} PreTag="div" className="syntax-highlighter" {...props}>
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        );
    }
    return <code className={props.className} {...props}>{children}</code>;
});

const MessageNode = React.memo(({ msg, userInitial, CodeBlock, isLoading }) => (
    <div className={`msg-node ${msg.role}`}>
        <div className="msg-avatar">
            {msg.role === 'assistant' ? <Bot size={18} /> : <span>{userInitial}</span>}
        </div>
        <div className="msg-content glass-effect">
            <ReactMarkdown components={{ code: CodeBlock }}>{msg.content}</ReactMarkdown>
            {msg.content === '' && isLoading && (
                <div className="streaming-indicator">
                    <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                </div>
            )}
        </div>
    </div>
));

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState('creative');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [imgError, setImgError] = useState(false);
    const messagesEndRef = useRef(null);

    // Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Theme logic
    useEffect(() => {
        const savedTheme = localStorage.getItem('pavan-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setIsDarkMode(savedTheme === 'dark');
    }, []);

    useEffect(() => {
        localStorage.setItem('pavan-theme', isDarkMode ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const handleLogin = useCallback(async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            alert(`Login Failed: ${error.message}`);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setMessages([]);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (messages.length > 0) scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = useCallback(async (customInput = null) => {
        const finalInput = typeof customInput === 'string' ? customInput : input;
        if (!finalInput || !finalInput.trim() || isLoading) return;

        const userMessage = { role: 'user', content: finalInput };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        try {
            const hPayload = [...messages, userMessage].map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                content: msg.content
            }));

            const response = await fetch('http://localhost:10000/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: hPayload,
                    temperature: mode === 'creative' ? 0.9 : 0.2
                }),
            });

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });

                setMessages((prev) => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1] = { ...next[next.length - 1], content: accumulated };
                    }
                    return next;
                });
            }
        } catch (error) {
            console.error("Streaming Error:", error);
            setMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                    next[next.length - 1] = { ...next[next.length - 1], content: '⚠️ **Reliability Alert**: AI Core connectivity issue. Please retry in a moment.' };
                }
                return next;
            });
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, mode]);

    const toggleTheme = useCallback(() => setIsDarkMode(p => !p), []);
    const toggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const goHome = useCallback(() => { if (!isLoading) setMessages([]); }, [isLoading]);

    const userInitial = useMemo(() => user?.displayName ? user.displayName[0].toUpperCase() : 'U', [user]);

    const CodeBlock = useCallback((props) => {
        const match = /language-(\w+)/.exec(props.className || '');
        const lang = match ? match[1] : '';
        return <CodeRenderer lang={lang} match={match} isDarkMode={isDarkMode} {...props} />;
    }, [isDarkMode]);

    if (authLoading) return (
        <div className={`app-viewport ${isDarkMode ? 'dark-mode' : 'light-mode'}`} style={{justifyContent:'center', alignItems:'center'}}>
            <div className="premium-loader"><div className="glow-circle"></div></div>
        </div>
    );

    if (!user) return (
        <div className={`app-viewport ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="auth-overlay">
                <div className="auth-panel">
                    <img src="/logo.png" className="brand-logo-main" alt="PMind AI" />
                    <h1 className="auth-title">PMind AI</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>The future of intelligent scale.</p>
                    <button className="google-btn-v5" onClick={handleLogin}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="" />
                        Sign in with Google
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`app-viewport ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <nav className="top-nav">
                <div className="theme-switch-icon" onClick={toggleTheme}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </div>
            </nav>

            <button className="mobile-menu-btn" onClick={toggleSidebar}><LayoutGrid size={24} /></button>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header" onClick={() => { goHome(); setIsSidebarOpen(false); }}>
                    <img src="/logo.png" alt="" className="sidebar-logo-img" />
                    <span className="sidebar-brand-text">PMind AI</span>
                </div>

                <div className="sidebar-content">
                    <div className="sidebar-section">
                        <label>INTELLIGENCE</label>
                        <div className="mode-switch">
                            <button className={mode === 'creative' ? 'active' : ''} onClick={() => setMode('creative')}><Sparkles size={14} /> Creative</button>
                            <button className={mode === 'precise' ? 'active' : ''} onClick={() => setMode('precise')}><Cpu size={14} /> Precise</button>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <label>DYNAMIC AGENTS</label>
                        <div className="suggestions-list">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="suggestion-btn" onClick={() => { handleSend(s.directive); setIsSidebarOpen(false); }}>
                                    <div className="sug-icon">{s.icon}</div>
                                    <div className="sug-text"><span className="sug-label">{s.label}</span></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <div className="user-profile-mini">
                        <div className="mini-avatar">
                            {user.photoURL && !imgError ? <img src={user.photoURL} alt="" onError={() => setImgError(true)} /> : <span>{userInitial}</span>}
                        </div>
                        <div className="mini-info"><span className="mini-name">{user.displayName || 'User'}</span></div>
                        <LogOut size={16} className="logout-icon" onClick={handleLogout} />
                    </div>
                    <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="action-pill danger"><Trash2 size={16} /> New Session</button>
                </div>
            </aside>

            <main className="chat-surface">
                <section className={`content-container ${messages.length === 0 ? 'centered' : ''}`}>
                    {messages.length === 0 ? (
                        <div className="zero-state">
                            <img src="/logo.png" className="brand-logo-main" alt="" />
                            <div className="greeting-v5">
                                <h1>{`Hi ${user.displayName ? user.displayName.split(' ')[0].toUpperCase() : 'USER'}`}</h1>
                                <p>Where should we start today?</p>
                            </div>
                            <div className="search-box-container" style={{width: '100%', maxWidth: '750px'}}>
                                <div className="unified-input-wrapper">
                                    <div className="input-row">
                                        <input type="text" placeholder="Ask PMind AI..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                                        <div className="send-btn-minimal" onClick={() => handleSend()}><Send size={22} /></div>
                                    </div>
                                    <div className="input-actions" style={{borderTop:'1px solid var(--card-border)', marginTop:'0.75rem', paddingTop:'0.75rem', display:'flex', alignItems:'center', gap:'15px'}}>
                                        <div className="action-item" style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.8rem', fontWeight:'600', color:'var(--text-secondary)'}}><Plus size={16} /> <span style={{opacity:0.7}}>Tools</span></div>
                                        <div className="action-item" style={{color:'var(--text-secondary)'}}><ImageIcon size={16} /></div>
                                        <div className="action-item" style={{color:'var(--text-secondary)'}}><Mic size={16} /></div>
                                        <div className="model-badge" style={{marginLeft:'auto', background:'rgba(0,217,139,0.1)', color:'var(--accent-mint)', padding:'4px 12px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'800'}}>PRO 3.5</div>
                                    </div>
                                </div>
                                <div className="chips-container">
                                    {QUICK_CHIPS.map((chip, i) => <button key={i} className="pill-chip" onClick={() => handleSend(chip.prompt)}><span>{chip.label}</span></button>)}
                                    <button className="pill-chip" onClick={() => handleSend("Write a professional email about project status.")}><span>Write anything</span></button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="active-chat-flow">
                            {messages.map((msg, i) => <MessageNode key={i} msg={msg} userInitial={userInitial} CodeBlock={CodeBlock} isLoading={isLoading} />)}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </section>

                {messages.length > 0 && (
                    <footer className="bottom-dock">
                        <div className="compact-search-bar">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." disabled={isLoading} />
                            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="compact-send"><Send size={18} /></button>
                        </div>
                        <div className="branding-row"><span>PMind AI Pro v2.5 • Developed by Pavan Magadum</span></div>
                    </footer>
                )}
            </main>
        </div>
    );
}

export default App;
