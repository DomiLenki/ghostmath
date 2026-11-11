"use client";
import { useState } from "react";
import { ArrowUp, AudioLines, Bot, BrainCircuit, Check, ChevronDown, Command, Compass, FileText, Image as ImageIcon, LayoutDashboard, Menu, MessageSquare, Plus, Search, Settings2, Sparkles, WandSparkles, X, Zap } from "lucide-react";

const starters = [
  {icon: WandSparkles, title:"Create something", desc:"Turn an idea into something real"},
  {icon: BrainCircuit, title:"Think it through", desc:"Explore a question in depth"},
  {icon: FileText, title:"Write with clarity", desc:"Draft, refine and polish text"},
  {icon: ImageIcon, title:"Imagine visually", desc:"Bring a creative concept to life"}
];
const agents = [{name:"DOMYX",role:"Your everyday AI",color:"violet",initial:"D"},{name:"Creator",role:"Ideas, content & design",color:"blue",initial:"C"},{name:"Analyst",role:"Research & clear thinking",color:"green",initial:"A"}];
const replies = ["Absolutely. Let's break this into clear, manageable steps and build something great. What matters most to you: speed, quality, or exploring a few creative directions first?","Here's a useful way to approach it: start with the outcome, identify the smallest next step, then improve it with feedback. I can help you shape each part.","Great question. I’ll help you think it through clearly, compare the options, and turn the best direction into an actionable plan."];
export default function Home() {
  const [active,setActive] = useState("Chat");
  const [agent,setAgent] = useState("DOMYX");
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState<{role:string,text:string}[]>([]);
  const [mobile,setMobile] = useState(false);
  const [showAgents,setShowAgents] = useState(false);
  const [created,setCreated] = useState(false);
  const send = (value=message) => { if(!value.trim()) return; setMessages(m=>[...m,{role:"user",text:value.trim()},{role:"assistant",text:replies[Math.floor(Math.random()*replies.length)]}]); setMessage(""); setActive("Chat"); };
  return <main className="shell">
    <aside className={`sidebar ${mobile?"mobile-open":""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>DOMYX<span className="brand-ai"> AI</span></span><button className="mobile-close" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <button className="new-chat" onClick={()=>{setMessages([]);setActive("Chat");setMobile(false)}}><Plus size={17}/> New conversation <span>⌘ K</span></button>
      <div className="nav-label">WORKSPACE</div>
      {[["Chat",MessageSquare],["Explore",Compass],["My agents",Bot]].map(([name,Icon]:any)=><button key={name} className={`nav-item ${active===name?"selected":""}`} onClick={()=>{setActive(name);setMobile(false)}}><Icon size={17}/>{name}{name==="My agents"&&<span className="nav-count">3</span>}</button>)}
      <div className="nav-label recent-label">RECENT</div>
      <button className="history-item" onClick={()=>{setActive("Chat");setMessages([{role:"user",text:"Help me plan a creative project"},{role:"assistant",text:"Let's turn your idea into a clear plan."}])}}><span className="history-dot"/> Creative project</button>
      <button className="history-item" onClick={()=>{setActive("Chat");setMessages([{role:"user",text:"Ideas for the weekend"},{role:"assistant",text:"Here are a few directions to explore."}])}}><span className="history-dot"/> Weekend ideas</button>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Zap size={16}/></div><div><strong>Make more with DOMYX</strong><p>Your ideas, without limits.</p></div><ChevronDown size={15}/></div><button className="profile" onClick={()=>setActive("Settings")}><div className="avatar">D</div><div className="profile-copy"><strong>Dominik</strong><span>Personal workspace</span></div><Settings2 size={17}/></button></div>
    </aside>
    {mobile&&<div className="scrim" onClick={()=>setMobile(false)}/>}
    <section className="main-panel">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobile(true)}><Menu size={20}/></button><div className="crumb"><span>Workspace</span><span className="slash">/</span><strong>{active}</strong></div><div className="top-actions"><div className="status"><span/> All systems ready</div><button className="icon-btn" aria-label="Search"><Search size={18}/></button><button className="top-avatar">D</button></div></header>
      {active==="Chat"&&<div className="chat-area">
        {messages.length===0?<div className="welcome">
          <div className="eyebrow"><span className="eyebrow-line"/> YOUR AI WORKSPACE <span className="eyebrow-line"/></div>
          <div className="hero-orb"><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/><div className="orb-core"><Sparkles size={30}/></div><span className="orb-spark spark-a">✳</span><span className="orb-spark spark-b">✧</span></div>
          <h1>Make room for<br/><em>brilliant ideas.</em></h1><p className="hero-sub">A little curiosity can change everything.<br/>What would you like to work on today?</p>
          <div className="starter-grid">{starters.map(({icon:Icon,title,desc})=><button className="starter" key={title} onClick={()=>send(title+". "+desc)}><div className="starter-icon"><Icon size={18}/></div><div><strong>{title}</strong><span>{desc}</span></div><ArrowUp size={15} className="starter-arrow"/></button>)}</div>
        </div>:<div className="conversation"><div className="conversation-label">TODAY · {messages.length/2} EXCHANGE{messages.length>2?"S":""}</div>{messages.map((m,i)=><div className={`message-row ${m.role}`} key={i}>{m.role==="assistant"?<div className="mini-mark"><Sparkles size={15}/></div>:<div className="user-mark">D</div>}<div className="message-content"><div className="message-name">{m.role==="assistant"?"DOMYX AI":"You"}</div><p>{m.text}</p></div></div>)}</div>}
        <div className="composer-wrap"><div className="composer"><textarea value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask DOMYX anything..." rows={2}/><div className="composer-bottom"><div className="composer-tools"><button title="Add attachment"><Plus size={17}/></button><span className="tool-divider"/><button className="model-select" onClick={()=>setShowAgents(!showAgents)}><span className="model-dot"/> {agent} <ChevronDown size={13}/></button>{showAgents&&<div className="agent-menu">{agents.map(a=><button key={a.name} onClick={()=>{setAgent(a.name);setShowAgents(false)}}><span className={`agent-mini ${a.color}`}>{a.initial}</span><span><b>{a.name}</b><small>{a.role}</small></span>{agent===a.name&&<Check size={14}/>}</button>)}</div>}</div><div className="send-tools"><button className="voice-btn" title="Voice mode"><AudioLines size={17}/></button><button className="send-btn" onClick={()=>send()} disabled={!message.trim()}><ArrowUp size={18}/></button></div></div></div><div className="disclaimer">DOMYX AI can make mistakes. Check important information. <span>Built for curious minds.</span></div></div>
      </div>}
      {active==="Explore"&&<div className="page-content"><div className="page-kicker">DISCOVER</div><h2>Explore what’s possible.</h2><p className="page-intro">A toolkit for thinking bigger, creating faster and getting things done.</p><div className="explore-grid">{starters.map(({icon:Icon,title,desc},i)=><button className="explore-card" key={title} onClick={()=>{setActive("Chat");send(title)}}><div className={`explore-icon e${i}`}><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p><span>Try it <ArrowUp size={14}/></span></button>)}</div></div>}
      {active==="My agents"&&<div className="page-content"><div className="page-kicker">YOUR TEAM</div><h2>Meet your agents.</h2><p className="page-intro">Different minds for different missions. Pick an agent and get into your flow.</p><div className="agents-grid">{agents.map(a=><div className="agent-card" key={a.name}><div className={`agent-avatar ${a.color}`}>{a.initial}</div><h3>{a.name}</h3><p>{a.role}</p><button onClick={()=>{setAgent(a.name);setActive("Chat")}}>Start chatting <ArrowUp size={14}/></button></div>)}<button className="agent-card create-agent" onClick={()=>setCreated(true)}><div className="create-plus"><Plus size={22}/></div><h3>Create an agent</h3><p>Build a specialist for your workflow.</p><span>Coming soon</span></button></div>{created&&<div className="notice"><Check size={16}/> Agent creation is on the roadmap. Your custom agent builder is coming soon.</div>}</div>}
      {active==="Settings"&&<div className="page-content"><div className="page-kicker">PREFERENCES</div><h2>Your workspace.</h2><p className="page-intro">A few details about your DOMYX experience.</p><div className="settings-card"><div className="setting-row"><div><strong>Workspace name</strong><span>Your personal space</span></div><b>Dominik’s workspace</b></div><div className="setting-row"><div><strong>Default assistant</strong><span>Agent used for new conversations</span></div><b>DOMYX AI</b></div><div className="setting-row"><div><strong>Appearance</strong><span>Interface theme</span></div><b>Midnight dark</b></div><div className="setting-row"><div><strong>AI connection</strong><span>Live model integration</span></div><span className="demo-pill">Demo mode</span></div></div></div>}
      <footer className="footer"><span>✳ DOMYX AI</span><span>Thoughtfully made for what’s next.</span><span>v1.0.0</span></footer>
    </section>
  </main>;
}
