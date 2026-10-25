import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SPLASH_NAME, SPLASH_TAG, BOOK_PATHS, GEM_PATH } from './splashContent';
import './SplashIntro.css';

// شاشة الافتتاح: مرّة واحدة عند كل فتح، فوق كل شيء.
//
// على الهاتف لا يرسم هذا المكوّن شيئاً: أندرويد يشغّل الحركة نفسها (NativeSplash.java)
// من أوّل إطار، لأن الصفحة تحتاج وقتاً لتبدأ، والتسليم من رسم أندرويد إلى رسم الصفحة
// كان يُظهر شعارين وومضة سوداء. هنا يزيل فقط اللوحة المؤقتة من index.html.
// الحركة أدناه هي ما يظهر في المتصفح.

const SHOW_MS = 3000; // الأيقونة، ثم الاسم والشعار والخطّ؛ بعدها يظهر التطبيق (أو شاشة الترحيب)
const FADE_MS = 350;

const NATIVE = Capacitor.isNativePlatform();

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// مرّة واحدة لكل فتح: إعادة التحميل السريع أو إعادة التركيب لا تعيدها
let played = NATIVE;

export default function SplashIntro() {
  const [phase, setPhase] = useState(played ? 'gone' : 'showing');

  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
    if (played) return undefined;
    // يُعلَّم «شُغّلت» عند الرحيل لا عند البدء: StrictMode يركّب مرّتين، والتعليم المبكر
    // كان يُلغي المؤقّتات في الأولى ويتخطّاها في الثانية، فتبقى الشاشة إلى الأبد
    const show = reducedMotion() ? 300 : SHOW_MS;
    const leave = setTimeout(() => setPhase('leaving'), show);
    const gone = setTimeout(() => { played = true; setPhase('gone'); }, show + FADE_MS);
    return () => { clearTimeout(leave); clearTimeout(gone); };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`splash-intro${phase === 'leaving' ? ' splash-intro--leaving' : ''}`} aria-hidden="true">
      <div className="splash-tile">
        <svg viewBox="0 0 64 64" fill="none">
          <path className="splash-intro__gem" d={GEM_PATH} fill="#fbbf24" />
          <path d={BOOK_PATHS[0]} stroke="#fbbf24" strokeWidth="4" strokeLinejoin="round" />
          <path d={BOOK_PATHS[1]} stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="splash-intro__below">
        <h1 className="splash-intro__name">{SPLASH_NAME}</h1>
        <p className="splash-intro__tag">{SPLASH_TAG}</p>
        <div className="splash-intro__bar"><span /></div>
      </div>
    </div>
  );
}
