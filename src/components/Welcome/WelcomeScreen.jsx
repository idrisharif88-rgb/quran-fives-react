import { useEffect, useState } from 'react';
import ModalDialog from '../ModalDialog';
import AccountPanel from '../AccountPanel';
import useWelcomeScreen from '../../hooks/useWelcomeScreen';
import { CONTACTS } from '../../constants/contacts';
import { BOOK_PATHS, GEM_PATH, SPLASH_NAME } from '../SplashIntro/splashContent';
import { WELCOME_FEATURES } from './welcomeFeatures';
import './WelcomeScreen.css';

// ترتيب دفتر البقالة: واتساب، اتصال، بريد
const CONTACT_ORDER = ['whatsapp', 'call', 'email'];
const WELCOME_CONTACTS = CONTACT_ORDER.map((id) => CONTACTS.find((c) => c.id === id));

/**
 * شاشة الترحيب بعد شاشة الافتتاح، لغير الداخل (مأخوذة من دفتر البقالة، اختارها المالك
 * 2026-10-25): ما التطبيق، والدخول أو حساب جديد، و«ابدأ بدون حساب»، وقنوات التواصل.
 * @param auth    ما يعيده useAccount؛ بعد الدخول تختفي الشاشة وحدها
 * @param backRef يضع فيه زرّ الرجوع: يغلق نموذج الحساب، وإلا فهو «ابدأ بدون حساب»
 */
export default function WelcomeScreen({ auth, backRef }) {
  const { open, skip } = useWelcomeScreen(Boolean(auth.account));
  const [form, setForm] = useState(null); // null | 'login' | 'register'

  useEffect(() => {
    if (!backRef || !open) return undefined;
    const back = form ? () => setForm(null) : skip;
    backRef.current = back;
    return () => { if (backRef.current === back) backRef.current = null; };
  }, [backRef, open, form, skip]);

  if (!open) return null;

  return (
    <div className="welcome-screen" dir="rtl">
      <div className="welcome-hero">
        <span className="welcome-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d={GEM_PATH} fill="#fbbf24" />
            <path d={BOOK_PATHS[0]} stroke="#fbbf24" strokeWidth="4" strokeLinejoin="round" />
            <path d={BOOK_PATHS[1]} stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </span>
        <h1>{SPLASH_NAME}</h1>
        <p>اقرأ القرآن واحفظه وراجعه خمسَ آياتٍ خمسَ آيات — يعمل بدون إنترنت.</p>
      </div>

      <div className="welcome-grid">
        {WELCOME_FEATURES.map((f) => (
          <div className="welcome-tile" key={f.title}>
            <span className="welcome-tile__ic" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d={f.icon} /></svg>
            </span>
            <b>{f.title}</b>
          </div>
        ))}
      </div>

      <div className="welcome-auth">
        <button type="button" className="welcome-btn" onClick={() => setForm('login')}>تسجيل الدخول</button>
        <button type="button" className="welcome-btn welcome-btn--outline" onClick={() => setForm('register')}>
          إنشاء حساب جديد
        </button>
        <button type="button" className="welcome-skip" onClick={skip}>ابدأ بدون حساب</button>
      </div>

      <div className="welcome-contact">
        <div className="welcome-contact__lbl">تواصل معنا</div>
        <div className="welcome-circles">
          {WELCOME_CONTACTS.map((c) => (
            <a key={c.id} className="welcome-circ" href={c.href} target="_blank" rel="noreferrer">
              <span className={`welcome-circ__ic welcome-circ__${c.id}`} aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d={c.icon} /></svg>
              </span>
              {c.label}
            </a>
          ))}
        </div>
      </div>

      <div className="welcome-foot">المطور: إدريس أحمد</div>

      {form && (
        <ModalDialog title={form === 'register' ? 'حساب جديد' : 'تسجيل الدخول'} onClose={() => setForm(null)} size="sm">
          <AccountPanel auth={auth} initialMode={form} />
        </ModalDialog>
      )}
    </div>
  );
}
