// 用 12 项功课验证列表能否填满一屏，并检查大数字排版
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
await sleep(1600);

// 造 12 项数据，带今日与累计
await evalJs(`(function(){
  var k='jingke.v1';
  var S=JSON.parse(localStorage.getItem(k))||{};
  var today=new Date();
  var tk=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  var names=['心经','大悲咒','往生咒','金刚经','地藏经','药师经','普门品','阿弥陀佛圣号','地藏菩萨圣号','观音菩萨圣号','六字大明咒','磕大头'];
  S.items=names.map(function(n,i){
    var r={}; r[tk]=[3,7,21,1,2,4,5,1080,216,108,108,54][i];
    return {id:'t'+i,name:n,unit:i===7?'声':(i===11?'拜':'遍'),goal:[3,7,21,1,2,4,5,1080,216,108,108,54][i]*3,base:1000+i*137,records:r};
  });
  localStorage.setItem(k,JSON.stringify(S));
  location.reload();
  return true;
})()`);
await sleep(1800);
await shot('F-home-many');

// 进第一条，看大数字
await evalJs(`(function(){var it=document.querySelector('.item'); it&&it.click(); return !!it})()`);
await sleep(600);
await shot('F-count');

// 换成 5 位数场景：阿弥陀佛圣号（第 8 项）
await evalJs(`(function(){var b=document.getElementById('btnBack'); b&&b.click(); return true})()`);
await sleep(400);
await evalJs(`(function(){var its=document.querySelectorAll('.item'); its[7]&&its[7].click(); return its.length})()`);
await sleep(600);
await shot('F-count-big');

console.log('done');
process.exit(0);
