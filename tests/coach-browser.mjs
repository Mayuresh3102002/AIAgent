import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let calls=0;
 await page.route('https://coach-test.invalid/coach',async route=>{
  const req=route.request(),body=req.postDataJSON();assert.equal(req.headers().authorization,'Bearer test-access-code');assert.equal(body.context.index,28);
  calls++;
  if(calls===1)return route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'Coach request limit reached. Try again in a minute.'})});
  if(calls===3)assert.equal(body.history.length,2);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({mode:'ai',answer:'Mocked integration-test response. The synthetic setup has 3 of 3 checks met.',asOf:{symbol:'RELIANCE',index:28},evidence:[{tool:'inspect_session',result:{dataMode:'synthetic',revealedCandles:28}}]})});
 });
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3100/AIAgent/');
 await page.getByRole('button',{name:'Coach',exact:true}).click();
 await page.getByLabel('Coach access code',{exact:false}).fill('test-access-code');
 await page.getByLabel('Your question',{exact:true}).fill('Explain the current setup');
 await page.getByRole('button',{name:'Ask coach',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'request limit'}).waitFor();
 assert.equal(await page.getByLabel('Your question',{exact:true}).inputValue(),'Explain the current setup');
 await page.getByRole('button',{name:'Ask coach',exact:true}).click();
 await page.getByText('Mocked integration-test response.',{exact:false}).waitFor();
 await page.getByText('Evidence used (1 tool calls)').click();
 await page.locator('pre').filter({hasText:'revealedCandles'}).waitFor();
 await page.getByLabel('Your question',{exact:true}).fill('What should I check next?');
 await page.getByRole('button',{name:'Ask coach',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.chat-exchange').length===2);
 assert.equal(calls,3);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.deepEqual(errors,[]);
 console.log('PASS: configured coach composer, recoverable API error, answer/evidence rendering, bounded conversation history, no browser storage. API responses mocked.');
}finally{await browser.close();}
