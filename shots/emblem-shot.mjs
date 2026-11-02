// 截取计数页（亮/暗）与首页，检查徽章与列表布局
import fs from 'fs';
import http from 'http';

const OUT = 'E:/MyProjects/AIGenerated/BuddhistCounter/shots';
const URL_APP = 'file:///E:/MyProjects/AIGenerated/BuddhistCounter/web/index.html';

function httpJson(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9333, path }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const list = await httpJson('/json/list');
const target = list.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));

let id = 0; const pend = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
});
function send(method, params = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise(r => pend.set(i, r));
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await sleep(1800);

// 种一些数据
await evalJs(`(function(){
  var S = JSON.parse(localStorage.getItem('jingke.v1') || 'null');
  if (!S) return 'no-store';
  return 'ok';
})()`);

await shot('E-home');

// 进第一个功课
await evalJs(`(function(){var it=document.querySelector('.item'); if(it) it.click(); return !!it})()`);
await sleep(700);
await shot('E-count');

// 点几下看数字
for (let i = 0; i < 3; i++) {
  await evalJs(`(function(){var z=document.getElementById('tapzone');var r=z.getBoundingClientRect();
    var o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height*0.42,pointerId:1,pointerType:'touch',isPrimary:true};
    z.dispatchEvent(new PointerEvent('pointerdown',o));z.dispatchEvent(new PointerEvent('pointerup',o));return true})()`);
  await sleep(200);
}
await sleep(600);
await shot('E-count2');

const box = JSON.parse(await evalJs(`(function(){var s=document.querySelector('.emblem svg').getBoundingClientRect();
  return JSON.stringify({x:s.left,y:s.top,w:s.width,h:s.height})})()`));
const r2 = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 } });
fs.writeFileSync(`${OUT}/E-emblem-zoom.png`, Buffer.from(r2.result.data, 'base64'));

// 暗色
await evalJs(`(function(){var k='jingke.v1';var S=JSON.parse(localStorage.getItem(k));S.settings.theme='dark';localStorage.setItem(k,JSON.stringify(S));return true})()`);
await send('Page.navigate', { url: URL_APP });
await sleep(1500);
await evalJs(`(function(){var it=document.querySelector('.item'); it&&it.click(); return !!it})()`);
await sleep(700);
await shot('E-count-dark');

console.log('box', JSON.stringify(box));
console.log('done');
process.exit(0);
