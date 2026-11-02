// 用 CDP 驱动无头 Chrome 做交互回归 + 截图
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

let seq = 0;
const pending = new Map();
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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('shot', name);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url: URL_APP });
await sleep(1200);

// 清掉旧数据后重载，保证每次跑都是干净状态
await evalJs('localStorage.removeItem("jingke.v1"); location.reload(); true');
await sleep(1200);

const TAP = `(function(){const z=document.getElementById('tapzone');const r=z.getBoundingClientRect();
 const o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerId:1,pointerType:'touch',isPrimary:true};
 z.dispatchEvent(new PointerEvent('pointerdown',o));z.dispatchEvent(new PointerEvent('pointerup',o));return true})()`;

// 1. 计数：进入「心经」，点 3 次，再切到 +10 点 1 次
await evalJs("document.querySelector('.item').click(); true");
await sleep(500);
await evalJs(TAP); await sleep(120); await evalJs(TAP); await sleep(120); await evalJs(TAP);
await sleep(300);
await shot('01-count');

// 2. 目标弹层
await evalJs("document.querySelector('[data-act=goal]').click(); true");
await sleep(600); await shot('02-goal-sheet');
await evalJs("document.getElementById('gCancel').click(); true");
await sleep(400);

// 3. 报数弹层
await evalJs("document.getElementById('btnReport').click(); true");
await sleep(600); await shot('03-report-sheet');
await evalJs("document.getElementById('rOk').click(); true");
await sleep(500);

// 4. 回向
await evalJs("document.querySelector('[data-act=merit]').click(); true");
await sleep(600); await shot('04-merit-sheet');
await evalJs("document.getElementById('mCancel').click(); true");
await sleep(400);

// 5. 返回列表
await evalJs("document.getElementById('btnBack').click(); true");
await sleep(600); await shot('05-home-counted');

// 6. 添加功课
await evalJs("document.getElementById('btnAdd').click(); true");
await sleep(600); await shot('06-add-sheet');
await evalJs("document.getElementById('presets').children[0].click(); document.getElementById('fSave').click(); true");
await sleep(600);
await shot('07-home-added');

// 7. 统计（造 5 天数据）
await evalJs(`(function(){
  var S=JSON.parse(localStorage.getItem('jingke.v1'));
  var d=new Date(), m=d.getMonth()+1, y=d.getFullYear();
  function k(dd){return y+'-'+String(m).padStart(2,'0')+'-'+String(dd).padStart(2,'0');}
  S.items[0].records[k(1)]=108; S.items[0].records[k(2)]=216;
  S.items[1].records[k(1)]=7;
  S.items[2].records[k(2)]=1080;
  S.items[3].records[k(2)]=54;
  localStorage.setItem('jingke.v1',JSON.stringify(S));
  location.reload(); return true})()`);
await sleep(1200);
await evalJs("document.querySelector('.tab[data-tab=stats]').click(); true");
await sleep(700); await shot('08-stats-month');

// 8. 年视图
await evalJs("document.querySelector('[data-scope=year]').click(); true");
await sleep(700); await shot('09-stats-year');

// 9. 单功课统计（可编辑）
await evalJs("document.querySelector('.tab[data-tab=stats]').click(); document.querySelector('[data-si]').click(); true");
await sleep(400);
await evalJs("document.querySelectorAll('#statsItems .chip')[1].click(); true");
await sleep(700); await shot('10-stats-item');

// 10. 我的 + 夜间模式
await evalJs("document.querySelector('.tab[data-tab=me]').click(); true");
await sleep(600); await shot('11-me');
await evalJs("document.getElementById('rowTheme').click(); true");
await sleep(700); await shot('12-dark-me');
await evalJs("document.querySelector('.tab[data-tab=home]').click(); true");
await sleep(600); await shot('13-dark-home');
await evalJs("document.getElementById('rowTheme') && 0; document.querySelector('.tab[data-tab=me]').click(); document.getElementById('rowTheme').click(); document.querySelector('.tab[data-tab=stats]').click(); true");
await sleep(800); await shot('14-dark-stats');

console.log('DONE');
ws.close();
