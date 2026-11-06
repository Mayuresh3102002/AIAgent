import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { runAgent, AgentError } from './agent.js';
export function createCoachServer({apiKey,accessToken,allowedOrigin,model='gpt-4.1-mini',agent=runAgent,maxRequests=10}={}) {
  if(!accessToken||accessToken.length<24||!allowedOrigin)throw new Error('Set a COACH_ACCESS_TOKEN of at least 24 characters and an exact ALLOWED_ORIGIN.');
  let windowStart=Date.now(),used=0,active=0;
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
    const origin=req.headers.origin;
    if(origin&&origin!==allowedOrigin)return send(403,{error:'This origin is not allowed.'});
    if(origin){res.setHeader('Access-Control-Allow-Origin',allowedOrigin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');res.writeHead(204);return res.end();}
    if(req.url==='/health'&&req.method==='GET')return send(200,{configured:Boolean(apiKey),dataMode:'synthetic'});
    if(req.url!=='/coach'||req.method!=='POST')return send(404,{error:'Not found.'});
    const expected=Buffer.from(`Bearer ${accessToken}`),received=Buffer.from(req.headers.authorization||'');
    if(expected.length!==received.length||!timingSafeEqual(expected,received))return send(401,{error:'Enter a valid coach access code.'});
    if(!apiKey)return send(503,{error:'The AI provider has not been configured.'});
    if(Date.now()-windowStart>=60000){windowStart=Date.now();used=0;}
    if(used>=maxRequests||active>=2){res.setHeader('Retry-After','60');return send(429,{error:'Coach request limit reached. Try again in a minute.'});}
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Send JSON content.'});
    used++;active++;
    const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),45000);
    try{
      let length=0;const chunks=[];
      for await(const chunk of req){length+=chunk.length;if(length<=32768)chunks.push(chunk);}
      if(length>32768)throw new AgentError('Request is too large.',413);
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AgentError('Invalid JSON request.',400);}
      send(200,await agent(body,{apiKey,model,signal:abort.signal}));
    }catch(error){send(abort.signal.aborted?504:error instanceof AgentError?error.status:502,{error:abort.signal.aborted?'The AI request timed out. Try again.':error instanceof AgentError?error.message:'The AI service is unavailable. Try again later.'});}
    finally{active--;clearTimeout(timeout);}
  });
}
