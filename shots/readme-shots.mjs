// 为 README 生成一组最新截图（5 屏合成）
import fs from 'node:fs';
import http from 'node:http';

const OUT = 'E:/MyProjects/AIGenerated/BuddhistCounter/shots';
const URL_APP = 'file:///E:/MyProjects/AIGenerated/BuddhistCounter/web/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const list = await new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: 9333, path: '/json/list' }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});
const t = list.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const p = new Map(); const errs = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errs.push(JSON.stringify(m.params).slice(0, 200));
});
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise(r => p.set(i, r)); };
const ev = async x => {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
};
const shot = async n => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', n);
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP }); await sleep(1600);

// 造一份接近真实的数据
await ev(`(function(){
  var S = JSON.parse(localStorage.getItem('jingke.v1'));
  var d = new Date(), y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0');
  var names = ['大方广佛华严经入不思议解脱境界普贤行愿品','妙法莲华经观世音菩萨普门品','地藏菩萨本愿经观众生业缘品第三','药师琉璃光如来本愿功德经','佛说阿弥陀经','般若波罗蜜多心经','大悲咒','往生咒','六字大明咒','阿弥陀佛圣号','观音菩萨圣号','磕大头'];
  S.items = names.map(function(n,i){ return {id:'i'+i, name:n, goal:[21,1,1,3,1,21,108,108,1080,5000,5000,108][i]||0, records:{}}; });
  S.settings.accent='gold'; S.settings.theme='light';
  for (var i=1;i<=Math.min(d.getDate(),20);i++){
    var k = y+'-'+m+'-'+String(i).padStart(2,'0'), v=[3,7,21,1,2,4,5,9,12,6][i%10];
    S.items[0].records[k]=v; S.items[1].records[k]=1; S.items[5].records[k]=v*4;
  }
  localStorage.setItem('jingke.v1', JSON.stringify(S)); location.reload(); return 1;
})()`);
await sleep(1600);

await shot('R1-home');
await ev(`(function(){document.querySelector('.item').click();return 1})()`); await sleep(900);
await shot('R2-count');
await ev(`(function(){history.length; window.__appBack?window.__appBack():null; return 1})()`); await sleep(700);
await ev(`(function(){document.querySelector('.tab[data-tab="me"]').click();return 1})()`); await sleep(700);
await shot('R3-me');
await ev(`(function(){document.getElementById('rowTheme').click();return 1})()`); await sleep(700);
await shot('R4-theme');
await ev(`(function(){document.getElementById('sheetBackdrop').click();return 1})()`); await sleep(400);
await ev(`(function(){var S=JSON.parse(localStorage.getItem('jingke.v1'));S.settings.accent='green';S.settings.theme='dark';localStorage.setItem('jingke.v1',JSON.stringify(S));location.reload();return 1})()`);
await sleep(1500);
await ev(`(function(){document.querySelector('.item').click();return 1})()`); await sleep(900);
await shot('R5-green-dark');

console.log('ERR', errs.length ? errs : 'none');
process.exit(0);
