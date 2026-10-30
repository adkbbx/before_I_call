import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4175',checks=[];
mkdirSync('docs/screenshots',{recursive:true});
const preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','runner','--host','127.0.0.1','--port','4175','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    for(const route of ['room','shelf']){
      await page.goto(`${base}/#/${route==='room'?'':route}`);
      await page.waitForSelector('.level-seal');await page.evaluate(()=>document.fonts.ready);
      const radios=page.locator('.level-seal');assert.equal(await radios.count(),5);
      const boxes=await radios.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,scroll:el.scrollWidth};}));
      const rows=[...new Set(boxes.map(b=>Math.round(b.y)))];
      assert.equal(rows.length,width===1440?1:2);
      assert.deepEqual(rows.map(y=>boxes.filter(b=>Math.round(b.y)===y).length),width===1440?[5]:[3,2]);
      for(const [i,b] of boxes.entries()){
        assert.ok(b.x>=0&&b.right<=width&&b.scroll<=b.width+1,`${route}/${width}: seal overflow`);
        for(const c of boxes.slice(i+1))assert.ok(!(b.x<c.right&&b.right>c.x&&b.y<c.bottom&&b.bottom>c.y),'Seal overlap');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await radios.nth(0).focus();await page.keyboard.press('End');assert.equal(await radios.nth(4).getAttribute('aria-checked'),'true');
      await page.keyboard.press('ArrowRight');assert.equal(await radios.nth(0).getAttribute('aria-checked'),'true');
      await page.keyboard.press('ArrowLeft');assert.equal(await radios.nth(4).getAttribute('aria-checked'),'true');
      await page.keyboard.press('Home');assert.equal(await radios.nth(0).getAttribute('aria-checked'),'true');
      await radios.nth(0).blur();
      await page.screenshot({path:`docs/screenshots/five-${route}-${width}.png`,fullPage:true});
      checks.push({route,width,rows:rows.map(y=>boxes.filter(b=>Math.round(b.y)===y).length),overflow:false,arrows:true});
    }
    if(process.argv.includes('--seals')){await context.close();continue;}
    await page.goto(`${base}/#/tale/mujina`);
    const group=page.getByRole('radiogroup',{name:'Reading level',exact:true});
    await group.getByRole('radio',{name:'N1',exact:true}).click();
    await page.waitForSelector('.story .sentence');await page.evaluate(()=>document.fonts.ready);
    assert.equal(await group.getByRole('radio').count(),5);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`docs/screenshots/five-reader-N1-${width}.png`,fullPage:true});
    checks.push({route:'reader',level:'N1',width,overflow:false});
    await context.close();
  }
  writeFileSync(`docs/screenshots/${process.argv.includes('--seals')?'five-seals':'five-level'}-verification.json`,JSON.stringify({passed:true,engine:'Chromium',checks},null,2)+'\n');
  console.log('Five-level browser gate passed');
}finally{await browser?.close();preview.kill();}
