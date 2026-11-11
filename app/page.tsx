"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Bot, Check, ChevronDown, CircleHelp, Compass, Copy, Menu, MessageSquare, Plus, Search, Settings2, Sparkles, SquarePen, Trash2, X, Zap, PanelLeftClose, Send, LoaderCircle } from "lucide-react";

type Agent = { id: string; name: string; description: string; instruction: string; color: string };
type Message = { id: string; role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; agentId: string; updatedAt: number; messages: Message[] };
const STORAGE = "domyx.workspace.v2";
const defaults: Agent[] = [
  { id: "domyx", name: "DOMYX", description: "Your everyday AI partner", instruction: "Be thoughtful, clear, helpful and accurate. Ask concise clarifying questions when needed.", color: "violet" },
  { id: "creator", name: "Creator", description: "Ideas, writing & creative work", instruction: "Act as a creative partner. Offer original ideas, strong drafts and practical next steps.", color: "blue" },
  { id: "analyst", name: "Analyst", description: "Research & structured thinking", instruction: "Think critically, separate facts from assumptions, explain uncertainty and structure your reasoning.", color: "green" },
];
const starters = [
  { icon: Sparkles, title: "Create something", desc: "Turn a rough idea into a clear plan" },
  { icon: Zap, title: "Solve a challenge", desc: "Work through a tricky problem" },
  { icon: SquarePen, title: "Write with clarity", desc: "Draft, refine and polish text" },
  { icon: Compass, title: "Explore an idea", desc: "Discover new angles and possibilities" },
];

function makeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function titleFrom(text: string) { return text.trim().replace(/\s+/g, " ").slice(0, 42) || "New conversation"; }

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>(defaults);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("domyx");
  const [activePage, setActivePage] = useState("Chat");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentMenu, setAgentMenu] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentInstruction, setAgentInstruction] = useState("");
  const [query, setQuery] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);\n  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === activeChatId) ?? null;
  const activeAgent = agents.find(a => a.id === agentId) ?? defaults[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data.agents) && data.agents.length) setAgents(data.agents);
        if (Array.isArray(data.chats)) setChats(data.chats);
      }
    } catch { setNotice("Saved workspace data could not be loaded."); }
    fetch("/api/chat").then(r => r.json()).then(d => setApiReady(Boolean(d.configured))).catch(() => setApiReady(false));
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE, JSON.stringify({ agents, chats }));
  }, [agents, chats, hydrated]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [activeChat?.messages.length, busy]);

  const filteredChats = useMemo(() => chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.updatedAt-a.updatedAt), [chats, query]);

  function newChat(nextAgent = agentId) {
    const chat: Chat = { id: makeId(), title: "New conversation", agentId: nextAgent, updatedAt: Date.now(), messages: [] };
    setChats(old => [chat, ...old]); setActiveChatId(chat.id); setAgentId(nextAgent); setActivePage("Chat"); setDraft(""); setMobileOpen(false);
  }

  async function sendMessage(value = draft) {
    const content = value.trim();
    if (!content || busy) return;
    let chat = activeChat;
    if (!chat) {
      chat = { id: makeId(), title: titleFrom(content), agentId, updatedAt: Date.now(), messages: [] };
      setActiveChatId(chat.id);
    }
    const userMessage: Message = { id: makeId(), role: "user", content };
    const baseMessages = [...chat.messages, userMessage];
    const nextChat = { ...chat, title: chat.messages.length ? chat.title : titleFrom(content), agentId, updatedAt: Date.now(), messages: baseMessages };
    setChats(old => [nextChat, ...old.filter(c => c.id !== nextChat.id)]);
    setDraft(""); setActivePage("Chat"); setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: baseMessages.map(m => ({ role: m.role, content: m.content })), agent: activeAgent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant could not respond.");
      const assistantMessage: Message = { id: makeId(), role: "assistant", content: data.reply };
      setChats(old => old.map(c => c.id === nextChat.id ? { ...c, updatedAt: Date.now(), messages: [...baseMessages, assistantMessage] } : c));
      setApiReady(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      setNotice(msg);
      const assistantMessage: Message = { id: makeId(), role: "assistant", content: "I couldn't reach the AI service just now. Your message is saved in this conversation. Please check the connection or try again." };
      setChats(old => old.map(c => c.id === nextChat.id ? { ...c, messages: [...baseMessages, assistantMessage] } : c));
    } finally { setBusy(false); }
  }

  function createAgent(e: FormEvent) {
    e.preventDefault();
    if (!agentName.trim() || !agentInstruction.trim()) return;
    const item: Agent = { id: makeId(), name: agentName.trim().slice(0, 28), description: agentDescription.trim() || "A custom AI specialist", instruction: agentInstruction.trim(), color: "violet" };
    setAgents(old => [...old, item]); setAgentId(item.id); setShowAgentForm(false); setAgentName(""); setAgentDescription(""); setAgentInstruction(""); setNotice("Your agent has been created and saved in this browser.");
  }

  function removeChat(id: string) {
    setChats(old => old.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  }

  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand-row"><div className="brand-symbol"><Sparkles size={19}/></div><span className="brand-name">DOMYX<span> AI</span></span><button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <button className="new-chat-button" onClick={() => newChat()}><Plus size={17}/> New chat <kbd>⌘ K</kbd></button>
      <div className="sidebar-label">WORKSPACE</div>
      <button className={`nav-link ${activePage === "Chat" ? "active" : ""}`} onClick={() => {setActivePage("Chat");setMobileOpen(false)}}><MessageSquare size={17}/> Chat</button>
      <button className={`nav-link ${activePage === "Explore" ? "active" : ""}`} onClick={() => {setActivePage("Explore");setMobileOpen(false)}}><Compass size={17}/> Explore</button>
      <button className={`nav-link ${activePage === "Agents" ? "active" : ""}`} onClick={() => {setActivePage("Agents");setMobileOpen(false)}}><Bot size={17}/> My agents <span className="nav-number">{agents.length}</span></button>
      <div className="sidebar-label history-label">YOUR HISTORY</div>
      <div className="history-search"><Search size={14}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations"/></div>
      <div className="history-list">{filteredChats.length ? filteredChats.map(c => <div className={`history-entry ${activeChatId === c.id ? "history-active" : ""}`} key={c.id}><button onClick={() => {setActiveChatId(c.id);setAgentId(c.agentId);setActivePage("Chat");setMobileOpen(false)}}><MessageSquare size={13}/><span>{c.title}</span></button><button className="delete-chat" aria-label="Delete conversation" onClick={() => removeChat(c.id)}><Trash2 size={13}/></button></div>) : <p className="empty-history">{query ? "No matching conversations." : "Your conversations will appear here."}</p>}</div>
      <div className="sidebar-bottom"><div className="plan-card"><div className="plan-icon"><Zap size={15}/></div><div><strong>Your creative space</strong><span>Ideas start here.</span></div></div><button className="profile-row" onClick={() => {setActivePage("Settings");setMobileOpen(false)}}><div className="profile-avatar">D</div><div><strong>Personal workspace</strong><span>Settings & preferences</span></div><Settings2 size={16}/></button></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu"/>}
    <section className="main-column">
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19}/></button><span>Workspace</span><i>/</i><strong>{activePage}</strong></div><div className="top-right"><span className={`connection-pill ${apiReady ? "connected" : ""}`}><span/>{apiReady === null ? "Checking connection" : apiReady ? "AI connected" : "AI not configured"}</span><div className="top-avatar">D</div></div></header>
      {activePage === "Chat" && <div className="chat-layout">
        <div className="chat-scroll">
          {activeChat?.messages.length ? <div className="messages-container"><div className="chat-heading"><span className="eyebrow">CONVERSATION</span><h1>{activeChat.title}</h1><p>Chatting with {agents.find(a => a.id === activeChat.agentId)?.name || "DOMYX"}</p></div>{activeChat.messages.map(m => <div className={`message-line ${m.role}`} key={m.id}><div className={m.role === "assistant" ? "assistant-mark" : "user-mark"}>{m.role === "assistant" ? <Sparkles size={15}/> : "D"}</div><div className="message-body"><div className="message-meta">{m.role === "assistant" ? "DOMYX AI" : "YOU"}{m.role === "assistant" && <button onClick={() => {navigator.clipboard?.writeText(m.content);setNotice("Answer copied to clipboard.")}} title="Copy answer"><Copy size={13}/></button>}</div><p>{m.content}</p></div></div>)}{busy && <div className="message-line assistant"><div className="assistant-mark"><Sparkles size={15}/></div><div className="message-body"><div className="message-meta">DOMYX AI</div><p className="thinking"><LoaderCircle size={14}/> Thinking through your message…</p></div></div>}<div ref={bottomRef}/></div> :
          <div className="welcome-panel"><div className="welcome-tag"><span/> YOUR AI WORKSPACE <span/></div><div className="hero-emblem"><div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/><div className="hero-core"><Sparkles size={29}/></div></div><h1>Make room for<br/><em>brilliant ideas.</em></h1><p className="welcome-copy">One thoughtful conversation can change everything.<br/>What would you like to work on today?</p><div className="starter-cards">{starters.map(({icon:Icon,title,desc}) => <button className="starter-card" key={title} onClick={() => {setDraft(title + ": ");}}><span className="starter-icon"><Icon size={18}/></span><span className="starter-text"><strong>{title}</strong><small>{desc}</small></span><ArrowUp size={15} className="starter-arrow"/></button>)}</div></div>}
        </div>
        <div className="composer-area"><div className="composer-box"><textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKey} placeholder="Message DOMYX…" rows={2} disabled={busy}/><div className="composer-footer"><div className="agent-picker-wrap"><button className="agent-picker" onClick={() => setAgentMenu(v => !v)}><span className="agent-status-dot"/>{activeAgent.name}<ChevronDown size={13}/></button>{agentMenu && <div className="agent-dropdown">{agents.map(a => <button key={a.id} onClick={() => {setAgentId(a.id);setAgentMenu(false)}}><span className={`agent-dot ${a.color}`}/><span><b>{a.name}</b><small>{a.description}</small></span>{agentId === a.id && <Check size={14}/>}</button>)}</div>}</div><span className="composer-hint">Enter to send · Shift + Enter for a new line</span><button className="send-button" onClick={() => void sendMessage()} disabled={!draft.trim() || busy} aria-label="Send message">{busy ? <LoaderCircle size={17} className="spin"/> : <ArrowUp size={19}/>}</button></div></div><p className="composer-disclaimer">DOMYX can make mistakes. Verify important information.</p></div>
      </div>}
      {activePage === "Explore" && <div className="content-page"><span className="eyebrow">DISCOVER</span><h1>Explore what’s possible.</h1><p className="page-description">A thoughtful toolkit for learning, creating and getting things done.</p><div className="explore-cards">{starters.map(({icon:Icon,title,desc},i) => <button key={title} className="explore-card" onClick={() => {setActivePage("Chat");setDraft(title + ": ")}}><span className={`explore-icon ex-${i}`}><Icon size={21}/></span><h3>{title}</h3><p>{desc}</p><span className="explore-action">Start exploring <ArrowUp size={14}/></span></button>)}</div></div>}
      {activePage === "Agents" && <div className="content-page"><span className="eyebrow">YOUR AI TEAM</span><h1>Meet your agents.</h1><p className="page-description">Specialists with their own instructions, ready for different kinds of work.</p><div className="agent-cards">{agents.map(a => <div className="agent-card" key={a.id}><div className={`agent-avatar ${a.color}`}>{a.name.slice(0,1).toUpperCase()}</div><h3>{a.name}</h3><p>{a.description}</p><div className="agent-card-actions"><button onClick={() => {setAgentId(a.id);newChat(a.id)}}>Start a chat <ArrowUp size={14}/></button>{!defaults.some(d => d.id === a.id) && <button className="remove-agent" onClick={() => {setAgents(old => old.filter(x => x.id !== a.id));if(agentId === a.id)setAgentId("domyx")}} aria-label={`Delete ${a.name}`}><Trash2 size={14}/></button>}</div></div>)}<button className="agent-card add-agent-card" onClick={() => setShowAgentForm(true)}><span className="add-agent-icon"><Plus size={22}/></span><h3>Create an agent</h3><p>Define a specialist with a name and custom instructions.</p><span className="explore-action">Build your agent <ArrowUp size={14}/></span></button></div></div>}
      {activePage === "Settings" && <div className="content-page"><span className="eyebrow">PREFERENCES</span><h1>Your workspace.</h1><p className="page-description">Your workspace is stored locally in this browser.</p><div className="settings-panel"><div className="setting-line"><div><strong>Workspace</strong><small>Personal workspace</small></div><span>DOMYX AI</span></div><div className="setting-line"><div><strong>AI connection</strong><small>Server-side model configuration</small></div><span className={apiReady ? "setting-good" : "setting-warning"}>{apiReady ? "Connected" : "Needs API key"}</span></div><div className="setting-line"><div><strong>Saved conversations</strong><small>Stored on this device and browser</small></div><span>{chats.length}</span></div><div className="setting-line"><div><strong>Custom agents</strong><small>Your own specialist assistants</small></div><span>{Math.max(0, agents.length - defaults.length)}</span></div><div className="settings-note"><CircleHelp size={16}/><p>To enable live AI replies, add an OPENAI_API_KEY environment variable in your Vercel project settings. Keep the key private and never place it in browser code.</p></div><button className="clear-data" onClick={() => {if(confirm("Delete all local DOMYX chats and custom agents?")){setChats([]);setAgents(defaults);setActiveChatId(null);setAgentId("domyx");localStorage.removeItem(STORAGE);setNotice("Local workspace data cleared.")}}}><Trash2 size={15}/> Clear local workspace data</button></div></div>}
      <footer className="app-footer"><span>✳ DOMYX AI</span><span>Made for curious minds.</span><span>v1.1</span></footer>
    </section>
    {showAgentForm && <div className="modal-backdrop" onMouseDown={e => {if(e.target === e.currentTarget)setShowAgentForm(false)}}><form className="agent-modal" onSubmit={createAgent}><button type="button" className="modal-close" onClick={() => setShowAgentForm(false)}><X size={18}/></button><span className="eyebrow">CUSTOM AGENT</span><h2>Build your specialist.</h2><p>Give your agent a purpose and clear instructions.</p><label>Agent name<input value={agentName} onChange={e => setAgentName(e.target.value)} maxLength={28} placeholder="e.g. Study Coach" required/></label><label>Short description<input value={agentDescription} onChange={e => setAgentDescription(e.target.value)} maxLength={80} placeholder="What should this agent help with?"/></label><label>Instructions<textarea value={agentInstruction} onChange={e => setAgentInstruction(e.target.value)} rows={4} placeholder="You are an expert at… Your job is to…" required/></label><button className="modal-submit" type="submit">Create agent <ArrowUp size={15}/></button></form></div>}
    {notice && <div className="toast"><Check size={15}/>{notice}<button onClick={() => setNotice("")}><X size={14}/></button></div>}
  </main>;
}
