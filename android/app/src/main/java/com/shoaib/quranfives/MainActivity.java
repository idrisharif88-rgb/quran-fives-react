package com.shoaib.quranfives;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
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
    // أقصر ضلع 600dp فأكثر (لوحيّ): لوحة المفاتيح تُعالَج فيه بغير طريقة الهاتف — انظر onCreate
    private boolean largeScreen = false;
    // لوحة المفاتيح عبر حشو Capacitor وحده: الشاشات الكبيرة وكل هاتف بأندرويد 11 فأكثر.
    // على هذه الهواتف أيضاً كانت الآليات الثلاث تطرح لوحة المفاتيح مرّتين فيظهر مربّع أبيض فوق حقل البريد.
    // أندرويد 10 فأقلّ (Note 9) يبقى على adjustPan والإضافة — docs/fixes/android-keyboard-gap-three-screen-sizes.md
    private boolean imeByPadding = false;
    // أزرار الصوت تقلّب الصفحات ما دام التطبيق يطلب ذلك (useVolumeNav)؛ وإلا بقيت للصوت
    private volatile boolean volumeNav = false;
    // الإمساك بزرّ الصوت يتكرّر متسارعاً، كالضغط المطوّل في الصفحة (repeatDelay في pageNav.js)
    private long lastVolumeNavAt = 0;
    private int volumeRepeatStep = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        largeScreen = getResources().getConfiguration().smallestScreenWidthDp >= 600;
        imeByPadding = largeScreen || android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R;
        if (imeByPadding) {
            // الشاشات الكبيرة: Capacitor يرفع الصفحة فوق لوحة المفاتيح بنفسه (حشو بارتفاعها)، وتصغير
            // إضافة Keyboard (resizeOnFullScreen) فوقه يترك مربّعاً فارغاً، فيُطفأ هنا قبل تحميلها
            config = CapConfig.loadDefault(this);
            try {
                config.getPluginConfiguration("Keyboard").getConfigJSON().put("resizeOnFullScreen", false);
            } catch (Exception ignored) { }
        }
        super.onCreate(savedInstanceState);

        // الاتجاه: لا قيد في الـ manifest (Google Play: أندرويد 16 يتجاهله على اللوحيّات والقابلة
        // للطيّ وينبّه عليه). الهاتف يبقى عموديّاً من هنا كما كان، واللوحيّ يدور بحرّية.
        // configChanges يشمل orientation|screenSize، فالدوران لا يعيد إنشاء الشاشة ولا يضيع شيء.
        if (!largeScreen) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }

        // إصلاح الشريط الأسود أسفل WebView (inset مزدوج لشريط التنقّل):
        // يملأ WebView الشاشة كاملة (edge-to-edge) فلا يبقى شريط أسود/أبيض.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // الشاشات الكبيرة (أقصر ضلع 600dp فأكثر): adjustPan يزيح النافذة فوق الحشو، فلا إزاحة هنا.
        // الهواتف (Note 9) تبقى على adjustPan والإضافة — docs/fixes/android-webview-black-input.md
        if (imeByPadding) {
            getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        }

        // شاشة الافتتاح تُشغَّل من أندرويد فوق الصفحة (NativeSplash)
        NativeSplash.show(this, this.bridge, this::applyWindowBackground);

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

            // تفعيل/إيقاف تقليب الصفحات بأزرار الصوت (شاشة قابلة للتقليب، الإعداد مفعّل، لا تلاوة)
            @JavascriptInterface
            public void setVolumeNav(final boolean enabled) {
                volumeNav = enabled;
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
        if (windowBackground == null || NativeSplash.isShowing()) return;
        int color = windowBackground;
        getWindow().getDecorView().setBackgroundColor(color);
        // اللوحيّ: الحشو تحت WebView يظهر لحظةً أثناء صعود لوحة المفاتيح، ولونه من الثيم (#f4f6f8)
        if (imeByPadding && bridge != null && bridge.getWebView().getParent() instanceof android.view.View) {
            ((android.view.View) bridge.getWebView().getParent()).setBackgroundColor(color);
        }
        boolean dark = isDarkColor(color);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(!dark);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(!dark);
    }

    // رفع الصوت = الصفحة التالية، خفضه = السابقة (اختيار المالك). الإمساك يكرّر متسارعاً،
    // ورفع الإصبع يُبتلع أيضاً فلا يظهر شريط الصوت
    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        int code = event.getKeyCode();
        boolean volumeKey = code == android.view.KeyEvent.KEYCODE_VOLUME_DOWN || code == android.view.KeyEvent.KEYCODE_VOLUME_UP;
        if (volumeNav && volumeKey && bridge != null) {
            long now = android.os.SystemClock.uptimeMillis();
            boolean first = event.getRepeatCount() == 0;
            if (first) volumeRepeatStep = 0;
            long gap = Math.max(50, Math.round(250 * Math.pow(0.82, volumeRepeatStep)));
            if (event.getAction() == android.view.KeyEvent.ACTION_DOWN && (first || now - lastVolumeNavAt >= gap)) {
                if (!first) volumeRepeatStep++;
                lastVolumeNavAt = now;
                String dir = code == android.view.KeyEvent.KEYCODE_VOLUME_UP ? "next" : "prev";
                bridge.triggerWindowJSEvent("volumeNav", "{\"dir\":\"" + dir + "\"}");
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
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
