// 只看计数页莲花效果：亮/暗两版 + 放大细节
import fs from 'node:fs';
const PORT = process.env.CDP_PORT || 9333;
const OUT = process.env.OUT_DIR || 'shots';
const URL_APP = 'file:///E:/MyProjects/AIGenerated/BuddhistCounter/web/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function targetWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const p = list.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { }
    await sleep(300);
  }
  throw new Error('no chrome target');
}
const ws = new WebSocket(await targetWs());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, m => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result));
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('EVAL: '+expr.slice(0,80)+' => '+JSON.stringify(r.exceptionDetails).slice(0,300));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('shot', name);
}

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: URL_APP });
await sleep(1200);
await evalJs('localStorage.removeItem("jingke.v1"); location.reload(); true');
await sleep(1200);

// 造点数据
await evalJs("(function(){var it=document.querySelector('.item'); if(it) it.click(); return true})()");
await sleep(500);
await evalJs("(function(){var z=document.getElementById('tapzone');var r=z.getBoundingClientRect();var o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerId:1,pointerType:'touch',isPrimary:true};z.dispatchEvent(new PointerEvent('pointerdown',o));z.dispatchEvent(new PointerEvent('pointerup',o));return true})()");
await sleep(500);
await evalJs("(function(){var b=document.getElementById('btnBack'); if(b) b.click(); return true})()");
await sleep(500);
console.log('keys', await evalJs('JSON.stringify(Object.keys(localStorage))'));
await evalJs(`(function(){
  var S=JSON.parse(localStorage.getItem('jingke.v1'));
  if(!S) return false;
  var d=new Date(), m=String(d.getMonth()+1).padStart(2,'0'), y=d.getFullYear();
  var k=(dd)=>y+'-'+m+'-'+String(dd).padStart(2,'0');
  S.items[0].records[k(1)]=108; S.items[0].records[k(2)]=108;
  S.items[0].goal=108; S.items[1].records[k(1)]=21;
  localStorage.setItem('jingke.v1',JSON.stringify(S)); location.reload(); return true;
})()`);
await sleep(1400);

await evalJs("(function(){var it=document.querySelector('.item'); if(it) it.click(); return true})()");
await sleep(700);
await shot('L-count-light');

// 放大莲台局部
const box = await evalJs(`(function(){var s=document.querySelector('.lotus svg').getBoundingClientRect();
  return JSON.stringify({x:s.left,y:s.top,w:s.width,h:s.height});})()`);
const b = JSON.parse(box);
console.log('lotus bbox', b);
const clip = { x: Math.round(b.x - 12), y: Math.round(b.y - 12), width: Math.round(b.w + 24), height: Math.round(b.h + 24), scale: 4 };
const r = await send('Page.captureScreenshot', { format: 'png', clip });
fs.writeFileSync(`${OUT}/L-lotus-zoom.png`, Buffer.from(r.data, 'base64'));

// 暗色
await evalJs("(function(){var b=document.getElementById('btnBack'); if(b) b.click(); return true})()");
await sleep(400);
await evalJs("(function(){var S=JSON.parse(localStorage.getItem('jingke.v1'));S.settings.theme='dark';localStorage.setItem('jingke.v1',JSON.stringify(S));return true})()");
await send('Page.navigate', { url: URL_APP });
await sleep(1600);
await evalJs("(function(){var it=document.querySelector('.item'); if(it) it.click(); return true})()");
await sleep(800);
await shot('L-count-dark');
const box2 = await evalJs(`(function(){var s=document.querySelector('.lotus svg').getBoundingClientRect();
  return JSON.stringify({x:s.left,y:s.top,w:s.width,h:s.height});})()`);
const b2 = JSON.parse(box2);
const clip2 = { x: Math.round(b2.x - 12), y: Math.round(b2.y - 12), width: Math.round(b2.w + 24), height: Math.round(b2.h + 24), scale: 4 };
const r2 = await send('Page.captureScreenshot', { format: 'png', clip: clip2 });
fs.writeFileSync(`${OUT}/L-lotus-zoom-dark.png`, Buffer.from(r2.data, 'base64'));
console.log('done');
process.exit(0);
