import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { tales, levels } from './config.mjs';
const base='http://127.0.0.1:4174';
const preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','runner','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
  const checks=[];
  for(const config of tales) {
    const tale=JSON.parse(readFileSync(`public/tales/${config.id}.json`,'utf8'));
    for(const level of levels) {
      // Include a known/plain hard token, which older Above level mode concealed.
      const indexes=new Set([0,...(tale.id==='hoichi'?[4]:[])]);
      const hardIndex=tale.scenes.findIndex(s=>s.retellings[level].sentences.some(s=>s.tokens.some(t=>t.hk&&['known','plain'].includes(t.k))));
      if(hardIndex>=0) indexes.add(hardIndex);
      for(const index of indexes) {
        const scene=tale.scenes[index],tokens=scene.retellings[level].sentences.flatMap(s=>s.tokens);
        const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
        await context.addInitScript(({level,done})=>{
          localStorage.setItem('aoandon.prefs.v1',JSON.stringify({furigana:'above-level',writing:'horizontal',sound:false}));
          localStorage.setItem('aoandon.night.v1',JSON.stringify({version:1,demo:false,level,out:0,done,ghosts:[]}));
        },{level,done:tale.scenes.slice(0,index).map(s=>`${tale.id}/${s.id}/${level}`)});
        const page=await context.newPage();
        await page.goto(`${base}/#/tale/${tale.id}`);await page.waitForSelector('.story .sentence');
        const ruby=await page.locator('.story ruby').evaluateAll(els=>els.map(el=>({s:[...el.childNodes].filter(n=>n.nodeName!=='RT').map(n=>n.textContent).join(''),r:el.querySelector('rt')?.textContent})));
        const expected=tokens.filter(t=>t.r&&(t.hk||t.k==='story'));
        for(const token of expected) assert.ok(ruby.some(r=>r.s===token.s&&r.r===token.r),`${tale.id}/${scene.id}/${level}: ruby missing for ${token.s}`);
        assert.equal(ruby.length,expected.length,'Above level ruby belongs only to hard kanji or protected story words');
        assert.match(await page.locator('.level-meter').textContent(),/words \d+% · kanji \d+%/);
        if(tale.id==='hoichi'&&index===4){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`docs/screenshots/hard-kanji-hoichi-s05-${level}.png`,fullPage:true});}
        if(tale.id==='mujina'&&index===0&&level==='N1'){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'docs/screenshots/ladder-mujina-s01-N1.png',fullPage:true});}
        checks.push({tale:tale.id,scene:scene.id,level,hardTokens:tokens.filter(t=>t.hk).length,knownOrPlainHardTokens:tokens.filter(t=>t.hk&&['known','plain'].includes(t.k)).length});
        await context.close();
      }
    }
  }
  assert.ok(checks.every(c=>c.knownOrPlainHardTokens===0),'No non-story above-level kanji remain');
  writeFileSync('docs/screenshots/readability-verification.json',JSON.stringify({checks,passed:true},null,2)+'\n');
  console.log(`Browser ruby checks passed for ${checks.length} scenes`);
} finally {await browser?.close();preview.kill();}
