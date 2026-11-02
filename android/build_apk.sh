#!/usr/bin/env bash
# =============================================================================
# 大白牛车 · 读经计数器 —— 一键打包 APK（免 Gradle / 免 Android Studio）
#
# 用法：
#   bash android/build_apk.sh            # 构建 + 签名 + 校验
#   bash android/build_apk.sh --genkey   # 首次：生成签名密钥
#
# 依赖：
#   tools/jdk-17.0.20.1+1-jre            仅给 d8 / apksigner 用（本机 JDK 8 跑不动 d8）
#   %LOCALAPPDATA%/Android/Sdk/build-tools/34.0.0
#   %LOCALAPPDATA%/Android/Sdk/platforms/android-34/android.jar
#   本机 JDK 8 的 javac / keytool
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ANDROID_SDK:-/c/Users/Administrator/AppData/Local/Android/Sdk}"
BT="$SDK/build-tools/34.0.0"
AJAR="$SDK/platforms/android-34/android.jar"
JRE="$ROOT/tools/jdk-17.0.20.1+1-jre"
JDK8="/c/Program Files/Java/jdk1.8.0_201"
JAVAC="$JDK8/bin/javac.exe"
KEYTOOL="$JDK8/bin/keytool.exe"

PROJ="$ROOT/android/project"
ASSETS="$PROJ/assets"
OUT="$ROOT/android/output"
DIST="$ROOT/dist"
KS="$ROOT/android/jingke.jks"
PASSFILE="$ROOT/android/keystore.pass"
ALIAS="jingke"
APP_NAME="大白牛车"
VERSION="1.0.0"

export JAVA_HOME="$(cygpath -w "$JRE" 2>/dev/null || echo "$JRE")"

if [ "${1:-}" = "--genkey" ]; then
  if [ ! -f "$PASSFILE" ]; then
    python -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(16)))" > "$PASSFILE"
    echo "==> 已生成随机口令 android/keystore.pass（请自行留存，签名升级需要）"
  fi
  if [ ! -f "$KS" ]; then
    "$KEYTOOL" -genkeypair -v -keystore "$KS" -storepass "$(cat "$PASSFILE")" \
      -alias "$ALIAS" -keypass "$(cat "$PASSFILE")" -keyalg RSA -keysize 2048 -validity 10000 \
      -dname "CN=JingKe Counter, OU=Local, O=Personal, L=Local, ST=Local, C=CN"
  fi
fi

for f in "$JRE/bin/java.exe" "$BT/aapt2.exe" "$BT/d8.bat" "$BT/zipalign.exe" "$BT/apksigner.bat" "$AJAR" "$JAVAC" "$KS"; do
  if [ ! -e "$f" ]; then
    echo "缺少构建依赖: $f" >&2
    echo "首次请先执行: bash android/build_apk.sh --genkey" >&2
    exit 1
  fi
done

KS_PASS="$(tr -d '\r\n' < "$PASSFILE")"

echo "==> 清理输出 $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/compiled" "$OUT/R" "$OUT/classes" "$OUT/dex" "$DIST"

echo "==> 1/8 同步 web/ -> assets/"
rm -rf "$ASSETS"
mkdir -p "$ASSETS"
cp "$ROOT"/web/*.html "$ROOT"/web/*.css "$ROOT"/web/*.js "$ASSETS"/
echo "    $(ls "$ASSETS" | tr '\n' ' ')"

echo "==> 2/8 aapt2 编译资源（Windows 下单文件模式会报 bad resource path，用 --dir 整包）"
"$BT/aapt2.exe" compile --dir "$(cygpath -w "$PROJ/res")" -o "$(cygpath -w "$OUT/compiled/res.zip")"

echo "==> 3/8 aapt2 link"
"$BT/aapt2.exe" link -o "$(cygpath -w "$OUT/unsigned.apk")" \
  --manifest "$(cygpath -w "$PROJ/AndroidManifest.xml")" \
  -I "$(cygpath -w "$AJAR")" \
  -A "$(cygpath -w "$ASSETS")" \
  -R "$(cygpath -w "$OUT/compiled/res.zip")" \
  --auto-add-overlay \
  --java "$(cygpath -w "$OUT/R")"

echo "==> 4/8 javac 编译 Java"
find "$OUT/R" "$PROJ/src" -name '*.java' | sort | while read -r f; do cygpath -m "$f"; done > "$OUT/sources.txt"
if ! "$JAVAC" -encoding UTF-8 -source 8 -target 8 \
  -bootclasspath "$(cygpath -w "$AJAR")" \
  -classpath "$(cygpath -w "$AJAR")" \
  -d "$(cygpath -w "$OUT/classes")" @"$(cygpath -w "$OUT/sources.txt")" > "$OUT/javac.log" 2>&1; then
  cat "$OUT/javac.log" >&2
  echo "javac 失败，详见 $OUT/javac.log" >&2; exit 1
fi
if [ ! -f "$OUT/classes/com/jingke/counter/MainActivity.class" ]; then
  echo "javac 未产出 MainActivity.class" >&2; exit 1
fi

echo "==> 5/8 d8 转 dex"
find "$OUT/classes" -name '*.class' | sort | while read -r f; do cygpath -m "$f"; done > "$OUT/classes.arg"
"$BT/d8.bat" --release --min-api 23 --lib "$(cygpath -w "$AJAR")" \
  --output "$(cygpath -w "$OUT/dex")" @"$(cygpath -w "$OUT/classes.arg")"

echo "==> 6/8 装回 classes.dex"
python - "$OUT/unsigned.apk" "$OUT/dex/classes.dex" "$OUT/unsigned_with_dex.apk" <<'PY'
import sys, zipfile
src, dex, dst = sys.argv[1], sys.argv[2], sys.argv[3]
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename == 'classes.dex':
            continue
        zout.writestr(item, zin.read(item.filename))
    zout.writestr('classes.dex', open(dex, 'rb').read(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
print('    classes.dex 已写入')
PY

echo "==> 7/8 zipalign"
"$BT/zipalign.exe" -f 4 "$(cygpath -w "$OUT/unsigned_with_dex.apk")" "$(cygpath -w "$OUT/aligned.apk")"

echo "==> 8/8 apksigner 签名"
APK="$DIST/${APP_NAME}-v${VERSION}.apk"
"$BT/apksigner.bat" sign \
  --ks "$(cygpath -w "$KS")" --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --out "$(cygpath -w "$APK")" "$(cygpath -w "$OUT/aligned.apk")"

"$BT/apksigner.bat" verify --verbose "$APK" | head -5
"$BT/aapt2.exe" dump badging "$APK" | head -4

python - "$APK" <<'PY'
import sys, hashlib, os
p = sys.argv[1]
b = open(p, 'rb').read()
print('  大小   : %.1f KB' % (len(b)/1024))
print('  sha256 : %s' % hashlib.sha256(b).hexdigest())
print('  产物   : %s' % p)
PY
echo "==> 构建完成"
