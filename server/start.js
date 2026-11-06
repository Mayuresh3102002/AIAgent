import { createCoachServer } from './http.js';
const server=createCoachServer({apiKey:process.env.TRADING_OPENAI_API_KEY,accessToken:process.env.COACH_ACCESS_TOKEN,allowedOrigin:process.env.ALLOWED_ORIGIN,model:process.env.COACH_MODEL||'gpt-4.1-mini'});
server.requestTimeout=50000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||8787),'0.0.0.0',()=>console.log('Coach backend started. Credentials and conversations are not logged.'));
