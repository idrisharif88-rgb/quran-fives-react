package com.shoaib.quranfives;

import android.app.Activity;
import android.content.res.Resources;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.res.ResourcesCompat;
import androidx.core.view.WindowCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.WebViewListener;

/**
 * شاشة الافتتاح، يشغّلها أندرويد نفسه فوق الصفحة من أوّل إطار.
 *
 * الصفحة تحتاج وقتاً لتبدأ؛ لو رسمت الحركة بنفسها لظهرت أيقونة أندرويد أولاً ثم أيقونة
 * الصفحة، مع ومضة سوداء بينهما. هنا تُحمَّل الصفحة خلف الغطاء دون أن تُرى، ولا يرحل
 * الغطاء إلا بعد انتهاء الحركة ورسم الصفحة معاً.
 *
 * الإطار الأوّل يطابق نافذة الإقلاع (launch_fives.xml): الأخضر، وبلاطة المصحف في المنتصف.
 * التوقيتات والنصوص هي نفسها في نسخة الويب (src/components/SplashIntro) التي اختارها المالك.
 */
final class NativeSplash {

    private static final int GREEN = 0xFF0E5340;
    private static final int GOLD = 0xFFFBBF24;
    private static final long SHOW_MS = 3000;    // الأيقونة، ثم الاسم والشعار والخطّ
    private static final long GIVE_UP_MS = 8000; // صفحة لم تُبلغ برسمها قطّ

    private static boolean showing = false;

    private final Activity activity;
    private final Bridge bridge;
    private final Runnable onDone;
    private FrameLayout overlay;
    private boolean pageReady = false;
    private boolean shown = false;
    private boolean leaving = false;

    private NativeSplash(Activity activity, Bridge bridge, Runnable onDone) {
        this.activity = activity;
        this.bridge = bridge;
        this.onDone = onDone;
    }

    /** onDone: بعد رحيل الغطاء (لإعادة لون أيقونات أشرطة النظام حسب خلفية التطبيق). */
    static void show(Activity activity, Bridge bridge, Runnable onDone) {
        new NativeSplash(activity, bridge, onDone).start();
    }

    /** ما دام الغطاء ظاهراً تبقى أيقونات أشرطة النظام فاتحة فوق الأخضر. */
    static boolean isShowing() {
        return showing;
    }

    private void start() {
        showing = true;
        WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView())
                .setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView())
                .setAppearanceLightNavigationBars(false);

        ViewGroup content = activity.findViewById(android.R.id.content);
        overlay = build();
        content.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                // إطارات قليلة أخرى، لتكون الصفحة مرسومة كلّها حين تنكشف
                view.postDelayed(() -> { pageReady = true; maybeLeave(); }, 200);
            }
        });
        overlay.postDelayed(() -> { shown = true; maybeLeave(); }, SHOW_MS);
        overlay.postDelayed(() -> { pageReady = true; shown = true; maybeLeave(); }, GIVE_UP_MS);
    }

    private void maybeLeave() {
        if (leaving || !pageReady || !shown) return;
        leaving = true;
        overlay.animate().alpha(0f).setDuration(350).withEndAction(() -> {
            ViewGroup parent = (ViewGroup) overlay.getParent();
            if (parent != null) parent.removeView(overlay);
            showing = false;
            if (onDone != null) onDone.run();
        }).start();
    }

    // ---- رسم الصورة ----

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, activity.getResources().getDisplayMetrics()));
    }

    private Typeface font(int id) {
        try {
            Typeface t = ResourcesCompat.getFont(activity, id);
            return t != null ? t : Typeface.DEFAULT_BOLD;
        } catch (Resources.NotFoundException e) {
            return Typeface.DEFAULT_BOLD;
        }
    }

    private static GradientDrawable rounded(int color, float radiusPx) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radiusPx);
        return d;
    }

    // خلفية الثيم (android:background) تُطبَّق على كل عنصر بلا خلفية، فتُمسح صراحةً
    private <T extends View> T clear(T v) {
        v.setBackground(null);
        return v;
    }

    private TextView text(String value, float sizeDp, int color, Typeface face) {
        TextView t = clear(new TextView(activity));
        t.setText(value);
        t.setTextSize(TypedValue.COMPLEX_UNIT_DIP, sizeDp);
        t.setTextColor(color);
        t.setTypeface(face);
        t.setIncludeFontPadding(false);
        return t;
    }

    private ImageView image(int drawable) {
        ImageView v = clear(new ImageView(activity));
        v.setImageResource(drawable);
        return v;
    }

    private FrameLayout build() {
        Typeface extraBold = font(R.font.tajawal_extrabold);
        Typeface bold = font(R.font.tajawal_bold);

        FrameLayout root = new FrameLayout(activity);
        root.setBackgroundColor(GREEN);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setClickable(true); // لا يُلمس شيء خلفه ما دامت تعمل

        // البلاطة والمصحف والمعيّن — بحجم نافذة الإقلاع ومكانها
        FrameLayout tile = new FrameLayout(activity);
        tile.setBackground(rounded(0x1AFFFFFF, dp(26)));
        ImageView book = image(R.drawable.splash_book);
        ImageView gem = image(R.drawable.splash_gem);
        tile.addView(book, new FrameLayout.LayoutParams(dp(62), dp(62), Gravity.CENTER));
        tile.addView(gem, new FrameLayout.LayoutParams(dp(62), dp(62), Gravity.CENTER));
        root.addView(tile, new FrameLayout.LayoutParams(dp(96), dp(96), Gravity.CENTER));

        // الاسم، والشعار تحته، وخطّ يمتلئ — تبدأ على بعد 66dp تحت المنتصف
        LinearLayout below = clear(new LinearLayout(activity));
        below.setOrientation(LinearLayout.VERTICAL);
        below.setGravity(Gravity.CENTER_HORIZONTAL);
        TextView name = text("خماسيات", 36, Color.WHITE, extraBold);
        TextView tag = text("القرآن خمسَ آياتٍ… خمسَ آيات", 15, 0xCCFFFFFF, bold);
        FrameLayout bar = new FrameLayout(activity);
        bar.setBackground(rounded(0x2EFFFFFF, dp(2)));
        View fill = new View(activity);
        fill.setBackground(rounded(GOLD, dp(2)));
        bar.addView(fill, new FrameLayout.LayoutParams(dp(120), dp(3)));
        below.addView(name, wrap(0));
        below.addView(tag, wrap(dp(12)));
        LinearLayout.LayoutParams barLp = new LinearLayout.LayoutParams(dp(120), dp(3));
        barLp.topMargin = dp(12);
        below.addView(bar, barLp);
        root.addView(below, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.TOP));
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) ->
                below.setY((b - t) / 2f + dp(66)));

        // ---- التسلسل (بالمللي ثانية من الفتح) ----
        tile.animate().scaleX(1.12f).scaleY(1.12f).setStartDelay(150).setDuration(320)
                .withEndAction(() -> tile.animate().scaleX(1f).scaleY(1f).setDuration(480)
                        .setInterpolator(new OvershootInterpolator(2f)).start())
                .start();

        // المعيّن ظاهر من البداية (كما في نافذة الإقلاع)، ثم يلمع دورةً حول مركزه
        gem.setPivotX(dp(31));
        gem.setPivotY(dp(62 * 10f / 64f)); // مركز المعيّن: (32, 10) في شبكة 64
        gem.animate().scaleX(1.45f).scaleY(1.45f).rotation(90f).setStartDelay(350).setDuration(450)
                .withEndAction(() -> gem.animate().scaleX(1f).scaleY(1f).rotation(180f)
                        .setDuration(450).start())
                .start();

        name.setAlpha(0f);
        name.setTranslationY(dp(14));
        name.animate().alpha(1f).translationY(0f).setStartDelay(900).setDuration(550)
                .setInterpolator(new DecelerateInterpolator()).start();

        tag.setAlpha(0f);
        tag.animate().alpha(1f).setStartDelay(1300).setDuration(500).start();

        bar.setAlpha(0f);
        bar.animate().alpha(1f).setStartDelay(1400).setDuration(250).start();
        fill.setPivotX(dp(120)); // يمتلئ من اليمين إلى اليسار، كما تُقرأ العربية
        fill.setScaleX(0f);
        fill.animate().scaleX(1f).setStartDelay(1450).setDuration(1200).start();

        return root;
    }

    private static LinearLayout.LayoutParams wrap(int topMargin) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = topMargin;
        return lp;
    }
}
