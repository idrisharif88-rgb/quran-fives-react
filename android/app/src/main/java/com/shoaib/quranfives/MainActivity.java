package com.shoaib.quranfives;

import android.os.Bundle;
import android.webkit.ValueCallback;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.webkit.JavascriptInterface;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
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
        }, "AndroidApp");
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
