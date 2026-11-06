import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAccount, openTrade, closeTrade } from '../lib/engine.js';
import { validateContext, scanMarket, riskPlan, reviewJournal, practiceBrief, runCoachTool } from '../lib/coach.js';
import { runAgent } from '../server/agent.js';
const context=()=>({symbol:'RELIANCE',index:28,riskPercent:.5,account:emptyAccount()});
const response=output=>new Response(JSON.stringify({status:'completed',output}),{status:200});
const call=name=>({type:'function_call',name,arguments:'{}',call_id:name});
const answer={type:'message',content:[{type:'output_text',text:'This is synthetic practice. Inspect the stop before entering.'}]};
test('scanner, risk tool and practice brief use the revealed snapshot',()=>{
 const c=validateContext(context()),scan=scanMarket(c);
 assert.equal(scan.length,3);assert.equal(scan[0].time,'11:30');assert.equal(scan[0].price,1435.33);
 assert.equal(riskPlan(c).quantity,39);assert.equal(riskPlan(c).plannedLoss,492.22);
 assert.match(practiceBrief(c,'setup'),/3 of 3/);assert.match(practiceBrief(c,'journal'),/no completed trades/);
 assert.throws(()=>runCoachTool('place_order',c),/Unsupported/);
 for(const index of [20,73,28.5])assert.throws(()=>validateContext({...c,index}));
});
test('journal recomputes net P&L rather than trusting a supplied total',()=>{
 const c=context();let a=openTrade(c.account,'RELIANCE',{qualified:true,entry:1000,stop:990,target:1020},.5,25);
 c.account=closeTrade(a,1020,'Manual',26);c.account.trades[0].pnl=999999;
 assert.equal(reviewJournal(validateContext(c)).netPnl,737.18);
});
test('agent forces inspection, executes read-only tools and returns evidence',async()=>{
 const requests=[];const outputs=[[call('inspect_session')],[call('calculate_risk')],[answer]];
 const result=await runAgent({message:'Explain my risk',context:context()},{apiKey:'test-only',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');requests.push(JSON.parse(options.body));return response(outputs.shift());}});
 assert.equal(requests[0].tool_choice.name,'inspect_session');assert.equal(requests[0].store,false);
 assert.equal(result.mode,'ai');assert.equal(result.dataMode,'synthetic');assert.equal(result.evidence.length,2);
 assert.equal(result.evidence[1].result.quantity,39);assert.equal(result.asOf.index,28);
 assert.ok(requests[2].input.some(i=>i.type==='function_call_output'&&i.output.includes('492.22')));
});
test('agent denies unknown tools and bounds repeated tool calls',async()=>{
 await assert.rejects(()=>runAgent({message:'Trade for me',context:context()},{apiKey:'test-only',fetchImpl:async()=>response([call('place_order')])}),/inspect the session|unsupported/);
 let count=0;await assert.rejects(()=>runAgent({message:'Explain',context:context()},{apiKey:'test-only',fetchImpl:async()=>{count++;return response([call('inspect_session')]);}}),/tool limit/);assert.equal(count,4);
});
test('agent handles missing credentials, malformed requests, rate limits and provider errors safely',async()=>{
 await assert.rejects(()=>runAgent({message:'Hi',context:context()}),e=>e.status===503);
 await assert.rejects(()=>runAgent({message:'',context:context()},{apiKey:'test-only'}),e=>e.status===400);
 await assert.rejects(()=>runAgent({message:'Hi',context:context(),history:[{role:'system',content:'bad'}]},{apiKey:'test-only'}),e=>e.status===400);
 await assert.rejects(()=>runAgent({message:'Hi',context:context()},{apiKey:'test-only',fetchImpl:async()=>new Response('sensitive provider error',{status:429})}),e=>e.status===429&&!e.message.includes('sensitive'));
 await assert.rejects(()=>runAgent({message:'Hi',context:context()},{apiKey:'test-only',fetchImpl:async()=>response([])}),/inspect the session/);
});

test('open-position risk reports the existing trade rather than a new cash-based entry',()=>{
 const c=context();c.account=openTrade(c.account,'RELIANCE',{qualified:true,entry:1000,stop:990,target:1020},.5,25);
 const plan=riskPlan(c);assert.equal(plan.mode,'open_position');assert.equal(plan.quantity,41);assert.equal(plan.entry,1000);assert.equal(plan.plannedLoss,491.59);
 assert.match(practiceBrief(c,'risk'),/existing position/);
});
