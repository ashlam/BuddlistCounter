(function () {
  'use strict';

  var KEY = 'jingke.v1';
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var UNITS = ['遍', '次', '声', '拜', '部'];

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var keyOf = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var todayKey = function () { return keyOf(new Date()); };

  var SEED = [
    { id: 's1', name: '心经', unit: '遍', goal: 3, base: 0, records: {} },
    { id: 's2', name: '大悲咒', unit: '遍', goal: 7, base: 0, records: {} },
    { id: 's3', name: '阿弥陀佛圣号', unit: '声', goal: 1080, base: 0, records: {} },
    { id: 's4', name: '磕大头', unit: '拜', goal: 108, base: 0, records: {} }
  ];

  var PRESETS = ['心经', '大悲咒', '往生咒', '金刚经', '地藏经', '药师经', '普门品', '阿弥陀佛圣号', '地藏菩萨圣号', '观音菩萨圣号', '六字大明咒', '磕大头'];

  var S = load();
  var ui = {
    tab: 'home', itemId: null, step: 1, scope: 'month', statsItem: 'all',
    period: startOfMonth(new Date()), selBar: null, sorting: false
  };

  function uid() { return 'i' + Math.random().toString(36).slice(2, 9); }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  function normalize(o) {
    o.settings = Object.assign({ vibrate: true, sound: true, theme: 'light' }, o.settings || {});
    o.merits = o.merits || [];
    o.items = (o.items || []).map(function (it) {
      return {
        id: it.id || uid(), name: it.name || '未命名', unit: it.unit || '遍',
        goal: Number(it.goal) || 0, base: Number(it.base) || 0, records: it.records || {}
      };
    });
    return o;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.items) return normalize(o); }
    } catch (e) { }
    return normalize({ v: 1, items: JSON.parse(JSON.stringify(SEED)), settings: {}, merits: [] });
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

  function item(id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; }
  function sumRec(it) { var s = 0; for (var k in it.records) s += Number(it.records[k]) || 0; return s; }
  function totalOf(it) { return (it.base || 0) + sumRec(it); }
  function todayOf(it) { return Number(it.records[todayKey()]) || 0; }
  function allToday() { return S.items.reduce(function (a, it) { return a + todayOf(it); }, 0); }
  function allTotal() { return S.items.reduce(function (a, it) { return a + totalOf(it); }, 0); }

  function addCount(it, n) {
    var k = todayKey();
    it.records[k] = Math.max(0, (Number(it.records[k]) || 0) + n);
  }

  /* ---------------- 声音 / 震动 ---------------- */
  var actx = null;
  function beep() {
    if (!S.settings.sound) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1180, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.13);
    } catch (e) { }
  }
  function buzz(ms) {
    if (!S.settings.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(ms || 9); } catch (e) { }
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 1700);
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var d = new Date();
    $('#homeDate').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];

    var list = $('#homeList');
    if (!S.items.length) {
      list.innerHTML = '<div class="empty"><b>还没有功课</b>点右上角「添加功课」开始</div>';
      return;
    }
    list.innerHTML = S.items.map(function (it, i) {
      var right;
      if (ui.sorting) {
        right = '<div class="sort-btns">' +
          '<button data-up="' + it.id + '"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button data-down="' + it.id + '"' + (i === S.items.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '</div>';
      } else {
        right = '<button class="report' + (todayOf(it) > 0 ? ' done' : '') + '" data-report="' + it.id + '">报数</button>';
      }
      return '<div class="item" data-id="' + it.id + '">' +
        '<div class="it-main">' +
        '<div class="it-name">' + esc(it.name) + '</div>' +
        '<div class="it-meta"><span class="today">今日<b>' + fmt(todayOf(it)) + '</b></span>' +
        '<span>累计<b>' + fmt(totalOf(it)) + '</b></span></div>' +
        '</div>' + right + '</div>';
    }).join('');
    $('#btnSort').textContent = ui.sorting ? '完成' : '排序';
  }

  /* ---------------- tab 切换 ---------------- */
  function showTab(name) {
    ui.tab = name;
    $$('.pane').forEach(function (p) { p.classList.remove('on'); });
    $('#pane-' + name).classList.add('on');
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.dataset.tab === name); });
    if (name === 'home') renderHome();
    if (name === 'stats') renderStats();
    if (name === 'me') renderMe();
  }

  /* ---------------- 计数页 ---------------- */
  function currentItem() { return item(ui.itemId); }

  function openCount(id) {
    ui.itemId = id;
    var it = item(id); if (!it) return;
    $('#dTitle').textContent = it.name;
    updateCountView();
    $('#detail').classList.add('on');
  }
  function closeCount() {
    $('#detail').classList.remove('on');
    renderHome();
  }

  function updateCountView() {
    var it = currentItem(); if (!it) return;
    var t = todayOf(it), tot = totalOf(it);
    $('#cToday').textContent = fmt(t);
    $('#cTotal').textContent = fmt(tot);
    var gEl = $('#cGoal'), gLbl = $('#cGoalLbl');
    if (it.goal > 0) {
      gEl.textContent = fmt(it.goal);
      var pct = Math.round(Math.min(1, t / it.goal) * 100);
      gLbl.textContent = '目标 · ' + pct + '%';
    } else {
      gEl.textContent = '未设置';
      gLbl.textContent = '目标';
    }
    var cn = $('#centerNum'), txt = fmt(t);
    cn.textContent = txt;
    // 位数多时收小字号，避免撑满整行
    var dg = txt.replace(/[^0-9]/g, '').length;
    cn.style.fontSize = dg <= 3 ? '62px' : (dg === 4 ? '55px' : (dg === 5 ? '47px' : '41px'));
    $('#centerUnit').textContent = it.unit;
  }

  function pop(n, ev) {
    var zone = $('#tapzone'), r = zone.getBoundingClientRect();
    var x = ev && ev.clientX ? ev.clientX - r.left : r.width / 2;
    var y = ev && ev.clientY ? ev.clientY - r.top : r.height / 2;
    // 中心区域点击时把飘字下移，避免压住数字
    if (Math.abs(x - r.width / 2) < 90 && y < r.height * 0.55) y = r.height * 0.56;
    var el = document.createElement('div');
    el.className = 'pop-n';
    el.textContent = (n > 0 ? '+' : '') + n;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('#pops').appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }

  function bump() {
    var el = $('#centerNum');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(function () { el.classList.remove('bump'); }, 120);
  }

  function doAdd(n, ev) {
    var it = currentItem(); if (!it) return;
    if (n > 0) addCount(it, n); else {
      var t = todayOf(it);
      if (t <= 0) return;
      addCount(it, -Math.min(Math.abs(n), t));
    }
    save(); buzz(); beep(); bump(); pop(n, ev);
    updateCountView();
  }

  /* ---------------- 统计 ---------------- */
  function valueOn(key) {
    if (ui.statsItem === 'all') {
      return S.items.reduce(function (a, it) { return a + (Number(it.records[key]) || 0); }, 0);
    }
    var it = item(ui.statsItem);
    return it ? (Number(it.records[key]) || 0) : 0;
  }

  function series() {
    var out = { bars: [], unit: '次', totalLabel: '' };
    if (ui.scope === 'month') {
      var y = ui.period.getFullYear(), m = ui.period.getMonth();
      var days = new Date(y, m + 1, 0).getDate();
      var sum = 0;
      for (var i = 1; i <= days; i++) {
        var k = y + '-' + pad(m + 1) + '-' + pad(i);
        var v = valueOn(k); sum += v;
        out.bars.push({ key: k, label: String(i), value: v, full: (m + 1) + '-' + pad(i), sub: '当日累计数' });
      }
      out.totalLabel = sum + ' 次';
      out.periodLabel = y + '-' + pad(m + 1);
      out.total = sum;
    } else if (ui.scope === 'year') {
      var yy = ui.period.getFullYear(), tot = 0;
      for (var mm = 1; mm <= 12; mm++) {
        var dcount = new Date(yy, mm, 0).getDate(), s2 = 0;
        for (var dd = 1; dd <= dcount; dd++) s2 += valueOn(yy + '-' + pad(mm) + '-' + pad(dd));
        tot += s2;
        out.bars.push({ key: yy + '-' + pad(mm), label: mm + '月', value: s2, full: mm + '月', sub: '当月累计数' });
      }
      out.total = tot;
      out.totalLabel = tot + ' 次';
      out.periodLabel = String(yy);
    } else {
      var years = {};
      S.items.forEach(function (it) {
        Object.keys(it.records).forEach(function (k) {
          var yy2 = k.slice(0, 4); years[yy2] = true;
        });
      });
      var arr = Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
      if (!arr.length) arr = [new Date().getFullYear()];
      var start = Math.max(arr[0], arr[arr.length - 1] - 7);
      var tot2 = 0;
      for (var y3 = start; y3 <= arr[arr.length - 1]; y3++) {
        var s3 = 0;
        for (var m3 = 1; m3 <= 12; m3++) {
          var dc = new Date(y3, m3, 0).getDate();
          for (var d3 = 1; d3 <= dc; d3++) s3 += valueOn(y3 + '-' + pad(m3) + '-' + pad(d3));
        }
        tot2 += s3;
        out.bars.push({ key: String(y3), label: String(y3), value: s3, full: y3 + '年', sub: '当年累计数' });
      }
      out.total = tot2;
      out.totalLabel = tot2 + ' 次';
      out.periodLabel = '全部';
    }
    out.unit = currentUnit();
    return out;
  }

  function currentUnit() {
    if (ui.statsItem === 'all') return '次';
    var it = item(ui.statsItem);
    return it ? it.unit : '遍';
  }

  function niceMax(v) {
    if (v <= 0) return 3;
    if (v <= 3) return 3;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (v <= steps[i] * mag) return steps[i] * mag;
    return 10 * mag;
  }

  function renderStats() {
    // 功课筛选
    var chips = '<button class="chip' + (ui.statsItem === 'all' ? ' on' : '') + '" data-si="all">全部</button>' +
      S.items.map(function (it) {
        return '<button class="chip' + (ui.statsItem === it.id ? ' on' : '') + '" data-si="' + it.id + '">' + esc(it.name) + '</button>';
      }).join('');
    $('#statsItems').innerHTML = chips;

    $$('#statsSeg .seg-i').forEach(function (b) { b.classList.toggle('on', b.dataset.scope === ui.scope); });

    var d = series();
    $('#perLabel').textContent = d.periodLabel;
    $('#perNext').disabled = nextDisabled();

    if (ui.selBar === null || ui.selBar >= d.bars.length) {
      var last = -1;
      for (var i = d.bars.length - 1; i >= 0; i--) if (d.bars[i].value > 0) { last = i; break; }
      ui.selBar = last >= 0 ? last : 0;
    }

    var hasData = d.bars.some(function (b) { return b.value > 0; });
    $('#chartWrap').innerHTML = chartSVG(d.bars, d.unit) +
      (hasData ? '' : '<div class="chart-empty">' + (ui.scope === 'month' ? '这个月还没有记录' : (ui.scope === 'year' ? '这一年还没有记录' : '还没有任何记录')) + '</div>') +
      '<div class="chart-total"><span>' + fmt(d.total) + '</span><i>' + d.unit + '</i></div>';

    renderStatsDetail(d);
    renderStatsRow(d);
  }

  function nextDisabled() {
    var now = new Date();
    if (ui.scope === 'month') {
      return ui.period.getFullYear() > now.getFullYear() ||
        (ui.period.getFullYear() === now.getFullYear() && ui.period.getMonth() >= now.getMonth());
    }
    if (ui.scope === 'year') return ui.period.getFullYear() >= now.getFullYear();
    return true;
  }

  function chartSVG(bars, unit) {
    var W = 342, H = 224, L = 34, R = 10, T = 44, B = 26;
    var pw = W - L - R, ph = H - T - B;
    var maxV = niceMax(Math.max.apply(null, bars.map(function (b) { return b.value; }).concat([0])));
    var n = bars.length;
    var slot = pw / n;
    var bw = Math.min(20, Math.max(3, slot * 0.56));
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    // 网格
    [0, 0.5, 1].forEach(function (r) {
      var y = T + ph * (1 - r);
      s += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="currentColor" stroke-opacity="' + (r === 0 ? 0.14 : 0.07) + '" stroke-width="1"/>';
      if (r > 0) s += '<text class="axis-l" x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + shortNum(maxV * r) + '</text>';
    });

    bars.forEach(function (b, i) {
      var h = maxV > 0 ? (b.value / maxV) * ph : 0;
      var x = L + slot * i + (slot - bw) / 2;
      var y = T + ph - h;
      var on = i === ui.selBar;
      var fill = on ? 'url(#barG)' : 'var(--bar)';
      s += '<g class="bar" data-i="' + i + '">';
      s += '<rect x="' + L + slot * i + '" y="' + T + '" width="' + slot + '" height="' + ph + '" fill="transparent"/>';
      if (b.value > 0) {
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(2, h) + '" rx="' + Math.min(3, bw / 3) + '" fill="' + fill + '"/>';
      }
      s += '</g>';
      // 数值标注
      if (b.value > 0 && (on || n <= 12)) {
        s += '<text class="val-lab" x="' + (L + slot * i + slot / 2) + '" y="' + (y - 5) + '" text-anchor="middle">' + shortNum(b.value) + '</text>';
      }
      // x 轴标签
      var show = false;
      if (n <= 12) show = true;
      else if (ui.scope === 'month') show = (i === 0 || (i + 1) % 5 === 0);
      if (show) {
        var lx = L + slot * i + slot / 2;
        s += '<text class="xlab" x="' + lx + '" y="' + (T + ph + 16) + '" text-anchor="middle">' + b.label + '</text>';
      }
    });

    s += '<defs><linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#E2C08A"/><stop offset="1" stop-color="#C59A54"/></linearGradient></defs>';
    s += '</svg>';
    return s;
  }

  function shortNum(v) {
    if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, '') + '万';
    return fmt(v);
  }

  function renderStatsDetail(d) {
    var b = d.bars[ui.selBar];
    if (!b) { $('#statsDetail').innerHTML = ''; return; }
    var editable = ui.statsItem !== 'all' && ui.scope === 'month';
    $('#statsDetail').innerHTML =
      '<div class="dc-left">' +
      '<div class="dc-date">' + esc(b.full) + '</div>' +
      '<div class="dc-lbl">' + b.sub + '</div>' +
      '<div class="dc-val">' + fmt(b.value) + '<i>' + d.unit + '</i></div>' +
      '</div>' +
      '<button class="dc-edit" id="dcEdit"' + (editable ? '' : ' disabled') + '>' +
      '<svg width="17" height="17" viewBox="0 0 20 20"><path d="M13.2 3.2l3.6 3.6M4 16h3.4L16.6 6.8a1.8 1.8 0 000-2.5l-1-1a1.8 1.8 0 00-2.5 0L4 12.6V16z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
      '<span>修改</span></button>';
  }

  function renderStatsRow(d) {
    var vals = d.bars.map(function (b) { return b.value; });
    var days = vals.filter(function (v) { return v > 0; }).length;
    var max = Math.max.apply(null, vals.concat([0]));
    var avg = days ? Math.round(d.total / days) : 0;
    var lblDays = ui.scope === 'month' ? '有记天数' : (ui.scope === 'year' ? '有记月份' : '有记年份');
    var lblAvg = ui.scope === 'month' ? '日均' : (ui.scope === 'year' ? '月均' : '年均');
    var lblMax = ui.scope === 'month' ? '最高单日' : (ui.scope === 'year' ? '最高单月' : '最高单年');
    $('#statsRow').innerHTML =
      '<div class="stat-cell"><div class="n">' + fmt(d.total) + '</div><div class="l">本期合计</div></div>' +
      '<div class="stat-cell"><div class="n">' + days + '</div><div class="l">' + lblDays + '</div></div>' +
      '<div class="stat-cell"><div class="n">' + fmt(avg) + '</div><div class="l">' + lblAvg + '</div></div>' +
      '<div class="stat-cell"><div class="n">' + fmt(max) + '</div><div class="l">' + lblMax + '</div></div>';
  }

  /* ---------------- 我的 ---------------- */
  function renderMe() {
    $('#meTotal').textContent = fmt(allTotal());
    $('#meritCount').textContent = S.merits.length + ' 次 ›';
    var streak = 0, d = new Date();
    for (var i = 0; i < 400; i++) {
      var k = keyOf(d), v = 0;
      S.items.forEach(function (it) { v += Number(it.records[k]) || 0; });
      if (v > 0) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); }
      else break;
    }
    $('#meMeta').innerHTML = '<span>功课<b>' + S.items.length + '</b>项</span><span>连续<b>' + streak + '</b>天</span>';
    var st = S.settings;
    $('#swVibrate').classList.toggle('on', !!st.vibrate);
    $('#swSound').classList.toggle('on', !!st.sound);
    $('#swTheme').classList.toggle('on', st.theme === 'dark');
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.settings.theme === 'dark' ? 'dark' : 'light');
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', S.settings.theme === 'dark' ? '#131110' : '#FAF6EF');
    try {
      if (window.AndroidHost && window.AndroidHost.setDark) window.AndroidHost.setDark(S.settings.theme === 'dark');
    } catch (e) { }
  }

  /* ---------------- 弹层 ---------------- */
  function openSheet(html) {
    $('#sheet').innerHTML = '<div class="sh-grip"></div>' + html;
    $('#sheetLayer').classList.add('on');
  }
  function closeSheet() { $('#sheetLayer').classList.remove('on'); }

  function sheetItemForm(id) {
    var it = id ? item(id) : null;
    openSheet(
      '<div class="sh-title">' + (it ? '编辑功课' : '添加功课') + '</div>' +
      '<div class="sh-sub">' + (it ? '名称、目标与累计都可修改' : '先起个名字，其他可稍后设置') + '</div>' +
      '<div class="field"><label>功课名称</label>' +
      '<input class="input" id="fName" maxlength="20" placeholder="如：心经" value="' + (it ? esc(it.name) : '') + '"></div>' +
      (it ? '' : '<div class="quick" id="presets">' + PRESETS.map(function (p) { return '<button data-pre="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>') +
      '<div class="field" style="margin-top:16px"><label>计数单位</label>' +
      '<div class="quick" id="units">' + UNITS.map(function (u) { return '<button data-unit="' + u + '" class="' + ((it ? it.unit : '遍') === u ? 'unit-on' : '') + '">' + u + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>每日目标（0 表示不设置）</label>' +
      '<input class="input num" id="fGoal" type="number" inputmode="numeric" value="' + (it ? it.goal : 0) + '"></div>' +
      '<div class="field"><label>已有累计（从旧本子/APP 迁移时填写）</label>' +
      '<input class="input num" id="fBase" type="number" inputmode="numeric" value="' + (it ? it.base : 0) + '"></div>' +
      '<div class="sh-btns">' +
      (it ? '<button class="btn danger" id="fDelete">删除</button>' : '') +
      '<button class="btn primary" id="fSave">保存</button></div>'
    );
    var unit = it ? it.unit : '遍';
    if (!it) {
      $('#presets').addEventListener('click', function (e) {
        var b = e.target.closest('[data-pre]'); if (!b) return;
        $('#fName').value = b.dataset.pre;
      });
    }
    $('#units').addEventListener('click', function (e) {
      var b = e.target.closest('[data-unit]'); if (!b) return;
      unit = b.dataset.unit;
      $$('#units button').forEach(function (x) { x.classList.toggle('unit-on', x.dataset.unit === unit); });
    });
    $('#fSave').addEventListener('click', function () {
      var name = ($('#fName').value || '').trim();
      if (!name) { toast('请填写功课名称'); return; }
      var goal = Math.max(0, parseInt($('#fGoal').value, 10) || 0);
      var base = Math.max(0, parseInt($('#fBase').value, 10) || 0);
      if (it) {
        it.name = name; it.unit = unit; it.goal = goal; it.base = base;
      } else {
        S.items.push({ id: uid(), name: name, unit: unit, goal: goal, base: base, records: {} });
      }
      save(); closeSheet(); renderHome();
      if (ui.itemId) { $('#dTitle').textContent = currentItem() ? currentItem().name : ''; updateCountView(); }
      toast(it ? '已保存' : '已添加');
    });
    if (it) {
      $('#fDelete').addEventListener('click', function () {
        openSheet(
          '<div class="sh-title">删除功课</div>' +
          '<div class="sh-sub">「' + esc(it.name) + '」及全部记录将被清除，无法恢复</div>' +
          '<div class="sh-btns"><button class="btn ghost" id="c1">取消</button><button class="btn danger" id="c2">确认删除</button></div>'
        );
        $('#c1').addEventListener('click', closeSheet);
        $('#c2').addEventListener('click', function () {
          S.items = S.items.filter(function (x) { return x.id !== it.id; });
          save(); closeSheet(); closeCount(); renderHome(); toast('已删除');
        });
      });
    }
  }

  function sheetReport(id) {
    var it = item(id); if (!it) return;
    ui.itemId = id;
    openSheet(
      '<div class="sh-title">报数 · ' + esc(it.name) + '</div>' +
      '<div class="sh-sub">今日 ' + fmt(todayOf(it)) + ' ' + it.unit + ' · 累计 ' + fmt(totalOf(it)) + ' ' + it.unit + '</div>' +
      '<input class="rep-input" id="repNum" type="number" inputmode="numeric" value="' + (it.goal > 0 ? it.goal : 108) + '">' +
      '<div class="quick" id="repQuick" style="justify-content:center">' +
      [1, 7, 21, 49, 108, 1080].map(function (n) { return '<button data-n="' + n + '">+' + n + '</button>'; }).join('') +
      '</div>' +
      '<div class="sh-btns" style="margin-top:18px">' +
      '<button class="btn ghost" id="rCancel">取消</button>' +
      '<button class="btn primary" id="rOk">确认报数</button></div>'
    );
    var input = $('#repNum');
    setTimeout(function () { input.focus(); try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { } }, 240);
    $('#repQuick').addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      input.value = b.dataset.n;
    });
    $('#rCancel').addEventListener('click', closeSheet);
    $('#rOk').addEventListener('click', function () {
      var n = parseInt(input.value, 10);
      if (!n || n <= 0) { toast('请输入要报的数量'); return; }
      addCount(it, n); save();
      closeSheet(); buzz(12); renderHome();
      if (ui.itemId === it.id) updateCountView();
      toast('已报 ' + fmt(n) + ' ' + it.unit);
    });
  }

  function sheetGoal() {
    var it = currentItem(); if (!it) return;
    openSheet(
      '<div class="sh-title">每日目标</div>' +
      '<div class="sh-sub">设定后莲台外圈会显示完成进度</div>' +
      '<input class="rep-input" id="gNum" type="number" inputmode="numeric" value="' + (it.goal || 0) + '">' +
      '<div class="quick" id="gQuick" style="justify-content:center">' +
      [3, 7, 21, 108, 1080].map(function (n) { return '<button data-n="' + n + '">' + n + '</button>'; }).join('') +
      '<button data-n="0">不设置</button></div>' +
      '<div class="sh-btns" style="margin-top:18px">' +
      '<button class="btn ghost" id="gCancel">取消</button>' +
      '<button class="btn primary" id="gOk">保存</button></div>'
    );
    var input = $('#gNum');
    $('#gQuick').addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      input.value = b.dataset.n;
    });
    $('#gCancel').addEventListener('click', closeSheet);
    $('#gOk').addEventListener('click', function () {
      it.goal = Math.max(0, parseInt(input.value, 10) || 0);
      save(); closeSheet(); updateCountView(); renderHome(); toast(it.goal ? '目标已设为 ' + fmt(it.goal) : '已取消目标');
    });
  }

  function sheetMerit() {
    var it = currentItem(); if (!it) return;
    openSheet(
      '<div class="sh-title">回向</div>' +
      '<div class="sh-sub">今日 ' + fmt(todayOf(it)) + ' ' + it.unit + '，愿众生离苦</div>' +
      '<div class="merit-text">愿以此功德，庄严佛净土。<br>上报四重恩，下济三途苦。<br>若有见闻者，悉发菩提心。<br>尽此一报身，同生极乐国。</div>' +
      '<div class="merit-src">——《回向偈》</div>' +
      '<div class="sh-btns" style="margin-top:20px">' +
      '<button class="btn ghost" id="mCancel">关闭</button>' +
      '<button class="btn primary" id="mOk">已回向</button></div>'
    );
    $('#mCancel').addEventListener('click', closeSheet);
    $('#mOk').addEventListener('click', function () {
      S.merits.push({ t: Date.now(), id: it.id, n: todayOf(it) });
      save(); closeSheet(); buzz(14); toast('已回向 · 功德圆满');
    });
  }

  function sheetMerits() {
    var list = S.merits.slice(-60).reverse();
    openSheet(
      '<div class="sh-title">回向记录</div>' +
      '<div class="sh-sub">共 ' + S.merits.length + ' 次回向</div>' +
      (list.length ? '<div class="list-mini">' + list.map(function (m) {
        var d = new Date(m.t);
        var it = item(m.id);
        return '<div class="mi"><b>' + (it ? esc(it.name) : '已删除') + '</b><span>' +
          (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) +
          ' · ' + fmt(m.n) + '</span></div>';
      }).join('') + '</div>' : '<div class="empty">还没有回向记录</div>') +
      '<div class="sh-btns"><button class="btn ghost" id="mmClose">关闭</button></div>'
    );
    $('#mmClose').addEventListener('click', closeSheet);
  }

  function sheetExport() {
    var data = JSON.stringify(S, null, 1);
    openSheet(
      '<div class="sh-title">导出备份</div>' +
      '<div class="sh-sub">复制下面内容保存，换机后可粘贴导入</div>' +
      '<textarea class="input" id="expTxt" style="height:150px;padding:10px;font-size:11px;line-height:1.5;resize:none">' + esc(data) + '</textarea>' +
      '<div class="sh-btns" style="margin-top:14px">' +
      '<button class="btn ghost" id="expCopy">复制</button>' +
      '<button class="btn primary" id="expSave">保存文件</button></div>'
    );
    $('#expCopy').addEventListener('click', function () {
      var t = $('#expTxt');
      t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { }
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(data).catch(function () { });
      toast(ok ? '已复制到剪贴板' : '长按文本手动复制');
    });
    $('#expSave').addEventListener('click', function () {
      try {
        var blob = new Blob([data], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '净课备份-' + todayKey() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        toast('已生成备份文件');
      } catch (e) { toast('当前环境不支持，请用复制'); }
    });
  }

  function sheetImport() {
    openSheet(
      '<div class="sh-title">导入备份</div>' +
      '<div class="sh-sub">粘贴导出的 JSON 内容，导入会覆盖当前数据</div>' +
      '<textarea class="input" id="impTxt" placeholder="在这里粘贴备份内容" style="height:150px;padding:10px;font-size:11px;line-height:1.5;resize:none"></textarea>' +
      '<div class="sh-btns" style="margin-top:14px">' +
      '<button class="btn ghost" id="impCancel">取消</button>' +
      '<button class="btn primary" id="impOk">导入</button></div>'
    );
    $('#impCancel').addEventListener('click', closeSheet);
    $('#impOk').addEventListener('click', function () {
      try {
        var o = JSON.parse($('#impTxt').value);
        if (!o || !o.items) throw new Error('bad');
        S = normalize(o); save(); applyTheme(); closeSheet(); showTab('home');
        toast('导入成功');
      } catch (e) { toast('内容格式不正确'); }
    });
  }

  function sheetAbout() {
    openSheet(
      '<div class="sh-title">关于净课</div>' +
      '<div class="sh-sub">v1.0.0</div>' +
      '<div class="about-p">净课是一款安静的功课计数器：为读经、持咒、念佛、礼拜而做。' +
      '不联网、不登录、不上传，所有记录只保存在你的手机里。<br><br>' +
      '轻触莲台即计数，可切换每次 +1 / +10 / +108；长按可连续计数。统计支持月、年、总计三档，' +
      '换手机前请先在「导出备份」里备份一次。</div>' +
      '<div class="sh-btns" style="margin-top:18px"><button class="btn primary" id="abOk">知道了</button></div>'
    );
    $('#abOk').addEventListener('click', closeSheet);
  }

  /* ---------------- 事件 ---------------- */
  $('#tabbar').addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    showTab(b.dataset.tab);
  });

  $('#btnAdd').addEventListener('click', function () { sheetItemForm(null); });
  $('#btnSort').addEventListener('click', function () {
    ui.sorting = !ui.sorting; renderHome();
    $('#homeTip').textContent = ui.sorting ? '点 ▲ ▼ 调整顺序，完成后点「完成」' : '轻触功课进入计数 · 点「报数」快速录入';
  });

  $('#homeList').addEventListener('click', function (e) {
    var up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]');
    if (up || down) {
      var id = (up || down).dataset.up || (up || down).dataset.down;
      var i = S.items.findIndex(function (x) { return x.id === id; });
      var j = up ? i - 1 : i + 1;
      if (j < 0 || j >= S.items.length) return;
      var tmp = S.items[i]; S.items[i] = S.items[j]; S.items[j] = tmp;
      save(); renderHome(); return;
    }
    var rep = e.target.closest('[data-report]');
    if (rep) { e.stopPropagation(); sheetReport(rep.dataset.report); return; }
    if (ui.sorting) return;
    var it = e.target.closest('.item');
    if (it) openCount(it.dataset.id);
  });

  $('#btnBack').addEventListener('click', closeCount);
  // 顶部右侧已移除（编辑入口在底部「设置」），保留兼容
  var _be = $('#btnEdit'); if (_be) _be.addEventListener('click', function () { sheetItemForm(ui.itemId); });

  $$('.da').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.act;
      if (a === 'goal') sheetGoal();
      else if (a === 'merit') sheetMerit();
      else if (a === 'stats') { closeCount(); showTab('stats'); ui.statsItem = ui.itemId; ui.selBar = null; renderStats(); }
      else if (a === 'setting') sheetItemForm(ui.itemId);
    });
  });

  // 莲台点击 + 长按连击
  var pressTimer = null, repeatTimer = null, pressed = false;
  var zone = $('#tapzone');
  function startPress(e) {
    e.preventDefault();
    pressed = true;
    zone.classList.add('press');
    doAdd(ui.step, e);
    pressTimer = setTimeout(function () {
      repeatTimer = setInterval(function () {
        doAdd(ui.step, e);
      }, 120);
    }, 430);
  }
  function endPress() {
    if (!pressed) return;
    pressed = false;
    zone.classList.remove('press');
    clearTimeout(pressTimer); clearInterval(repeatTimer);
  }
  zone.addEventListener('pointerdown', startPress);
  zone.addEventListener('pointerup', endPress);
  zone.addEventListener('pointercancel', endPress);
  zone.addEventListener('pointerleave', endPress);
  zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  $('#steps').addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b) return;
    ui.step = Number(b.dataset.step);
    $$('#steps .step').forEach(function (x) { x.classList.toggle('on', x === b); });
  });
  $('#btnUndo').addEventListener('click', function () { doAdd(-ui.step, null); });
  $('#btnReport').addEventListener('click', function () { sheetReport(ui.itemId); });

  // 统计
  $('#statsItems').addEventListener('click', function (e) {
    var b = e.target.closest('[data-si]'); if (!b) return;
    ui.statsItem = b.dataset.si; ui.selBar = null; renderStats();
  });
  $('#statsSeg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-scope]'); if (!b) return;
    ui.scope = b.dataset.scope;
    ui.period = ui.scope === 'year' ? new Date(new Date().getFullYear(), 0, 1) : startOfMonth(new Date());
    ui.selBar = null; renderStats();
  });
  $('#perPrev').addEventListener('click', function () {
    if (ui.scope === 'month') ui.period = new Date(ui.period.getFullYear(), ui.period.getMonth() - 1, 1);
    else if (ui.scope === 'year') ui.period = new Date(ui.period.getFullYear() - 1, 0, 1);
    ui.selBar = null; renderStats();
  });
  $('#perNext').addEventListener('click', function () {
    if (nextDisabled()) return;
    if (ui.scope === 'month') ui.period = new Date(ui.period.getFullYear(), ui.period.getMonth() + 1, 1);
    else if (ui.scope === 'year') ui.period = new Date(ui.period.getFullYear() + 1, 0, 1);
    ui.selBar = null; renderStats();
  });
  $('#chartWrap').addEventListener('click', function (e) {
    var g = e.target.closest('.bar'); if (!g) return;
    ui.selBar = Number(g.dataset.i); renderStats();
  });
  $('#statsDetail').addEventListener('click', function (e) {
    if (!e.target.closest('#dcEdit')) return;
    var d = series(), b = d.bars[ui.selBar];
    if (!b || ui.statsItem === 'all') return;
    var it = item(ui.statsItem); if (!it) return;
    openSheet(
      '<div class="sh-title">修改记录</div>' +
      '<div class="sh-sub">' + esc(it.name) + ' · ' + esc(b.full) + '</div>' +
      '<input class="rep-input" id="mdNum" type="number" inputmode="numeric" value="' + b.value + '">' +
      '<div class="sh-btns" style="margin-top:18px">' +
      '<button class="btn ghost" id="mdCancel">取消</button>' +
      '<button class="btn primary" id="mdOk">保存</button></div>'
    );
    $('#mdCancel').addEventListener('click', closeSheet);
    $('#mdOk').addEventListener('click', function () {
      var v = Math.max(0, parseInt($('#mdNum').value, 10) || 0);
      if (v > 0) it.records[b.key] = v; else delete it.records[b.key];
      save(); closeSheet(); ui.selBar = null; renderStats(); renderHome();
      toast('已修改');
    });
  });

  // 我的
  $('#rowVibrate').addEventListener('click', function () {
    S.settings.vibrate = !S.settings.vibrate; save(); renderMe(); buzz(10);
  });
  $('#rowSound').addEventListener('click', function () {
    S.settings.sound = !S.settings.sound; save(); renderMe();
    if (S.settings.sound) beep();
  });
  $('#rowTheme').addEventListener('click', function () {
    S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark';
    save(); applyTheme(); renderMe();
  });
  $('#rowExport').addEventListener('click', sheetExport);
  $('#rowImport').addEventListener('click', sheetImport);
  $('#rowMerit').addEventListener('click', sheetMerits);
  $('#rowAbout').addEventListener('click', sheetAbout);

  $('#sheetBackdrop').addEventListener('click', closeSheet);

  // Android 返回键
  window.__appBack = function () {
    if ($('#sheetLayer').classList.contains('on')) { closeSheet(); return true; }
    if ($('#detail').classList.contains('on')) { closeCount(); return true; }
    return false;
  };

  /* ---------------- 莲台徽章 ---------------- */
  /* 取自参考图：回纹圆环 + 坐禅人形莲花。逐像素描轮廓后矢量还原（25KB）。 */
  var EMBLEM_SVG = '<svg viewBox="24 25 1260 1260" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="currentColor" fill-rule="evenodd">' +
    '<path transform="translate(630 25)" d="M0,0 L46,0 L90,3 L102,5 L103,13 L98,51 L96,57 L62,57 L60,58 L59,65 L60,72 L77,73 L111,77 L133,81 L143,84 L149,84 L150,73 L151,69 L144,66 L127,64 L118,61 L117,60 L118,43 L121,26 L124,10 L129,9 L162,15 L180,19 L201,26 L220,31 L237,38 L255,43 L262,47 L259,57 L254,69 L250,79 L248,79 L249,83 L243,95 L236,95 L220,89 L215,87 L207,86 L205,92 L203,97 L203,102 L213,104 L224,107 L233,111 L241,115 L256,121 L270,129 L281,134 L286,135 L288,130 L292,120 L287,118 L266,107 L262,105 L261,101 L265,91 L267,91 L268,84 L275,70 L281,58 L285,57 L300,63 L315,72 L324,76 L340,85 L353,93 L367,102 L376,108 L385,114 L400,124 L404,128 L403,133 L397,140 L391,148 L384,158 L377,166 L374,170 L367,169 L362,164 L348,155 L347,154 L340,154 L335,162 L336,167 L352,177 L363,185 L366,187 L366,189 L370,191 L378,197 L378,199 L382,201 L392,210 L402,218 L408,216 L413,210 L413,205 L408,200 L395,189 L389,185 L391,180 L395,174 L397,174 L398,170 L402,168 L404,163 L413,152 L420,144 L425,145 L432,150 L436,155 L444,161 L449,166 L459,174 L471,187 L474,189 L474,191 L476,191 L482,198 L487,203 L495,212 L500,219 L505,224 L513,233 L513,235 L515,235 L519,241 L521,246 L511,254 L502,261 L491,270 L486,273 L483,275 L477,275 L469,265 L462,256 L462,254 L458,252 L452,252 L446,259 L445,265 L448,266 L455,274 L459,280 L464,285 L472,296 L476,302 L476,304 L478,304 L482,310 L489,320 L493,326 L497,331 L502,330 L508,325 L507,317 L495,298 L493,296 L493,291 L501,285 L508,280 L510,280 L512,276 L522,270 L530,264 L533,263 L537,265 L540,270 L545,275 L547,281 L549,281 L551,286 L555,292 L558,295 L564,306 L575,324 L576,327 L579,330 L586,345 L589,352 L592,356 L603,382 L603,387 L595,391 L580,397 L569,403 L556,406 L552,401 L545,385 L541,379 L541,375 L530,378 L527,381 L527,388 L531,396 L537,408 L548,437 L553,449 L557,462 L559,464 L566,463 L573,461 L570,449 L566,436 L564,430 L564,425 L568,422 L576,419 L584,417 L598,411 L604,409 L613,409 L617,417 L626,446 L629,456 L634,473 L638,491 L641,501 L646,533 L647,542 L643,546 L618,550 L606,552 L597,552 L594,549 L591,533 L589,517 L577,518 L573,522 L574,529 L579,564 L581,585 L582,606 L583,609 L597,608 L598,607 L598,573 L600,570 L607,569 L639,567 L649,566 L651,571 L652,578 L653,597 L654,603 L654,653 L650,696 L648,709 L640,709 L626,707 L620,706 L608,705 L599,703 L596,700 L597,680 L597,666 L584,665 L582,666 L579,696 L578,705 L577,715 L575,721 L573,737 L571,742 L570,752 L571,754 L579,756 L584,756 L588,746 L590,730 L593,722 L598,721 L618,725 L631,727 L644,730 L645,734 L642,750 L640,761 L637,770 L634,785 L632,790 L630,799 L624,819 L620,834 L617,840 L612,855 L609,862 L606,867 L598,865 L585,860 L576,857 L564,851 L558,848 L557,845 L563,831 L567,816 L565,812 L561,810 L553,810 L550,815 L547,825 L544,832 L538,848 L533,861 L525,877 L520,886 L521,891 L528,896 L534,896 L543,879 L549,866 L555,867 L561,870 L569,874 L581,879 L597,887 L597,890 L590,906 L582,921 L576,932 L566,950 L560,961 L556,966 L548,980 L540,990 L539,992 L537,992 L535,997 L532,1003 L527,1008 L524,1010 L510,1001 L504,996 L504,994 L499,992 L488,983 L484,980 L485,973 L494,962 L500,954 L501,953 L500,946 L493,941 L488,941 L477,957 L473,962 L467,970 L460,979 L451,989 L444,997 L435,1007 L437,1015 L441,1017 L444,1019 L449,1018 L454,1012 L458,1008 L464,1001 L466,1001 L467,997 L470,995 L474,996 L480,1000 L489,1008 L499,1016 L504,1020 L507,1022 L507,1024 L509,1024 L510,1029 L508,1033 L506,1033 L504,1037 L495,1047 L488,1055 L483,1061 L478,1066 L459,1085 L451,1092 L442,1101 L439,1102 L436,1107 L431,1109 L429,1113 L421,1119 L418,1119 L418,1121 L413,1126 L407,1126 L395,1110 L387,1100 L379,1089 L378,1084 L383,1079 L395,1069 L400,1065 L402,1065 L402,1057 L399,1056 L397,1052 L391,1051 L383,1058 L378,1062 L369,1069 L364,1071 L362,1075 L356,1079 L342,1089 L334,1094 L333,1096 L323,1101 L324,1107 L329,1114 L334,1115 L338,1112 L340,1112 L340,1110 L347,1106 L359,1098 L365,1099 L369,1107 L376,1117 L379,1121 L379,1123 L382,1124 L390,1136 L390,1143 L386,1143 L385,1146 L371,1155 L365,1160 L355,1165 L346,1171 L337,1176 L328,1181 L310,1191 L301,1194 L285,1203 L278,1206 L271,1209 L266,1208 L261,1197 L255,1182 L251,1176 L248,1167 L248,1161 L263,1153 L271,1151 L272,1148 L277,1146 L279,1143 L274,1133 L270,1132 L257,1137 L248,1142 L240,1145 L228,1150 L209,1157 L193,1162 L191,1163 L192,1173 L193,1177 L204,1176 L214,1173 L217,1171 L224,1169 L229,1169 L232,1173 L234,1181 L238,1190 L246,1211 L246,1218 L241,1221 L234,1223 L224,1227 L217,1229 L206,1233 L189,1237 L167,1243 L150,1247 L115,1253 L110,1252 L107,1242 L103,1215 L102,1205 L104,1200 L130,1195 L138,1193 L135,1181 L132,1178 L112,1181 L104,1183 L88,1185 L46,1188 L46,1204 L59,1204 L70,1203 L81,1203 L84,1210 L86,1237 L87,1248 L88,1253 L85,1257 L50,1259 L-2,1259 L-30,1257 L-42,1256 L-52,1255 L-55,1252 L-55,1243 L-50,1208 L-48,1202 L-12,1203 L-11,1188 L-27,1186 L-60,1182 L-75,1179 L-88,1177 L-100,1176 L-102,1181 L-102,1190 L-99,1192 L-71,1197 L-68,1200 L-70,1218 L-75,1248 L-76,1249 L-89,1249 L-114,1244 L-134,1239 L-158,1232 L-169,1229 L-198,1219 L-210,1214 L-214,1211 L-211,1202 L-205,1187 L-197,1168 L-194,1164 L-187,1165 L-172,1170 L-166,1172 L-159,1172 L-154,1161 L-159,1157 L-173,1152 L-182,1149 L-192,1144 L-203,1140 L-214,1134 L-236,1125 L-240,1129 L-243,1136 L-240,1141 L-224,1149 L-213,1155 L-213,1161 L-221,1176 L-230,1198 L-233,1202 L-241,1201 L-257,1193 L-269,1187 L-279,1181 L-287,1177 L-299,1170 L-306,1166 L-317,1159 L-329,1151 L-343,1141 L-354,1133 L-355,1127 L-348,1117 L-346,1117 L-344,1112 L-335,1101 L-332,1097 L-330,1097 L-329,1093 L-325,1089 L-322,1089 L-317,1094 L-302,1105 L-293,1108 L-291,1104 L-287,1098 L-288,1094 L-298,1086 L-307,1080 L-319,1071 L-332,1060 L-343,1051 L-353,1042 L-360,1043 L-364,1048 L-365,1052 L-357,1062 L-349,1068 L-344,1072 L-342,1073 L-342,1080 L-344,1080 L-346,1085 L-350,1089 L-355,1097 L-360,1102 L-371,1115 L-377,1115 L-390,1105 L-398,1098 L-398,1095 L-402,1094 L-404,1090 L-408,1088 L-416,1080 L-424,1073 L-431,1065 L-441,1055 L-442,1051 L-445,1050 L-450,1045 L-464,1028 L-473,1016 L-469,1011 L-467,1010 L-465,1006 L-459,1002 L-455,1000 L-451,996 L-434,984 L-430,985 L-422,992 L-420,997 L-418,997 L-417,1001 L-414,1002 L-414,1004 L-411,1005 L-409,1008 L-403,1007 L-396,1000 L-398,995 L-406,986 L-406,984 L-408,984 L-418,971 L-418,969 L-420,969 L-428,958 L-428,956 L-432,954 L-437,944 L-442,938 L-445,932 L-445,930 L-451,928 L-460,934 L-461,938 L-454,949 L-449,958 L-445,962 L-444,968 L-453,974 L-458,978 L-465,983 L-468,986 L-474,990 L-484,996 L-489,994 L-497,984 L-503,974 L-510,964 L-510,961 L-512,961 L-516,954 L-524,941 L-532,924 L-539,912 L-550,889 L-555,877 L-554,872 L-550,871 L-550,869 L-544,867 L-534,862 L-525,859 L-512,853 L-507,854 L-505,855 L-497,874 L-492,884 L-483,881 L-478,880 L-479,871 L-484,863 L-489,849 L-492,844 L-495,835 L-500,821 L-504,811 L-507,802 L-508,796 L-513,795 L-517,797 L-525,798 L-521,815 L-516,825 L-515,833 L-520,837 L-540,844 L-544,844 L-544,846 L-551,849 L-560,852 L-565,851 L-569,841 L-573,828 L-576,821 L-583,799 L-587,783 L-594,753 L-599,722 L-599,715 L-595,713 L-577,710 L-559,708 L-549,708 L-546,711 L-541,738 L-539,741 L-535,742 L-527,740 L-525,739 L-525,732 L-529,712 L-532,684 L-534,653 L-537,650 L-549,650 L-550,653 L-550,673 L-549,681 L-550,687 L-559,689 L-580,691 L-594,693 L-601,692 L-603,689 L-604,672 L-605,665 L-606,641 L-606,612 L-603,571 L-601,553 L-599,551 L-587,551 L-556,555 L-549,557 L-548,558 L-548,568 L-550,593 L-538,594 L-534,593 L-531,569 L-529,548 L-527,537 L-524,524 L-522,513 L-522,505 L-528,503 L-537,503 L-541,520 L-543,532 L-545,536 L-555,536 L-576,533 L-591,531 L-596,528 L-595,519 L-592,499 L-588,481 L-584,469 L-582,459 L-578,448 L-577,441 L-575,440 L-574,433 L-569,418 L-564,406 L-562,401 L-561,394 L-560,393 L-551,393 L-541,398 L-532,401 L-512,409 L-510,411 L-511,419 L-514,427 L-518,436 L-519,446 L-513,449 L-506,450 L-501,437 L-497,429 L-495,422 L-492,415 L-488,405 L-480,389 L-472,373 L-472,367 L-480,362 L-486,362 L-488,367 L-497,386 L-500,392 L-508,391 L-523,384 L-546,374 L-548,372 L-547,365 L-539,348 L-534,338 L-531,331 L-523,318 L-515,304 L-512,299 L-503,285 L-494,272 L-488,263 L-482,255 L-478,251 L-471,252 L-466,256 L-456,264 L-448,269 L-448,271 L-443,273 L-437,278 L-436,284 L-447,299 L-453,307 L-453,312 L-447,317 L-440,318 L-437,315 L-434,310 L-427,299 L-420,290 L-417,290 L-416,285 L-404,271 L-398,264 L-392,257 L-390,257 L-388,252 L-388,248 L-393,241 L-399,240 L-404,245 L-415,257 L-418,262 L-424,264 L-434,257 L-446,246 L-452,242 L-462,233 L-461,228 L-459,228 L-457,223 L-453,218 L-448,213 L-440,205 L-435,200 L-432,195 L-428,191 L-426,191 L-424,187 L-416,180 L-411,174 L-400,165 L-389,154 L-385,152 L-381,147 L-377,145 L-373,141 L-368,137 L-364,135 L-358,135 L-351,143 L-344,153 L-330,170 L-329,174 L-333,179 L-342,186 L-350,193 L-352,193 L-354,199 L-351,205 L-347,208 L-342,208 L-338,205 L-336,205 L-335,202 L-328,196 L-325,193 L-312,183 L-304,178 L-293,169 L-286,165 L-277,159 L-275,159 L-276,151 L-280,145 L-284,144 L-289,147 L-296,152 L-302,155 L-308,160 L-314,161 L-319,156 L-321,151 L-331,139 L-339,126 L-342,123 L-342,118 L-334,112 L-332,112 L-332,110 L-328,109 L-328,107 L-322,104 L-312,97 L-298,89 L-291,86 L-290,83 L-274,75 L-258,67 L-246,61 L-232,54 L-225,51 L-222,50 L-217,52 L-214,61 L-208,73 L-203,87 L-199,95 L-200,99 L-204,102 L-214,106 L-223,110 L-229,113 L-230,118 L-225,128 L-216,125 L-195,115 L-175,108 L-166,104 L-159,101 L-145,97 L-141,95 L-145,83 L-145,81 L-155,83 L-165,86 L-173,89 L-180,90 L-185,84 L-188,73 L-192,63 L-197,49 L-198,48 L-198,41 L-186,36 L-176,33 L-166,29 L-145,23 L-129,19 L-93,11 L-67,7 L-62,8 L-58,17 L-56,35 L-54,50 L-54,57 L-56,59 L-68,62 L-81,64 L-88,66 L-88,74 L-85,80 L-74,80 L-58,77 L-22,73 L1,71 L3,61 L2,56 L-33,56 L-35,52 L-38,29 L-39,5 L-36,2 L-26,2 L-8,1 Z M0,18 L-16,19 L-18,21 L-18,33 L-13,38 L7,37 L20,37 L21,39 L20,88 L14,89 L-13,90 L-50,94 L-68,97 L-82,100 L-90,102 L-101,104 L-102,96 L-105,84 L-110,63 L-111,61 L-111,52 L-90,48 L-79,45 L-75,42 L-76,34 L-79,29 L-81,28 L-88,28 L-118,34 L-140,40 L-165,47 L-173,50 L-174,57 L-170,66 L-166,67 L-157,65 L-138,59 L-133,60 L-129,70 L-123,94 L-121,99 L-120,107 L-128,111 L-143,115 L-161,121 L-170,125 L-186,131 L-202,139 L-225,150 L-227,151 L-227,153 L-234,152 L-238,144 L-246,130 L-252,118 L-255,113 L-256,108 L-253,105 L-243,100 L-236,97 L-226,91 L-225,86 L-230,76 L-235,75 L-243,80 L-256,85 L-260,88 L-276,96 L-285,101 L-297,108 L-300,111 L-303,112 L-303,114 L-308,116 L-313,119 L-316,122 L-315,128 L-310,134 L-304,135 L-296,130 L-284,122 L-279,119 L-275,118 L-272,124 L-266,135 L-262,141 L-258,148 L-251,159 L-251,165 L-267,174 L-281,183 L-286,187 L-292,191 L-303,199 L-306,202 L-316,209 L-327,218 L-334,224 L-334,226 L-338,228 L-339,232 L-348,234 L-353,231 L-360,223 L-364,221 L-366,216 L-375,207 L-380,201 L-380,196 L-374,189 L-363,180 L-357,174 L-358,168 L-364,161 L-369,160 L-377,167 L-382,172 L-392,181 L-421,210 L-426,215 L-433,222 L-436,227 L-434,231 L-429,236 L-426,238 L-422,237 L-416,233 L-413,228 L-405,221 L-400,215 L-395,215 L-391,217 L-389,221 L-383,226 L-378,231 L-366,244 L-363,247 L-362,253 L-366,255 L-377,267 L-377,269 L-381,271 L-389,281 L-389,283 L-392,284 L-401,295 L-402,299 L-406,301 L-413,312 L-420,322 L-424,326 L-434,343 L-434,345 L-440,343 L-448,338 L-454,334 L-461,330 L-476,321 L-478,321 L-477,312 L-470,301 L-463,290 L-462,285 L-465,281 L-472,277 L-477,279 L-487,293 L-494,303 L-498,311 L-508,326 L-519,347 L-523,355 L-524,356 L-524,362 L-515,367 L-508,366 L-505,361 L-497,345 L-493,338 L-487,338 L-478,344 L-462,352 L-449,359 L-447,361 L-448,365 L-452,374 L-456,381 L-460,390 L-468,405 L-471,412 L-477,424 L-483,442 L-487,452 L-489,458 L-492,468 L-492,471 L-494,471 L-495,473 L-506,471 L-526,466 L-542,460 L-544,458 L-543,452 L-538,439 L-535,429 L-535,424 L-537,422 L-547,418 L-550,419 L-550,421 L-552,421 L-557,436 L-561,445 L-565,463 L-568,472 L-572,487 L-576,503 L-576,508 L-577,512 L-568,515 L-564,516 L-559,514 L-557,508 L-555,497 L-552,486 L-552,482 L-545,481 L-515,489 L-502,491 L-502,493 L-500,495 L-506,519 L-508,529 L-514,564 L-515,581 L-517,610 L-518,613 L-524,614 L-568,613 L-569,610 L-569,593 L-568,578 L-570,574 L-577,573 L-583,573 L-586,577 L-588,595 L-589,623 L-589,637 L-588,663 L-586,672 L-576,672 L-570,670 L-569,668 L-569,634 L-561,633 L-522,633 L-517,634 L-516,668 L-513,699 L-506,739 L-503,751 L-503,754 L-515,757 L-522,759 L-540,764 L-546,765 L-554,765 L-557,754 L-560,737 L-562,731 L-564,730 L-573,730 L-578,734 L-578,746 L-576,754 L-573,767 L-569,785 L-563,807 L-561,813 L-558,823 L-555,828 L-541,825 L-539,822 L-541,813 L-545,800 L-547,794 L-547,787 L-540,784 L-515,777 L-498,773 L-497,777 L-491,796 L-488,804 L-486,811 L-481,825 L-476,839 L-472,845 L-466,861 L-464,861 L-463,866 L-456,880 L-454,882 L-454,887 L-463,892 L-468,896 L-480,902 L-482,904 L-491,907 L-496,910 L-500,909 L-506,898 L-514,882 L-515,880 L-522,880 L-528,882 L-531,885 L-530,891 L-523,905 L-515,921 L-507,935 L-502,944 L-492,960 L-488,965 L-487,968 L-482,970 L-472,965 L-470,959 L-476,950 L-484,937 L-487,932 L-486,928 L-480,924 L-475,921 L-461,913 L-452,907 L-448,905 L-442,904 L-440,908 L-437,912 L-431,923 L-429,927 L-427,927 L-425,931 L-419,941 L-413,949 L-405,959 L-397,970 L-391,977 L-389,977 L-387,982 L-374,995 L-371,999 L-372,1003 L-380,1010 L-386,1017 L-394,1024 L-402,1032 L-405,1034 L-412,1033 L-418,1025 L-425,1019 L-428,1015 L-430,1015 L-431,1012 L-438,1011 L-438,1013 L-442,1015 L-446,1019 L-446,1024 L-443,1025 L-434,1037 L-432,1037 L-432,1039 L-430,1039 L-430,1042 L-428,1042 L-426,1046 L-419,1053 L-414,1058 L-411,1059 L-409,1063 L-405,1068 L-397,1075 L-387,1084 L-381,1089 L-375,1089 L-374,1086 L-372,1086 L-371,1082 L-368,1081 L-369,1077 L-372,1072 L-380,1065 L-386,1058 L-393,1052 L-392,1048 L-384,1041 L-383,1038 L-380,1037 L-375,1032 L-371,1027 L-364,1021 L-360,1016 L-354,1017 L-339,1031 L-327,1042 L-316,1051 L-305,1060 L-300,1063 L-289,1071 L-268,1085 L-263,1089 L-264,1095 L-270,1106 L-274,1110 L-277,1117 L-285,1130 L-287,1132 L-292,1132 L-302,1126 L-304,1126 L-304,1124 L-315,1117 L-320,1116 L-327,1121 L-330,1128 L-322,1135 L-309,1143 L-299,1150 L-282,1160 L-271,1166 L-254,1175 L-248,1177 L-243,1176 L-240,1169 L-240,1163 L-244,1159 L-252,1155 L-262,1150 L-269,1145 L-267,1139 L-261,1129 L-257,1121 L-249,1108 L-246,1103 L-246,1101 L-239,1102 L-232,1106 L-223,1111 L-211,1116 L-195,1124 L-183,1129 L-171,1134 L-154,1140 L-140,1145 L-135,1146 L-134,1148 L-134,1155 L-140,1176 L-146,1196 L-148,1197 L-163,1193 L-173,1189 L-178,1187 L-183,1187 L-185,1189 L-188,1199 L-187,1203 L-179,1207 L-165,1212 L-154,1215 L-131,1222 L-101,1229 L-95,1229 L-92,1227 L-91,1221 L-91,1213 L-94,1211 L-110,1207 L-124,1204 L-125,1202 L-124,1193 L-119,1175 L-115,1158 L-114,1154 L-104,1155 L-97,1157 L-80,1160 L-60,1164 L-55,1165 L-26,1168 L8,1170 L7,1177 L7,1206 L6,1222 L-4,1222 L-24,1221 L-31,1221 L-33,1225 L-33,1235 L-31,1238 L-19,1240 L-11,1241 L21,1242 L31,1242 L43,1241 L58,1241 L64,1240 L66,1237 L65,1225 L62,1222 L50,1222 L30,1223 L28,1222 L27,1211 L27,1170 L62,1169 L84,1167 L112,1163 L132,1159 L142,1157 L146,1156 L149,1158 L152,1172 L155,1184 L159,1201 L158,1208 L151,1209 L128,1214 L124,1218 L125,1226 L126,1231 L137,1231 L162,1226 L167,1224 L190,1219 L201,1215 L217,1210 L221,1207 L220,1200 L217,1193 L210,1193 L194,1198 L190,1200 L180,1200 L176,1187 L170,1165 L168,1158 L168,1152 L173,1149 L190,1145 L198,1141 L213,1136 L234,1128 L248,1121 L265,1114 L276,1107 L282,1107 L284,1111 L292,1127 L300,1143 L302,1147 L302,1153 L290,1159 L279,1165 L273,1169 L272,1173 L277,1183 L286,1183 L302,1175 L314,1168 L319,1166 L324,1162 L330,1160 L331,1158 L336,1156 L344,1151 L353,1146 L357,1142 L363,1138 L364,1133 L361,1132 L359,1128 L356,1124 L351,1124 L350,1127 L344,1129 L335,1135 L323,1140 L319,1136 L318,1133 L316,1133 L315,1129 L304,1109 L300,1101 L298,1100 L299,1095 L310,1088 L320,1082 L336,1071 L344,1065 L349,1062 L352,1059 L360,1053 L366,1049 L367,1046 L370,1046 L374,1042 L382,1035 L393,1024 L397,1025 L402,1031 L406,1035 L408,1035 L409,1039 L428,1058 L430,1064 L426,1066 L421,1071 L414,1077 L413,1079 L408,1082 L405,1086 L406,1092 L412,1099 L417,1098 L430,1088 L439,1080 L444,1075 L449,1070 L456,1062 L464,1055 L469,1050 L470,1046 L475,1044 L484,1033 L482,1028 L473,1021 L469,1023 L464,1027 L462,1033 L458,1034 L453,1040 L448,1045 L444,1046 L441,1043 L439,1043 L437,1039 L433,1037 L432,1033 L423,1026 L419,1021 L417,1021 L415,1017 L409,1010 L413,1004 L414,1001 L418,999 L422,994 L427,989 L434,982 L442,972 L442,970 L446,968 L454,958 L467,940 L472,932 L475,927 L481,918 L483,915 L487,916 L503,925 L514,932 L522,937 L525,937 L526,945 L520,956 L510,970 L512,977 L520,982 L525,981 L530,973 L530,971 L532,971 L538,962 L545,952 L553,938 L563,920 L572,901 L572,897 L562,892 L557,893 L552,900 L548,908 L542,918 L541,923 L530,919 L521,913 L505,905 L495,899 L496,893 L507,873 L514,859 L519,847 L528,826 L534,810 L537,799 L542,789 L543,786 L553,788 L560,791 L576,795 L590,800 L591,803 L586,818 L583,827 L581,832 L582,836 L590,841 L596,841 L600,836 L606,819 L609,811 L610,804 L613,796 L618,777 L621,765 L623,754 L623,748 L618,745 L610,744 L606,746 L602,759 L600,770 L597,778 L593,779 L577,774 L566,772 L561,770 L549,767 L549,759 L553,741 L554,740 L559,710 L561,693 L563,666 L564,659 L564,649 L566,646 L593,646 L612,647 L616,649 L616,665 L615,683 L619,686 L625,687 L632,686 L634,673 L635,665 L635,594 L633,588 L623,587 L619,588 L617,591 L616,598 L617,614 L617,625 L614,626 L600,627 L568,626 L564,625 L563,595 L560,558 L556,533 L553,522 L550,505 L567,501 L580,498 L591,496 L593,494 L600,494 L603,503 L608,525 L610,529 L617,530 L623,528 L625,527 L626,520 L622,497 L616,476 L612,459 L604,435 L600,432 L589,434 L587,437 L588,445 L594,466 L594,473 L573,480 L564,481 L548,486 L543,485 L542,476 L532,444 L520,415 L517,409 L513,399 L511,397 L507,387 L502,377 L502,372 L525,360 L541,351 L547,351 L550,356 L562,379 L567,381 L577,376 L578,375 L578,370 L574,361 L568,349 L559,332 L556,327 L548,314 L542,303 L539,302 L537,296 L532,290 L528,289 L519,296 L518,301 L524,310 L533,325 L534,332 L528,336 L516,342 L511,346 L500,352 L494,355 L489,354 L479,338 L474,330 L470,325 L461,311 L448,295 L445,291 L443,291 L441,286 L437,281 L435,281 L433,277 L426,269 L421,264 L419,260 L420,256 L430,247 L435,241 L445,233 L448,230 L452,226 L459,226 L470,238 L479,249 L485,249 L490,244 L494,241 L493,237 L485,226 L480,221 L477,221 L475,216 L471,211 L463,204 L458,198 L450,191 L445,185 L431,174 L426,170 L421,173 L416,178 L417,185 L421,187 L422,190 L430,197 L440,207 L438,212 L431,220 L423,227 L418,232 L413,236 L411,240 L404,245 L391,233 L383,225 L373,217 L368,212 L358,204 L356,204 L356,202 L337,189 L328,183 L318,177 L310,170 L311,164 L318,154 L322,146 L332,131 L335,127 L341,129 L347,133 L356,138 L368,145 L374,138 L375,135 L375,128 L362,120 L352,113 L343,107 L322,95 L309,88 L298,82 L293,82 L289,85 L286,92 L286,97 L296,103 L312,111 L317,115 L317,121 L315,121 L302,143 L295,154 L295,157 L292,158 L292,160 L277,152 L260,143 L234,131 L219,126 L209,122 L197,118 L189,115 L181,112 L180,108 L183,97 L186,90 L190,76 L194,64 L194,62 L210,67 L219,69 L222,71 L230,72 L234,66 L235,63 L235,55 L205,45 L184,39 L165,34 L151,31 L142,31 L138,38 L138,45 L143,49 L159,52 L173,56 L172,65 L165,92 L161,105 L161,107 L149,104 L142,102 L132,100 L119,97 L87,92 L49,89 L40,89 L40,74 L41,47 L42,37 L76,39 L80,37 L80,23 L76,20 L64,19 L36,18 Z"/>' +
    '<path transform="translate(659 314)" d="M0,0 L5,1 L12,7 L17,9 L22,15 L30,22 L39,30 L46,38 L55,50 L64,65 L68,74 L71,82 L75,99 L75,118 L71,138 L64,155 L56,168 L47,180 L42,185 L32,195 L30,196 L31,201 L39,207 L40,209 L45,211 L45,213 L49,215 L59,224 L65,228 L69,233 L76,238 L81,243 L86,249 L88,250 L88,252 L92,254 L99,262 L110,276 L114,281 L118,288 L128,304 L136,322 L142,340 L145,359 L145,392 L139,416 L131,436 L121,453 L113,464 L104,475 L90,490 L86,495 L78,502 L65,513 L59,517 L55,520 L49,520 L48,517 L44,515 L33,506 L22,495 L22,493 L18,491 L11,482 L6,475 L6,473 L4,473 L-2,463 L-11,442 L-16,425 L-17,423 L-19,393 L-16,370 L-11,344 L-8,335 L-2,314 L0,312 L2,305 L3,302 L6,302 L7,311 L7,379 L9,394 L11,406 L14,416 L20,428 L20,430 L22,430 L28,439 L42,454 L53,462 L55,463 L55,465 L65,461 L76,453 L86,444 L88,444 L90,439 L95,431 L97,431 L98,427 L104,415 L107,408 L110,399 L114,378 L113,360 L110,342 L103,325 L96,311 L89,300 L86,297 L83,292 L76,285 L76,283 L72,281 L67,275 L61,270 L56,265 L43,254 L34,248 L29,243 L14,234 L3,227 L-2,226 L-12,232 L-18,236 L-23,241 L-28,244 L-30,244 L-31,248 L-35,249 L-35,251 L-46,260 L-50,265 L-52,265 L-53,268 L-58,273 L-69,285 L-79,299 L-85,309 L-93,324 L-100,344 L-104,361 L-106,371 L-106,403 L-103,424 L-96,449 L-89,466 L-85,475 L-80,485 L-77,491 L-69,504 L-59,519 L-52,529 L-41,543 L-35,550 L-35,552 L-33,552 L-33,554 L-30,555 L-23,563 L-22,566 L-18,568 L-17,571 L-15,571 L-11,575 L-11,577 L-8,578 L-8,580 L-4,582 L1,585 L12,576 L25,566 L26,564 L29,564 L30,561 L33,561 L34,558 L40,554 L47,548 L56,543 L80,529 L89,524 L102,519 L120,513 L129,510 L156,506 L170,505 L181,505 L203,507 L219,510 L229,513 L240,517 L252,522 L261,526 L279,536 L289,543 L299,550 L299,552 L304,554 L314,563 L322,569 L329,577 L337,585 L344,594 L343,600 L336,608 L331,613 L317,626 L307,634 L297,642 L288,648 L272,656 L258,664 L234,672 L215,676 L201,679 L188,680 L158,680 L126,676 L111,673 L93,668 L80,664 L66,659 L55,654 L45,650 L29,642 L10,631 L3,627 L-2,627 L-8,632 L-17,637 L-27,644 L-50,656 L-73,667 L-89,672 L-98,675 L-117,680 L-142,684 L-175,684 L-191,682 L-204,679 L-213,677 L-232,672 L-238,669 L-244,667 L-252,663 L-271,653 L-282,646 L-291,641 L-301,633 L-304,631 L-304,629 L-308,627 L-318,619 L-325,610 L-327,609 L-327,607 L-330,606 L-330,604 L-332,604 L-338,596 L-338,590 L-332,583 L-330,583 L-328,579 L-317,566 L-308,557 L-305,553 L-303,553 L-301,549 L-290,540 L-283,535 L-280,534 L-276,530 L-265,524 L-252,518 L-231,513 L-223,512 L-218,513 L-218,515 L-237,524 L-247,531 L-259,539 L-267,547 L-271,552 L-276,557 L-284,567 L-292,578 L-294,584 L-287,592 L-280,597 L-276,601 L-268,607 L-262,611 L-244,621 L-235,626 L-224,631 L-208,636 L-202,638 L-193,640 L-184,642 L-166,643 L-140,643 L-118,641 L-95,636 L-79,631 L-63,625 L-47,618 L-39,614 L-32,610 L-31,605 L-36,600 L-36,598 L-40,596 L-43,593 L-43,591 L-47,589 L-55,580 L-59,576 L-59,574 L-62,573 L-64,569 L-67,568 L-76,557 L-87,544 L-93,536 L-96,531 L-103,521 L-109,512 L-115,501 L-124,485 L-133,462 L-137,451 L-140,435 L-143,425 L-144,417 L-144,371 L-141,355 L-135,332 L-129,317 L-126,310 L-117,293 L-108,279 L-100,268 L-96,264 L-93,259 L-90,255 L-88,255 L-86,251 L-83,250 L-81,245 L-79,245 L-77,241 L-66,230 L-56,222 L-51,217 L-39,208 L-30,201 L-32,195 L-43,184 L-51,170 L-55,165 L-61,153 L-65,143 L-68,135 L-70,122 L-70,99 L-67,82 L-62,70 L-55,56 L-48,46 L-42,38 L-35,30 L-28,24 L-23,19 L-11,9 L-3,3 Z M181,533 L162,534 L126,540 L111,546 L94,553 L73,564 L73,566 L68,568 L61,572 L61,574 L56,576 L42,588 L32,597 L27,602 L26,607 L38,616 L67,631 L94,640 L124,645 L139,646 L156,646 L173,644 L189,641 L217,633 L234,625 L239,623 L247,618 L258,612 L268,605 L275,601 L285,593 L290,589 L290,583 L281,573 L277,568 L274,568 L272,563 L256,553 L248,548 L231,541 L222,538 L208,535 L193,533 Z"/>' +
    '<path transform="translate(430 434)" d="M0,0 L10,0 L25,2 L59,4 L75,8 L96,16 L98,18 L103,20 L112,27 L120,34 L124,41 L125,45 L120,43 L103,34 L96,32 L73,29 L50,29 L38,30 L33,35 L25,52 L19,70 L16,89 L15,103 L15,114 L16,127 L22,152 L33,176 L38,184 L43,193 L50,202 L50,204 L52,204 L58,212 L63,218 L63,220 L57,218 L45,210 L33,201 L21,191 L21,189 L17,187 L8,176 L1,166 L-5,156 L-10,148 L-16,132 L-20,120 L-22,107 L-22,68 L-19,50 L-15,35 L-8,16 L-4,6 L-2,1 Z"/>' +
    '<path transform="translate(873 434)" d="M0,0 L7,0 L10,1 L14,12 L23,36 L26,47 L30,72 L30,102 L26,126 L20,140 L14,153 L11,160 L9,160 L7,165 L-1,176 L-6,181 L-12,188 L-17,193 L-26,202 L-38,210 L-43,213 L-48,216 L-53,217 L-52,213 L-41,199 L-34,189 L-26,176 L-22,168 L-17,156 L-12,141 L-10,132 L-8,115 L-8,91 L-11,75 L-19,50 L-23,41 L-29,32 L-34,30 L-42,29 L-71,29 L-84,31 L-97,35 L-107,39 L-114,45 L-117,45 L-116,38 L-108,29 L-103,25 L-94,20 L-91,19 L-91,17 L-80,13 L-69,8 L-52,4 L-17,2 Z"/>' +
    '<path transform="translate(383 604)" d="M0,0 L17,0 L24,1 L25,5 L8,10 L-10,17 L-20,22 L-31,28 L-42,36 L-47,39 L-58,48 L-62,54 L-61,65 L-57,76 L-52,88 L-45,101 L-37,115 L-27,128 L-18,138 L-14,143 L-6,150 L1,157 L3,158 L3,160 L7,162 L17,169 L27,175 L45,185 L53,189 L67,195 L85,201 L106,207 L117,209 L126,212 L125,214 L87,215 L62,213 L33,208 L19,204 L-1,197 L-19,189 L-31,181 L-41,174 L-54,165 L-61,158 L-61,156 L-63,156 L-63,154 L-65,154 L-65,152 L-69,150 L-71,145 L-73,145 L-80,136 L-87,126 L-95,113 L-103,98 L-107,87 L-114,69 L-118,53 L-113,47 L-108,45 L-104,41 L-99,37 L-92,34 L-88,30 L-77,23 L-60,15 L-46,8 L-28,4 L-23,2 Z"/>' +
    '<path transform="translate(916 604)" d="M0,0 L10,0 L32,2 L45,4 L52,7 L70,14 L84,21 L93,27 L105,34 L120,45 L128,52 L127,61 L125,70 L121,80 L117,91 L112,103 L100,126 L94,135 L86,145 L79,154 L75,156 L74,159 L69,164 L65,166 L64,169 L60,170 L60,172 L49,179 L45,183 L31,190 L18,195 L-1,202 L-29,207 L-62,208 L-69,207 L-90,204 L-92,202 L-88,200 L-66,197 L-53,193 L-44,190 L-30,185 L-24,182 L-17,180 L-13,177 L-2,171 L8,165 L20,156 L25,152 L32,144 L39,137 L45,129 L52,120 L60,103 L64,95 L70,77 L72,64 L72,52 L64,44 L54,37 L54,35 L49,33 L39,26 L21,18 L11,13 L-6,7 L-15,5 L-14,1 Z"/>' +
    '</g></svg>';

  /* ---------------- 启动 ---------------- */
  $('#emblem').innerHTML = EMBLEM_SVG;
  applyTheme();
  renderHome();
  showTab('home');

  // 可供外部深链 / 调试：index.html#stats / #me / #count
  var starts = (location.hash || '').replace(/^#\/?/, '');
  if (starts === 'stats') { showTab('stats'); }
  else if (starts === 'me') { showTab('me'); }
  else if (starts === 'count' && S.items[0]) { openCount(S.items[0].id); }
})();
