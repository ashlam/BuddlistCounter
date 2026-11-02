# 备份说明

## web-v1-线描莲/
改造前的完整网页版本（纯手绘线描莲花 + 首页合计卡）。
恢复方式：把本目录里的 index.html / styles.css / app.js 拷回 web/ 覆盖即可。

## lotus-v1-line-art.js
旧版 `lotusSVG()` 函数（七瓣圆头线描莲）。若想换回，把内容替换
web/app.js 里 `/* ---- 莲台徽章 ---- */` 到 `/* ---- 启动 ---- */` 之间的代码，
并把 `$('#emblem').innerHTML = EMBLEM_SVG;` 改回 `$('#lotus').innerHTML = lotusSVG();`
（同时 HTML 里的 `.emblem` 容器改回 `.lotus`）。

## app.js.20261102-1148.bak
改造前的 app.js 全文快照。
