'use client';
import { useRef, useState, useEffect } from 'react';
import { scanMarket, practiceBrief } from '../lib/coach';
const API=process.env.NEXT_PUBLIC_COACH_API_URL || '';
export default function CoachPanel({context,onPractice}) {
  const [topic,setTopic]=useState('setup'),[question,setQuestion]=useState(''),[code,setCode]=useState(''),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(null), log=useRef(null), followLatest=useRef(true);
  useEffect(()=>{if(log.current&&followLatest.current)log.current.scrollTop=log.current.scrollHeight;},[messages,busy]);
  useEffect(()=>()=>pending.current?.abort(),[]);
  const scan=scanMarket(context);
  async function ask(event){
    event.preventDefault();if(!API||busy||!question.trim()||!code)return;
    setBusy(true);setError('');const text=question.trim();const controller=new AbortController();pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),50000);
    try{
      const response=await fetch(`${API.replace(/\/$/,'')}/coach`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${code}`},body:JSON.stringify({message:text,context,history:messages.flatMap(m=>[{role:'user',content:m.question},{role:'assistant',content:m.answer}]).slice(-6)}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'The coach could not answer. Try again.');
      if(data.mode!=='ai'||typeof data.answer!=='string'||!Array.isArray(data.evidence))throw new Error('The coach returned an invalid response.');
      setMessages(previous=>[...previous.slice(-9),{...data,question:text}]);setQuestion('');
    }catch(e){setError(e.name==='AbortError'?'The request was cancelled or timed out. You can retry.':e instanceof TypeError?'Cannot reach the AI coach. Check the connection and try again.':e.message);}
    finally{clearTimeout(timer);pending.current=null;setBusy(false);}
  }
  return <section className="agent-workspace" aria-label="Trading coach">
    <div className="agent-tools"><div className="panel-heading"><h2>Evidence desk</h2><span className="status">Synthetic replay</span></div><p className="muted">The same deterministic tools the AI can use. Updated to candle {context.index}; no future candles included.</p>
      <div className="agent-scan"><h3>Setup scanner</h3>{scan.map(row=><div className="scan-row" key={row.symbol}><div><strong>{row.symbol}</strong><small>{row.time} IST · {row.price.toFixed(2)}</small></div><div><strong>{row.checksPassed} / 3 checks</strong><small>{row.qualified?'Rules met':'Wait'}</small></div></div>)}<p className="fine">Checks met are not a win probability. All three stocks are fictional examples.</p></div>
      <h3>Inspect the decision</h3><div className="topic-buttons" aria-label="Practice tool">{[['setup','Explain setup'],['risk','Check my risk'],['journal','Review journal']].map(([key,label])=><button key={key} aria-pressed={topic===key} onClick={()=>setTopic(key)}>{label}</button>)}</div>
      <div className="practice-answer" aria-live="polite"><span>Calculated practice guide · not AI-generated</span><p>{practiceBrief(context,topic)}</p></div><button className="text-button" onClick={onPractice}>Return to the market lab</button>
    </div>
    <div className="agent-chat"><div className="panel-heading"><h2>Ask your trading coach</h2><span className="status">{API?'AI service configured':'AI not connected'}</span></div>
      <p className="agent-intro">Ask why a setup qualifies, how much you could lose, or what a completed trade can teach you.</p>
      {!API&&<div className="agent-offline"><strong>Practice tools are ready. AI chat is not connected yet.</strong><p>Model-generated answers will be available after the secure AI service is activated. You can explore the evidence desk now.</p></div>}
      <div className="chat-history" ref={log} onScroll={()=>{const el=log.current;followLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<60;}} role="log" aria-label="Coach conversation">{!messages.length?<div className="chat-empty"><h3>Good traders ask better questions.</h3><p>“Which rule is still missing?”<br/>“What happens if price gaps below my stop?”<br/>“What can I learn from my last trade?”</p><span>Answers use your current paper session. No live market feed or trade execution.</span></div>:messages.map((m,i)=><article className="chat-exchange" key={i}><p className="user-question">{m.question}</p><div className="ai-answer"><strong>AI coach · {m.asOf?.symbol} · candle {m.asOf?.index}</strong><p>{m.answer}</p><details><summary>Evidence used ({m.evidence.length} tool calls)</summary>{m.evidence.map((e,j)=><div key={j}><h4>{e.tool.replaceAll('_',' ')}</h4><pre>{JSON.stringify(e.result,null,2)}</pre></div>)}</details></div></article>)}</div>
      <form className="coach-form" onSubmit={ask}><label htmlFor="coach-code">Coach access code <span>Kept in memory only. Never enter an OpenAI API key.</span></label><input id="coach-code" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} disabled={!API||busy} maxLength={256}/><label htmlFor="coach-question">Your question</label><textarea id="coach-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2000} rows={3} disabled={!API||busy} placeholder="Help me understand this setup…"/><div className="composer-actions"><span>{question.length} / 2000</span><button className="primary" disabled={!API||busy||!question.trim()||!code}>{busy?'Checking the evidence…':'Ask coach'}</button>{busy&&<button type="button" className="text-button" onClick={()=>pending.current?.abort()}>Cancel</button>}</div><p className="fine">When connected, your question, recent chat, and paper-session snapshot are sent to the AI service and OpenAI. Chat resets when you leave this screen. AI explanations can be wrong; compare them with the evidence.</p></form>
      {error&&<p className="error" role="alert">{error}</p>}
    </div>
  </section>;
}
