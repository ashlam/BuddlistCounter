  /* ---------------- 莲台 ---------------- */
  /* 七瓣圆头莲：花瓣由内向外渐短、渐淡，纯线描 */
  function lotusSVG() {
    function f(v) { return v.toFixed(1); }
    function petal(h, w) {
      var p = function (x, y) { return f(x * w) + ' ' + f(y * h); };
      return 'M0 0' +
        ' C' + p(-.62, -.10) + ' ' + p(-1.02, -.40) + ' ' + p(-.80, -.70) +
        ' C' + p(-.62, -.92) + ' ' + p(-.24, -1) + ' 0 ' + f(-h) +
        ' C' + p(.24, -1) + ' ' + p(.62, -.92) + ' ' + p(.80, -.70) +
        ' C' + p(1.02, -.40) + ' ' + p(.62, -.10) + ' 0 0 Z';
    }
    var N = 7, A0 = 78, L = 94, W = 25, TAPER = 0.42, R0 = 15;
    var out = '', i, a, t, h, w, op;
    for (i = 0; i < N; i++) {
      a = -A0 + 2 * A0 * i / (N - 1);
      t = Math.abs(a) / A0;
      h = L * (1 - TAPER * t);
      w = W * (1 - 0.22 * t);
      op = (1 - t * 0.42).toFixed(2);
      out += '<g transform="rotate(' + f(a) + ')"><g transform="translate(0 ' + f(-R0 * t) + ')"><path d="' + petal(h, w) +
        '" fill="none" stroke="currentColor" stroke-width="2.7" opacity="' + op +
        '" stroke-linejoin="round"/></g></g>';
    }
    return '<svg viewBox="6 10 188 120" xmlns="http://www.w3.org/2000/svg">' +
      '<g transform="translate(100 112)">' + out + '</g></svg>';
  }

