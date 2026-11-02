package com.jingke.counter;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * 大白牛车 · 读经计数器
 * 用本地 assets 承载前端页面，通过虚拟 https 域名提供，保证 localStorage 持久化可靠。
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME_URL = "https://" + HOST + "/index.html";
    private static final int BG_LIGHT = 0xFFFAF6EF;
    private static final int BG_DARK = 0xFF131110;

    private WebView web;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars(false, BG_LIGHT);

        web = new WebView(this);
        web.setBackgroundColor(BG_LIGHT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return localAsset(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternal(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternal(Uri.parse(url));
            }
        });

        web.addJavascriptInterface(new Host(), "AndroidHost");
        setContentView(web);
        web.loadUrl(HOME_URL);
    }

    /** 把 https://appassets.androidplatform.net/xxx 映射到 assets/xxx */
    private WebResourceResponse localAsset(Uri uri) {
        if (uri == null || !HOST.equals(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
        try {
            InputStream in = getAssets().open(path.substring(1));
            WebResourceResponse resp = new WebResourceResponse(mimeOf(path), "utf-8", in);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                java.util.Map<String, String> h = new java.util.HashMap<>();
                h.put("Cache-Control", "no-cache");
                resp.setResponseHeaders(h);
            }
            return resp;
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8",
                    new ByteArrayInputStream("404".getBytes()));
        }
    }

    private String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private boolean openExternal(Uri uri) {
        if (uri == null) return false;
        if (HOST.equals(uri.getHost())) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
        }
        return true;
    }

    private void applySystemBars(boolean dark, int bg) {
        Window w = getWindow();
        w.setStatusBarColor(bg);
        w.setNavigationBarColor(bg);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View dv = w.getDecorView();
            int flags = dv.getSystemUiVisibility();
            if (dark) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            else flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            dv.setSystemUiVisibility(flags);
        }
    }

    private static int parseColor(String hex, int fallback) {
        try {
            if (hex != null && hex.length() >= 7) return android.graphics.Color.parseColor(hex);
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private class Host {
        /** 旧接口：只切换深浅 */
        @JavascriptInterface
        public void setDark(final boolean dark) {
            setChrome(dark, dark ? "#131110" : "#FAF6EF");
        }

        /** 新接口：深浅 + 当前主题的背景色，让状态栏/导航栏跟随配色 */
        @JavascriptInterface
        public void setChrome(final boolean dark, final String bgHex) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    int bg = parseColor(bgHex, dark ? BG_DARK : BG_LIGHT);
                    applySystemBars(dark, bg);
                    if (web != null) web.setBackgroundColor(bg);
                }
            });
        }

        @JavascriptInterface
        public void vibrate(final int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) v.vibrate(ms);
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript(
                "(function(){try{return (window.__appBack&&window.__appBack())?'in':'out'}catch(e){return 'out'}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || value.indexOf("in") < 0) finish();
                    }
                });
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
