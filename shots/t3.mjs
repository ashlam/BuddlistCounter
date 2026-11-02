// 本轮改动验证（第二轮）：滚动布局 / 长功课名 / 主题配色
import fs from 'node:fs';
import http from 'node:http';

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
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
}
const errors = [];
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + JSON.stringify(m.params).slice(0, 200));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text.slice(0, 200));
});
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_APP });
await sleep(1500);

const NAMES = [
  '大方广佛华严经入不思议解脱境界普贤行愿品', // 20
  '妙法莲华经观世音菩萨普门品',           // 13
  '地藏菩萨本愿经观众生业缘品第三',         // 14
  '药师琉璃光如来本愿功德经',             // 11
  '佛说阿弥陀经', '般若波罗蜜多心经', '往生咒', '大悲咒',
  '阿弥陀佛圣号', '地藏菩萨圣号', '观音菩萨圣号', '六字大明咒'
];

await evalJs(`(function(){
  var k='jingke.v1';
  var S=JSON.parse(localStorage.getItem(k))||{};
  var d=new Date();
  var tk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  var names=${JSON.stringify(NAMES)};
  S.settings=S.settings||{}; S.settings.accent='gold'; S.settings.theme='light';
  S.items=names.map(function(n,i){
    var r={}; r[tk]=[108,21,7,3,1,1080,0,49,216,108,54,12][i];
    return {id:'t'+i,name:n,unit:i>7?'声':'遍',goal:[108,21,7,3,1,1080,0,49,216,108,54,12][i],base:1000+i*137,records:r};
  });
  localStorage.setItem(k,JSON.stringify(S));
  location.reload(); return true;
})()`);
await sleep(1700);
await shot('U1-home-12');

console.log('CHECK', await evalJs(`(function(){
  var l=document.getElementById('homeList');
  var tip=document.getElementById('homeTip'), hd=document.querySelector('#pane-home .hd');
  var its=document.querySelectorAll('.item');
  var n0=its[0].querySelector('.it-name'), r0=its[0].querySelector('.report');
  var out={listClientH:l.clientHeight,listScrollH:l.scrollHeight,scrollable:l.scrollHeight>l.clientHeight+2,
    tipTop:Math.round(tip.getBoundingClientRect().top),
    hdTop:Math.round(hd.getBoundingClientRect().top),
    name0H:Math.round(n0.getBoundingClientRect().height),
    gap0:Math.round(r0.getBoundingClientRect().left-n0.getBoundingClientRect().right),
    repW:Math.round(r0.getBoundingClientRect().width),
    name0ClipWW:n0.scrollWidth+'/'+n0.clientWidth,
    name0Text:n0.textContent.length};
  var maxOverlap=0;
  for(var i=0;i<its.length;i++){
    var a=its[i].querySelector('.it-name').getBoundingClientRect(), b=its[i].querySelector('.report').getBoundingClientRect();
    if(a.right>b.left+0.5) maxOverlap=Math.max(maxOverlap, a.right-b.left);
  }
  out.maxOverlapPx=Math.round(maxOverlap);
  return JSON.stringify(out);
})()`));

// 滚到底
await evalJs(`(function(){var l=document.getElementById('homeList'); l.scrollTop=l.scrollHeight; return l.scrollTop})()`);
await sleep(500);
await shot('U2-home-scrolled');
console.log('AFTER-SCROLL', await evalJs(`(function(){
  var tip=document.getElementById('homeTip').getBoundingClientRect();
  var hd=document.querySelector('#pane-home .hd').getBoundingClientRect();
  var l=document.getElementById('homeList');
  return JSON.stringify({tipTop:Math.round(tip.top),hdTop:Math.round(hd.top),scrollTop:Math.round(l.scrollTop),max:l.scrollHeight-l.clientHeight});
})()`));

// 主题配色
const combos = [['gold', 'light'], ['green', 'light'], ['pink', 'light'], ['gold', 'dark'], ['green', 'dark'], ['pink', 'dark']];
for (const [acc, th] of combos) {
  await evalJs(`(function(){
    var k='jingke.v1', S=JSON.parse(localStorage.getItem(k));
    S.settings.accent='${acc}'; S.settings.theme='${th}';
    localStorage.setItem(k,JSON.stringify(S)); location.reload(); return true;
  })()`);
  await sleep(1300);
  await shot(`V-${acc}-${th}-home`);
  await evalJs(`(function(){document.querySelector('.tab[data-tab="me"]').click();return true})()`);
  await sleep(500);
  await shot(`V-${acc}-${th}-me`);
  await evalJs(`(function(){document.getElementById('rowTheme').click();return true})()`);
  await sleep(650);
  await shot(`V-${acc}-${th}-sheet`);
  console.log('cards', acc, th, await evalJs(`(function(){
    var c=document.querySelectorAll('#themeGrid .th-card'),o=[];
    for(var i=0;i<c.length;i++){var s=getComputedStyle(c[i]);o.push(c[i].dataset.pick+':'+s.backgroundColor+(c[i].classList.contains('on')?'*':''));}
    return o.join(' | ');
  })()`));
  await evalJs(`(function(){document.getElementById('sheetBackdrop').click();return true})()`);
  await sleep(320);
  await evalJs(`(function(){document.querySelector('.tab[data-tab="home"]').click();document.querySelector('.item').click();return true})()`);
  await sleep(750);
  await shot(`V-${acc}-${th}-count`);
  await evalJs(`(function(){document.getElementById('btnBack').click();return true})()`);
  await sleep(400);
}

console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
console.log('done');
process.exit(0);
