package com.shoaib.quranfives;

import android.os.Bundle;
import android.webkit.ValueCallback;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import android.webkit.JavascriptInterface;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // إصلاح الشريط الأسود أسفل WebView (inset مزدوج لشريط التنقّل):
        // يملأ WebView الشاشة كاملة (edge-to-edge) فلا يبقى شريط أسود/أبيض.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // إنشاء جسر للتواصل مع React لطلب الإذن فقط عند الحاجة
        this.bridge.getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void requestCameraPermission() {
                runOnUiThread(() -> {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, 1001);
                    }
                });
            }

            // يلوّن خلفية النافذة ويضبط لون أيقونات أشرطة النظام (الوقت/البطارية/أزرار التنقّل)
            @JavascriptInterface
            public void setWindowBackground(final String color) {
                runOnUiThread(() -> {
                    try {
                        int parsed = android.graphics.Color.parseColor(color);
                        getWindow().getDecorView().setBackgroundColor(parsed);

                        // مع edge-to-edge تصبح أشرطة النظام شفافة، فلوّن أيقوناتها
                        // بما يناسب خلفية الوضع (داكنة فوق فاتح، فاتحة فوق داكن).
                        boolean dark = isDarkColor(parsed);
                        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                                .setAppearanceLightStatusBars(!dark);
                        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                                .setAppearanceLightNavigationBars(!dark);
                    } catch (Exception ignored) { }
                });
            }

            // إنهاء التطبيق (يُستدعى من زر «خروج» في مربع تأكيد الخروج)
            @JavascriptInterface
            public void finishApp() {
                runOnUiThread(() -> MainActivity.this.finish());
            }
        }, "AndroidApp");
    }

    // يعيد true إن كان اللون داكناً (لتحديد لون أيقونات أشرطة النظام فوق خلفية الوضع)
    private static boolean isDarkColor(int color) {
        int r = (color >> 16) & 0xFF;
        int g = (color >> 8) & 0xFF;
        int b = color & 0xFF;
        double luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        return luminance < 0.5;
    }

    @Override
    public void onBackPressed() {
        // استدعاء دالة الـ JS التي جهزتها في المتصفح
        this.bridge.getWebView().evaluateJavascript("window.handleAndroidBack()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                // القيمة الراجعة تكون نصية (مثلاً "true" أو "false" أو "null")
                if ("false".equals(value) || "null".equals(value)) {
                    // إذا كنا في الشاشة الرئيسية (JS رجع false)
                    if (System.currentTimeMillis() - lastBackPressTime < 2000) {
                        // الضغطة الثانية خلال ثانيتين: خروج فعلي
                        MainActivity.super.onBackPressed();
                    } else {
                        // الضغطة الأولى: تحديث الوقت وإظهار التنبيه
                        lastBackPressTime = System.currentTimeMillis();
                        Toast.makeText(MainActivity.this, "اضغط مرة أخرى للخروج", Toast.LENGTH_SHORT).show();
                    }
                }
                // في حال كانت النتيجة "true"، لا نفعل شيئاً لأن تطبيق الويب تعامل مع الرجوع داخلياً
            }
        });
    }
}
