// 生成带演示数据的四联预览图
import fs from 'node:fs';
const PORT = 9333;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'E:/MyProjects/AIGenerated/BuddhistCounter/shots';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const p = list.find(t => t.type === 'page');
const ws = new WebSocket(p.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (m, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, x => x.error ? rej(new Error(m + JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id, method: m, params })); });
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result && r.result.value; };
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
}

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'file:///E:/MyProjects/AIGenerated/BuddhistCounter/web/index.html' });
await sleep(1200);

const seed = `(function(){
  var d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0');
  function k(dd){return y+'-'+m+'-'+String(dd).padStart(2,'0');}
  var S={v:1,settings:{vibrate:true,sound:true,theme:'light'},merits:[],items:[
    {id:'a',name:'心经',unit:'遍',goal:21,base:2200,records:(function(){var r={};r[k(1)]=108;r[k(2)]=216;r[k(3)]=108;r[k(4)]=0;r[k(5)]=324;r[k(6)]=108;r[k(7)]=432;r[k(8)]=216;r[k(9)]=108;r[k(10)]=540;r[k(11)]=108;r[k(12)]=216;return r})()},
    {id:'b',name:'大悲咒',unit:'遍',goal:108,base:960,records:(function(){var r={};r[k(1)]=21;r[k(2)]=49;r[k(3)]=21;r[k(5)]=108;r[k(6)]=21;r[k(8)]=49;r[k(9)]=21;r[k(10)]=108;r[k(11)]=49;r[k(12)]=108;return r})()},
    {id:'c',name:'阿弥陀佛圣号',unit:'声',goal:1080,base:86000,records:(function(){var r={};for(var i=1;i<=12;i++){r[k(i)]=1080;}return r})()},
    {id:'d',name:'磕大头',unit:'拜',goal:108,base:5400,records:(function(){var r={};r[k(1)]=108;r[k(2)]=108;r[k(3)]=54;r[k(5)]=108;r[k(7)]=108;r[k(9)]=108;r[k(11)]=108;r[k(12)]=108;return r})()},
    {id:'e',name:'金刚经',unit:'部',goal:1,base:16,records:(function(){var r={};r[k(2)]=1;r[k(6)]=1;r[k(10)]=1;return r})()}
  ]};
  localStorage.setItem('jingke.v1', JSON.stringify(S));
  location.reload(); return true})()`;

await js(seed);
await sleep(1400);
await shot('p-home');

await js("document.querySelector('.item').click(); true");
await sleep(700); await shot('p-count');
await js("document.getElementById('btnBack').click(); true");
await sleep(600);

await js("document.querySelector('.tab[data-tab=stats]').click(); true");
await sleep(900); await shot('p-stats');

await js("document.querySelector('.tab[data-tab=me]').click(); true");
await sleep(700); await shot('p-me');

const montage = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:26px 24px;background:linear-gradient(160deg,#F3EBDD,#E6DAC6);display:flex;gap:26px;font-family:"Microsoft YaHei",sans-serif}
figure{margin:0;text-align:center}
figcaption{font-size:12.5px;color:#8B7A5F;letter-spacing:3px;margin-bottom:10px}
img{width:390px;height:844px;display:block;border-radius:26px;box-shadow:0 0 0 7px #17130F,0 0 0 8.5px #37302A,0 22px 50px rgba(60,40,15,.35)}
</style></head><body>
<figure><figcaption>功课</figcaption><img src="p-home.png"></figure>
<figure><figcaption>计数</figcaption><img src="p-count.png"></figure>
<figure><figcaption>统计</figcaption><img src="p-stats.png"></figure>
<figure><figcaption>我的</figcaption><img src="p-me.png"></figure>
</body></html>`;
fs.writeFileSync(`${OUT}/montage.html`, montage, 'utf8');
console.log('ok');
ws.close();
