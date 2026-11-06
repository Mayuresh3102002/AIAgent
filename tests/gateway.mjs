import assert from 'node:assert/strict';
import { createCoachServer } from '../server/http.js';
const token='test-only-access-code-123456789';
let calls=0;
const server=createCoachServer({apiKey:'test-only-key',accessToken:token,allowedOrigin:'https://mayuresh3102002.github.io',maxRequests:2,agent:async()=>{calls++;return {mode:'ai',answer:'Mock provider answer'};}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const post=(headers={},body='{}')=>fetch(url+'/coach',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
try{
 assert.equal((await post()).status,401);
 assert.equal((await post({Authorization:`Bearer ${token}`,Origin:'https://untrusted.example'})).status,403);
 const auth={Authorization:`Bearer ${token}`,Origin:'https://mayuresh3102002.github.io'};
 const preflight=await fetch(url+'/coach',{method:'OPTIONS',headers:{Origin:auth.Origin}});assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('access-control-allow-origin'),auth.Origin);
 assert.equal((await post(auth,'{')).status,400);
 const result=await post(auth);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(calls,1);
 assert.equal((await post(auth)).status,429);assert.equal(calls,1);
 const health=await (await fetch(url+'/health')).json();assert.equal(health.configured,true);
 console.log('PASS: gateway authentication, CORS, preflight, invalid JSON, no-store, rate limiting, and health. Provider mocked; no live AI request.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
