package com.shoaib.quranfives;

import android.content.res.Configuration;
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
import android.content.Intent;
import android.database.Cursor;
import android.provider.ContactsContract;
import org.json.JSONObject;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    private long lastBackPressTime = 0;
    // آخر خلفية طلبها التطبيق: يُعاد تطبيقها (مع لون أيقونات أشرطة النظام) عند العودة إلى الشاشة
    // وعند تغيّر وضع الهاتف، فقد يعيدها أندرويد إلى لون الثيم فتختفي أيقونات الوقت والبطارية
    private volatile Integer windowBackground = null;
    // اختيار جهة اتصال (رقم شيخ): نافذة أندرويد نفسها، فلا يُطلب إذن قراءة جهات الاتصال كلّها
    private static final int PICK_CONTACT_REQUEST = 2001;

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
                        windowBackground = android.graphics.Color.parseColor(color);
                        applyWindowBackground();
                    } catch (Exception ignored) { }
                });
            }

            // إعدادات قناة إشعار في أندرويد (8+): منها يختار المستخدم نغمة من نغمات هاتفه
            @JavascriptInterface
            public void openNotificationChannel(final String channelId) {
                runOnUiThread(() -> {
                    android.content.Intent intent;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        intent = new android.content.Intent(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                                .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName())
                                .putExtra(android.provider.Settings.EXTRA_CHANNEL_ID, channelId);
                    } else {
                        intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                                .setData(android.net.Uri.fromParts("package", getPackageName(), null));
                    }
                    try { startActivity(intent); } catch (Exception ignored) { }
                });
            }

            // يفتح قائمة جهات الاتصال لاختيار رقم؛ النتيجة تصل إلى window.onAndroidContactPicked
            @JavascriptInterface
            public void pickContact() {
                runOnUiThread(() -> {
                    Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
                    try { startActivityForResult(intent, PICK_CONTACT_REQUEST); }
                    catch (Exception e) { sendPickedContact(null, null); }
                });
            }

            // إنهاء التطبيق (يُستدعى من زر «خروج» في مربع تأكيد الخروج)
            @JavascriptInterface
            public void finishApp() {
                runOnUiThread(() -> MainActivity.this.finish());
            }
        }, "AndroidApp");
    }

    // مع edge-to-edge تصبح أشرطة النظام شفافة، فلوّن أيقوناتها بما يناسب خلفية الوضع
    // (داكنة فوق فاتح، فاتحة فوق داكن).
    private void applyWindowBackground() {
        if (windowBackground == null) return;
        int color = windowBackground;
        getWindow().getDecorView().setBackgroundColor(color);
        boolean dark = isDarkColor(color);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(!dark);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(!dark);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyWindowBackground();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyWindowBackground();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyWindowBackground();
        // تغيّر وضع الهاتف (ليلي/نهاري، ومنه الجدولة بالوقت) قد يعيد أندرويد بعده لون الأيقونات
        // من الثيم، فنعيد التطبيق بعد لحظة أيضاً
        getWindow().getDecorView().postDelayed(this::applyWindowBackground, 400);
    }

    // يعيد true إن كان اللون داكناً (لتحديد لون أيقونات أشرطة النظام فوق خلفية الوضع)
    private static boolean isDarkColor(int color) {
        int r = (color >> 16) & 0xFF;
        int g = (color >> 8) & 0xFF;
        int b = color & 0xFF;
        double luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        return luminance < 0.5;
    }

    // نسخة جوجل درايف: إضافة الدخول بجوجل لا تطلب صلاحية درايف (scopes) على أندرويد إلا إن
    // أعادت هذه الشاشة إليها ردّ نافذة الموافقة. بدونه ترفض كل طلب بـ«You CANNOT use scopes…».
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_CONTACT_REQUEST) {
            handlePickedContact(resultCode, data);
            return;
        }
        if (requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN || requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) return;
        PluginHandle handle = getBridge().getPlugin("SocialLogin");
        if (handle != null && handle.getInstance() instanceof SocialLoginPlugin) {
            ((SocialLoginPlugin) handle.getInstance()).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // الاختيار يمنح قراءة هذا السطر وحده من جهات الاتصال
    private void handlePickedContact(int resultCode, Intent data) {
        if (resultCode != RESULT_OK || data == null || data.getData() == null) { sendPickedContact(null, null); return; }
        String[] columns = {
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
        };
        try (Cursor cursor = getContentResolver().query(data.getData(), columns, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                sendPickedContact(cursor.getString(0), cursor.getString(1));
                return;
            }
        } catch (Exception ignored) { }
        sendPickedContact(null, null);
    }

    private void sendPickedContact(String name, String phone) {
        String payload = "null";
        if (phone != null) {
            try { payload = new JSONObject().put("name", name == null ? "" : name).put("phone", phone).toString(); }
            catch (Exception ignored) { }
        }
        String script = "window.onAndroidContactPicked && window.onAndroidContactPicked(" + payload + ")";
        runOnUiThread(() -> this.bridge.getWebView().evaluateJavascript(script, null));
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() { }

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
