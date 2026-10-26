import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
import { computeLayout } from '../src/game/layout.ts';

test('production boot, sorting and saved session work under a Yandex-style version directory', async () => {
  const prefix='/558807/test-version/';
  const root=resolve('dist');
  const failures=[];
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith(prefix)) {
      if(path!=='/sdk.js')failures.push(path);
      res.writeHead(404).end();return;
    }
    const file=resolve(root,path.slice(prefix.length)||'index.html');
    if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
    try {
      const body=await readFile(file);
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
      res.end(body);
    } catch {failures.push(path);res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try {
    const page=await browser.newPage({viewport:{width:800,height:700}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{Math.random=()=>0;});
    await page.goto(`http://127.0.0.1:${server.address().port}${prefix}index.html`);
    await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
    const origin=await page.locator('canvas').boundingBox();
    // Wait for the first red shape to enter the belt, find its real pixels.
    const layout=computeLayout(800,700,['red','blue','yellow']);
    const scan=()=>page.evaluate((belt)=>{
      const c=document.querySelector('canvas');const ctx=c.getContext('2d');
      const startX=Math.ceil(belt.x+32),startY=Math.ceil(belt.y);
      const pixels=ctx.getImageData(startX,startY,150,Math.floor(belt.height));
      for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++) {
        const i=(y*pixels.width+x)*4;
        if(pixels.data[i]===232&&pixels.data[i+1]===93&&pixels.data[i+2]===76)return {x:x+startX,y:y+startY};
      }
      return null;
    },layout.belt);
    let shape=null;
    const deadline=Date.now()+5000;
    while(!shape&&Date.now()<deadline){await page.waitForTimeout(80);shape=await scan();}
    assert.ok(shape,'first shape is visible and production loop is running');
    await page.mouse.move(origin.x+shape.x+10,origin.y+shape.y+10);await page.mouse.down();
    await page.mouse.move(origin.x+layout.bins[0].x+layout.bins[0].width/2,origin.y+layout.bins[0].y+layout.bins[0].height/2+34,{steps:4});await page.mouse.up();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sortup-records')||'{}').progression?.totalSorted===1,{},{timeout:5000});
    await page.reload();
    await page.getByRole('button',{name:'Продолжить',exact:true}).waitFor();
    assert.match(await page.getByRole('dialog').innerText(),/1\/30/);
    assert.equal(await page.locator('canvas').count(),1);
    assert.deepEqual(errors,[]);
    assert.deepEqual(failures,[],'no root-relative asset requests or missing version assets');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
});
