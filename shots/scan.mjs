// 全流程点击扫描：捕获 JS 异常
import fs from 'node:fs';
const PORT = 9333;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const p = list.find(t => t.type === 'page');
const ws = new WebSocket(p.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, m => m.error ? rej(new Error(method + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description) };
  return { v: r.result.value };
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'file:///E:/MyProjects/AIGenerated/BuddhistCounter/web/index.html' });
await sleep(1000);
await evalJs('localStorage.removeItem("jingke.v1"); location.reload(); true');
await sleep(1200);
await evalJs(`window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(e.message)});
  window.addEventListener('unhandledrejection',function(e){window.__errs.push('rej:'+e.reason)});true`);

const steps = [
  ['排序开', `document.getElementById('btnSort').click()`],
  ['上移', `var b=document.querySelector('[data-down]'); if(b) b.click()`],
  ['排序关', `document.getElementById('btnSort').click()`],
  ['进计数', `document.querySelector('.item').click()`],
  ['点3次', `(function(){var z=document.getElementById('tapzone');var r=z.getBoundingClientRect();
     for(var i=0;i<3;i++){var o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerId:i+1,pointerType:'touch',isPrimary:true};
     z.dispatchEvent(new PointerEvent('pointerdown',o));z.dispatchEvent(new PointerEvent('pointerup',o));}return true})()`],
  ['撤销', `document.getElementById('btnUndo').click()`],
  ['步长10', `document.querySelector('[data-step="10"]').click()`],
  ['再加', `document.getElementById('btnUndo').click()`],
  ['目标层', `document.querySelector('[data-act=goal]').click()`],
  ['目标改108', `document.querySelector('[data-n="108"]').click(); document.getElementById('gOk').click()`],
  ['报数层', `document.getElementById('btnReport').click()`],
  ['报数确认', `document.querySelector('[data-n="1080"]').click(); document.getElementById('rOk').click()`],
  ['回向', `document.querySelector('[data-act=merit]').click()`],
  ['已回向', `document.getElementById('mOk').click()`],
  ['设置层', `document.querySelector('[data-act=setting]').click()`],
  ['改单位', `document.querySelector('[data-unit="声"]').click(); document.getElementById('fSave').click()`],
  ['回列表', `document.getElementById('btnBack').click()`],
  ['加功课', `document.getElementById('btnAdd').click()`],
  ['预设名', `document.querySelector('[data-pre]').click(); document.getElementById('fSave').click()`],
  ['统计tab', `document.querySelector('.tab[data-tab=stats]').click()`],
  ['年视图', `document.querySelector('[data-scope=year]').click()`],
  ['总视图', `document.querySelector('[data-scope=all]').click()`],
  ['上一期', `document.getElementById('perPrev').click()`],
  ['下一期', `document.getElementById('perNext').click()`],
  ['清单个', `document.querySelectorAll('#statsItems .chip')[1].click()`],
  ['月视图', `document.querySelector('[data-scope=month]').click()`],
  ['点柱子', `(function(){var b=document.querySelectorAll('.bar');if(b.length>3)b[3].dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`],
  ['修改记录', `document.getElementById('dcEdit').click()`],
  ['保存记录', `document.getElementById('mdOk').click()`],
  ['我的', `document.querySelector('.tab[data-tab=me]').click()`],
  ['震动开关', `document.getElementById('rowVibrate').click();document.getElementById('rowVibrate').click()`],
  ['音效开关', `document.getElementById('rowSound').click();document.getElementById('rowSound').click()`],
  ['夜间开', `document.getElementById('rowTheme').click()`],
  ['夜间关', `document.getElementById('rowTheme').click()`],
  ['导出', `document.getElementById('rowExport').click()`],
  ['复制', `document.getElementById('expCopy').click()`],
  ['关导出', `document.getElementById('sheetBackdrop').click()`],
  ['导入', `document.getElementById('rowImport').click()`],
  ['坏JSON', `document.getElementById('impTxt').value='xx'; document.getElementById('impOk').click()`],
  ['撤销导入', `document.getElementById('impCancel').click()`],
  ['回向记录', `document.getElementById('rowMerit').click()`],
  ['关回向', `document.getElementById('mmClose').click()`],
  ['关于', `document.getElementById('rowAbout').click()`],
  ['关关于', `document.getElementById('abOk').click()`],
];

const issues = [];
for (const [name, code] of steps) {
  const r = await evalJs(code + ';true');
  await sleep(420);
  if (r.err) issues.push(`${name} -> ${r.err}`);
}
const errs = await evalJs('window.__errs');
console.log('JS 运行时错误:', JSON.stringify(errs.v));
console.log('步骤异常:', issues.length ? issues : '无');

// 数据一致性检查
const check = await evalJs(`(function(){
  var S=JSON.parse(localStorage.getItem('jingke.v1'));
  var t=new Date(); var k=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  return {items:S.items.length, unit:S.items[0].unit, goal:S.items[0].goal, today:S.items[0].records[k], total:Object.values(S.items[0].records).reduce((a,b)=>a+b,0), merits:S.merits.length, theme:S.settings.theme};
})()`);
console.log('数据状态:', JSON.stringify(check.v));
ws.close();
