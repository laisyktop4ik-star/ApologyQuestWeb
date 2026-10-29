import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base='http://127.0.0.1:5173';
const evidence='/tmp/apologyquest-evidence';
await mkdir(evidence,{recursive:true});
const browser=await puppeteer.launch({
  executablePath:'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,900'],
});
const page=await browser.newPage();
await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
const errors=[];
const failedResources=[];
page.on('pageerror',(error)=>errors.push(`pageerror: ${error.message}`));
page.on('response',(response)=>{if(response.status()>=400)failedResources.push(`${response.status()} ${response.url()}`)});
page.on('console',(msg)=>{if(msg.type()==='error'&&!msg.text().includes('Failed to load resource'))errors.push(`console: ${msg.text()}`)});
await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForSelector('#start-screen.visible',{timeout:60000});
await page.screenshot({path:`${evidence}/01-start.png`});
await page.click('#settings-toggle');
await page.click('#sound');
await page.click('#settings-toggle');
await page.click('#start-button');
await new Promise(r=>setTimeout(r,1200));

const initial=await page.evaluate(()=>{
  const g=window.__WHISPERING_PINES__;
  return {running:g.running,trees:g.world.trunks.count,crowns:g.world.crowns.count,colliders:g.world.colliders.length,stage:g.quest.stage,calls:g.renderer.renderer.info.render.calls,photoComplete:document.querySelector('#final-photo').complete,audioEnabled:g.audio.enabled,masterGain:g.audio.master.gain.value};
});
assert.equal(initial.running,true);
assert.equal(initial.trees,320);
assert.equal(initial.crowns,960);
assert.ok(initial.colliders>250);
assert.ok(initial.calls>0);
assert.equal(initial.photoComplete,true);
assert.equal(initial.audioEnabled,false);
assert.equal(initial.masterGain,0);
await page.evaluate(()=>document.querySelector('#sound').click());
await new Promise(r=>setTimeout(r,150));
assert.ok(await page.evaluate(()=>window.__WHISPERING_PINES__.audio.master.gain.value)>.2);

const before=await page.evaluate(()=>window.__WHISPERING_PINES__.player.group.position.z);
await page.keyboard.down('KeyW');await new Promise(r=>setTimeout(r,700));await page.keyboard.up('KeyW');
const after=await page.evaluate(()=>window.__WHISPERING_PINES__.player.group.position.z);
assert.ok(after<before-.4,`player did not move forward: ${before} -> ${after}`);
await page.screenshot({path:`${evidence}/02-forest.png`});

await page.evaluate(()=>{const g=window.__WHISPERING_PINES__,item=g.world.interactables.find(i=>i.userData.kind==='sign');g.player.teleport(item.position)});
await new Promise(r=>setTimeout(r,100));await page.keyboard.press('KeyE');await new Promise(r=>setTimeout(r,100));
assert.equal(await page.evaluate(()=>window.__WHISPERING_PINES__.quest.stage),'memories');
for(const id of ['photo','letter','gift']){
  await page.evaluate((memoryId)=>{const g=window.__WHISPERING_PINES__,item=g.world.interactables.find(i=>i.userData.id===memoryId);g.player.teleport(item.position)},id);
  await new Promise(r=>setTimeout(r,100));await page.keyboard.press('KeyE');await new Promise(r=>setTimeout(r,100));
}
assert.equal(await page.evaluate(()=>window.__WHISPERING_PINES__.quest.stage),'find-path');
await page.evaluate(()=>{const g=window.__WHISPERING_PINES__;g.player.teleport(g.world.bearZone)});
await new Promise(r=>setTimeout(r,250));
const chase=await page.evaluate(()=>({stage:window.__WHISPERING_PINES__.quest.stage,bear:window.__WHISPERING_PINES__.bear.group.visible}));
assert.deepEqual(chase,{stage:'escape-bear',bear:true});
await page.screenshot({path:`${evidence}/03-chase.png`});
await page.evaluate(()=>{const g=window.__WHISPERING_PINES__;g.bear.group.position.copy(g.player.group.position);g.bear.fsm.forceChase()});
await new Promise(r=>setTimeout(r,180));
assert.equal(await page.evaluate(()=>window.__WHISPERING_PINES__.recovering),true);
await page.evaluate(()=>{const g=window.__WHISPERING_PINES__;g.player.teleport(g.world.safeZone)});
await new Promise(r=>setTimeout(r,1050));
const checkpointRecovery=await page.evaluate(()=>({stage:window.__WHISPERING_PINES__.quest.stage,recovering:window.__WHISPERING_PINES__.recovering}));
assert.deepEqual(checkpointRecovery,{stage:'escape-bear',recovering:false});
await page.evaluate(()=>{const g=window.__WHISPERING_PINES__;g.player.teleport(g.world.safeZone)});
await new Promise(r=>setTimeout(r,250));
assert.equal(await page.evaluate(()=>window.__WHISPERING_PINES__.quest.stage),'final-clearing');
await page.evaluate(()=>{const g=window.__WHISPERING_PINES__,item=g.world.finalFrame;g.player.teleport({x:item.position.x,y:item.position.y,z:item.position.z+1})});
await new Promise(r=>setTimeout(r,150));await page.keyboard.press('KeyE');await new Promise(r=>setTimeout(r,300));
assert.equal(await page.$eval('#letter-modal',el=>el.classList.contains('visible')),true);
await page.screenshot({path:`${evidence}/04-letter.png`});

const mobile=await browser.newPage();
await mobile.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
mobile.on('pageerror',(error)=>errors.push(`mobile pageerror: ${error.message}`));
mobile.on('response',(response)=>{if(response.status()>=400)failedResources.push(`${response.status()} ${response.url()}`)});
mobile.on('console',(msg)=>{if(msg.type()==='error'&&!msg.text().includes('Failed to load resource'))errors.push(`mobile console: ${msg.text()}`)});
await mobile.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
await mobile.waitForSelector('#start-screen.visible',{timeout:60000});
await mobile.click('#start-button');
await new Promise(r=>setTimeout(r,700));
const mobileInitial=await mobile.evaluate(()=>{const g=window.__WHISPERING_PINES__,controls=document.querySelector('#mobile-controls');return {mobile:g.isMobile,controlsVisible:!controls.classList.contains('hidden'),quality:g.renderer.quality,widthFits:document.documentElement.scrollWidth<=innerWidth,heightFits:document.documentElement.scrollHeight<=innerHeight,z:g.player.group.position.z}});
assert.deepEqual({...mobileInitial,z:undefined},{mobile:true,controlsVisible:true,quality:'medium',widthFits:true,heightFits:true,z:undefined});
const stick=await mobile.$eval('.joystick-base',el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
await mobile.mouse.move(stick.x,stick.y);await mobile.mouse.down();await mobile.mouse.move(stick.x,stick.y-48,{steps:4});await new Promise(r=>setTimeout(r,700));await mobile.mouse.up();
const mobileAfter=await mobile.evaluate(()=>window.__WHISPERING_PINES__.player.group.position.z);
assert.ok(mobileAfter<mobileInitial.z-.35,`mobile joystick did not move player: ${mobileInitial.z} -> ${mobileAfter}`);
const yawBefore=await mobile.evaluate(()=>window.__WHISPERING_PINES__.followCamera.yaw);
await mobile.touchscreen.touchStart(310,420);await mobile.touchscreen.touchMove(235,420);await mobile.touchscreen.touchEnd();await new Promise(r=>setTimeout(r,100));
const yawAfter=await mobile.evaluate(()=>window.__WHISPERING_PINES__.followCamera.yaw);
assert.notEqual(yawAfter,yawBefore,'mobile look swipe did not rotate camera');
await mobile.evaluate(()=>{const g=window.__WHISPERING_PINES__,sign=g.world.interactables.find(i=>i.userData.kind==='sign');g.player.teleport(sign.position)});
await new Promise(r=>setTimeout(r,150));
const action=await mobile.$eval('#action-button',el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
await mobile.touchscreen.tap(action.x,action.y);await new Promise(r=>setTimeout(r,150));
assert.equal(await mobile.evaluate(()=>window.__WHISPERING_PINES__.quest.stage),'memories','mobile E button did not interact');
await mobile.screenshot({path:`${evidence}/05-mobile.png`});

assert.deepEqual(errors,[],`browser errors:\n${errors.join('\n')}`);
assert.deepEqual(failedResources,[],`failed resources:\n${failedResources.join('\n')}`);
console.log(JSON.stringify({initial,movement:{before,after},chase,checkpointRecovery,mobile:{...mobileInitial,mobileAfter,yawBefore,yawAfter},errors,failedResources,evidence},null,2));
await browser.close();
