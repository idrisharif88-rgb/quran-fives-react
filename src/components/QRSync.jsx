import React, { useState, useEffect, Component } from 'react';
import QRCode from 'react-qr-code';
import { Html5Qrcode } from 'html5-qrcode';

// معالجة مشكلة توافق استيراد مكتبة QR مع خادم Vite
const SafeQRCode = typeof QRCode === 'function' ? QRCode : (QRCode && QRCode.default ? QRCode.default : null);

// دالة لتشغيل صوت رنين (Beep) عند التقاط الكود بنجاح
const playSuccessBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(880, now, 0.1);
    playNote(1175, now + 0.15, 0.15);
  } catch (e) {}
};

const QRSync = ({ appState, onRestore, onClose }) => {
  const [mode, setMode] = useState(null); // يبدأ بدون وضع محدد لانتظار اختيار المستخدم
  const [error, setError] = useState('');
  const [isCameraStarted, setIsCameraStarted] = useState(false);

  // تجهيز الحالة الأساسية للتطبيق في كائن مصغر لتقليل حجم الـ QR
  let payload = '{}';
  try {
    const rawData = {
      v: 1, // رقم الإصدار لتتبع التحديثات مستقبلاً
      c: appState?.currentIndex || 0,
      p: appState?.currentPageIndex || 0,
      s: appState?.starredIndices ? Array.from(appState.starredIndices) : [],
      sp: appState?.starredPages ? Array.from(appState.starredPages) : [],
      n: appState?.nightCounters || [],
      qw: appState?.quranicWondersNotes || []
    };
    // تغليف النص لحماية الحروف العربية من التشوه عند المسح
    payload = encodeURIComponent(JSON.stringify(rawData));
  } catch (err) {
    console.error("Error formatting QR data:", err);
  }

  // Effect لطلب الصلاحية فقط عند الدخول لوضع المسح
  useEffect(() => {
    if (mode === 'scan') {
      if (window.AndroidApp && window.AndroidApp.requestCameraPermission) {
        window.AndroidApp.requestCameraPermission();
      }
    } else {
      setIsCameraStarted(false); // إعادة تعيين الكاميرا عند الخروج من وضع المسح
    }
  }, [mode]);

  // Effect لتشغيل الكاميرا فقط بعد موافقة المستخدم وضغطه على الزر
  useEffect(() => {
    let scanner = null;
    let isMounted = true;
    if (mode === 'scan' && isCameraStarted) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        try {
          scanner = new Html5Qrcode("qr-reader");
          
          scanner.start(
            { facingMode: "environment" },
            { fps: 15 }, // إزالة المربع المقيد لتتمكن الكاميرا من قراءة الشاشة بالكامل وبسرعة أعلى
            (decodedText) => {
              try {
                // فك التشفير لحماية اللغة العربية، مع دعم التوافقية للرموز القديمة
                let parsedText = decodedText;
                try {
                  parsedText = decodeURIComponent(decodedText);
                } catch (e) {}
                
                const data = JSON.parse(parsedText);
                if (data.v === 1) {
                  playSuccessBeep(); // 🎵 تشغيل صوت النجاح
                  if (scanner) {
                    scanner.stop().then(() => {
                      scanner.clear();
                      onRestore(data);
                    }).catch(() => onRestore(data));
                  } else {
                    onRestore(data);
                  }
                } else {
                  if (isMounted) setError('رمز QR غير صالح أو إصدار قديم.');
                }
              } catch (err) {
                // تجاهل أخطاء القراءة الناتجة عن تشوه الإطارات من الشاشة واستمرار المسح بصمت
              }
            },
            () => { /* نتجاهل أخطاء المسح المستمرة هنا */ }
          ).catch((err) => {
            console.error("Camera start error:", err);
            if (isMounted) setError('تعذر فتح الكاميرا، يرجى التأكد من إعطاء الصلاحية.');
          });
        } catch (e) {
          console.error("Scanner Error:", e);
          if (isMounted) setError('تعذر تهيئة الكاميرا.');
        }
      }, 100);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scanner) {
          try {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      };
    }
  // تم إزالة onRestore وإضافة isCameraStarted لمنع إعادة تشغيل الكاميرا مع وميض التطبيق
  }, [mode, isCameraStarted]);

  return (
    <div className="audio-settings-overlay" dir="rtl" style={{ zIndex: 10000 }}>
      <div className="audio-settings-card" style={{ maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="audio-settings-title">مزامنة الحالة عبر QR</h2>

        <div className="surah-count-mode-switch" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button type="button" className={`khmasiyat-quiz-btn secondary ${mode === 'generate' ? 'active' : ''}`} onClick={() => { setMode('generate'); setError(''); }} style={{ flex: 1 }}>
            إنشاء QR
          </button>
          <button type="button" className={`khmasiyat-quiz-btn secondary ${mode === 'scan' ? 'active' : ''}`} onClick={() => { setMode('scan'); setError(''); setIsCameraStarted(false); }} style={{ flex: 1 }}>
            مسح QR
          </button>
        </div>

        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px 15px', background: 'var(--app-surface-2)', borderRadius: '8px', border: '1px solid var(--app-border)' }}>
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--app-text)', lineHeight: '1.6', margin: 0 }}>
              اختر <strong>إنشاء QR</strong> لعرض باركود ومشاركة تقدمك مع جهاز آخر.
            </p>
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--app-text)', lineHeight: '1.6', margin: 0 }}>
              أو اختر <strong>مسح QR</strong> لفتح الكاميرا واستعادة بياناتك.
            </p>
          </div>
        )}

        {mode === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--app-muted)' }}>امسح هذا الرمز من جهاز آخر لاستعادة تقدمك والمفضلات والعدادات.</p>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
              {SafeQRCode ? (
                <SafeQRCode value={payload} size={260} level="M" />
              ) : (
                <p style={{ color: 'var(--app-danger)', fontSize: '14px' }}>يجب إعادة تشغيل الخادم (Vite) لتحميل المكتبة</p>
              )}
            </div>
          </div>
        )}

        {mode === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--app-muted)' }}>قم بتوجيه الكاميرا نحو رمز QR لاستعادة الحالة.</p>
            
            {!isCameraStarted ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', width: '100%', border: '1px solid var(--app-border)' }}>
                <p style={{ color: 'var(--app-text)', fontSize: '14px', textAlign: 'center', margin: 0, lineHeight: '1.6' }}>
                  إذا ظهرت لك رسالة تطلب الإذن باستخدام الكاميرا، <br/>يرجى <strong>الموافقة عليها</strong> أولاً.
                </p>
                <button type="button" className="khmasiyat-quiz-btn" onClick={() => setIsCameraStarted(true)} style={{ width: '100%' }}>
                  فتح الكاميرا للمسح
                </button>
              </div>
            ) : (
              <>
                <div id="qr-reader" style={{ width: '100%', maxWidth: '300px', background: 'white', color: 'black', borderRadius: '8px', overflow: 'hidden' }}></div>
                {error && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px', width: '100%' }}>
                    <p style={{ color: 'var(--app-danger)', fontSize: '14px', textAlign: 'center', margin: 0 }}>{error}</p>
                    <button type="button" className="khmasiyat-quiz-btn secondary" onClick={() => { setIsCameraStarted(false); setError(''); }}>إعادة المحاولة</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="audio-settings-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose} style={{ width: '100%' }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
};


// إضافة حماية موضعية (Local Error Boundary) لعرض سبب الخطأ في نافذة صغيرة بدلاً من الشاشة الحمراء
class QRSyncWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.toString() };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="audio-settings-overlay" dir="rtl" style={{ zIndex: 10000 }}>
          <div className="audio-settings-card" style={{ maxWidth: '400px' }}>
            <h2 className="audio-settings-title" style={{color: 'var(--app-danger)'}}>خطأ في المكون</h2>
            <p style={{fontSize: '14px', color: 'black', direction: 'ltr', textAlign: 'left', background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflowX: 'auto'}}>{this.state.errorMsg}</p>
            <button type="button" className="khmasiyat-quiz-btn secondary" onClick={this.props.onClose} style={{ width: '100%', marginTop: '20px' }}>إغلاق</button>
          </div>
        </div>
      );
    }
    return <QRSync {...this.props} />;
  }
}

export default QRSyncWrapper;