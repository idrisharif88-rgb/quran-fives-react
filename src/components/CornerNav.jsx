import { useMemo, useState } from 'react';
import { SURAH_METADATA } from '../data/quranConstants';
import { STEP_SIZES, STEP_LABELS, groupCountOfSurah } from '../utils/stepNavigation';
import ModalDialog from './ModalDialog';
import './CornerNav.css';

// تجريد التشكيل وهمزات الوصل/القطع كي يطابق البحث «الاعراف» و«الأعراف»
const normalizeArabic = (text) => text
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .trim();

/**
 * أدوات التنقّل في صفّ أسفل البطاقة، بثلاثة مواضع:
 *   يسار : رقم الآية (من TextDisplay)
 *   وسط  : زرّ اختيار السورة
 *   يمين : رقم خطوة التنقّل، بحجم رقم الآية نفسه
 *
 * تُعاد كـ Fragment لتصير أبناءً مباشرين لشبكة الصفّ. أمّا القوائم فتُعرض في
 * ModalDialog: نافذة حاجبة تمنع التفاعل مع بقيّة التطبيق حتى يختار المستخدم،
 * وتَعرض عبر portal إلى <body> لأن .verse-card تقصّ ما يتجاوزها.
 */
export default function CornerNav({ surahNumber, surahName, step, onSelectSurah, onSelectStep }) {
  const [openPanel, setOpenPanel] = useState(null); // 'surah' | 'step' | null
  const [query, setQuery] = useState('');

  const surahs = useMemo(() => SURAH_METADATA.map(s => ({
    ...s,
    groups: groupCountOfSurah(s.id, step),
  })), [step]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return surahs;
    return surahs.filter(s => normalizeArabic(s.name).includes(q) || String(s.id) === q);
  }, [surahs, query]);

  const close = () => setOpenPanel(null);

  const togglePanel = (panel) => {
    setOpenPanel(prev => (prev === panel ? null : panel));
    setQuery('');
  };

  const stepSheet = (
    <ModalDialog title="خطوة التنقّل" onClose={close} size="sm" className="corner-nav-modal">
      <div className="corner-nav-steps">
        {STEP_SIZES.map(size => (
          <button
            key={size}
            type="button"
            className={`corner-nav-step${size === step ? ' is-active' : ''}`}
            onClick={() => { onSelectStep(size); close(); }}
          >
            <span className="corner-nav-step-num" dir="ltr">{size}</span>
            <span className="corner-nav-step-label">
              {size === 1 ? 'آية بعد آية' : `كل ${size} آيات — ${STEP_LABELS[size]}`}
            </span>
          </button>
        ))}
      </div>
    </ModalDialog>
  );

  const surahSheet = (
    <ModalDialog title="الانتقال إلى سورة" onClose={close} className="corner-nav-modal">
      <input
        type="text"
        className="corner-nav-search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ابحث باسم السورة أو رقمها"
        autoComplete="off"
      />
      <div className="corner-nav-list">
        {filtered.length === 0 && (
          <div className="corner-nav-empty">لا توجد سورة بهذا الاسم</div>
        )}
        {filtered.map(s => (
          <button
            key={s.id}
            type="button"
            disabled={s.groups === 0}
            className={`corner-nav-item${s.id === surahNumber ? ' is-current' : ''}`}
            onClick={() => { onSelectSurah(s.id); close(); }}
            title={s.groups === 0 ? `سورة ${s.name} أقصر من ${step} آيات` : `أوّل ${STEP_LABELS[step]} في سورة ${s.name}`}
          >
            <span className="corner-nav-item-num" dir="ltr">{s.id}</span>
            <span className="corner-nav-item-name">{s.name}</span>
            <span className="corner-nav-item-count" dir="ltr">{s.groups || '—'}</span>
          </button>
        ))}
      </div>
    </ModalDialog>
  );

  return (
    <>
      {/* وسط الصفّ: اختيار السورة */}
      <button
        type="button"
        className="corner-nav-surah-btn"
        onClick={() => togglePanel('surah')}
        aria-expanded={openPanel === 'surah'}
        title="الانتقال إلى سورة"
        dir="rtl"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
          <path d="M4 4h6a3 3 0 0 1 2 .8A3 3 0 0 1 14 4h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-5.5a1.5 1.5 0 0 0-1.4 1 1 1 0 0 1-1.9 0 1.5 1.5 0 0 0-1.4-1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm7 3.4A1.6 1.6 0 0 0 9.6 6H5v11h4.6c.5 0 1 .1 1.4.4V7.4Zm2 10c.4-.3.9-.4 1.4-.4H19V6h-4.6A1.6 1.6 0 0 0 13 7.4v10Z" />
        </svg>
        <span className="corner-nav-surah-name">{surahName}</span>
      </button>

      {/* يمين الصفّ: رقم الخطوة، بحجم رقم الآية في اليسار */}
      <button
        type="button"
        className="corner-nav-step-chip"
        onClick={() => togglePanel('step')}
        aria-expanded={openPanel === 'step'}
        title={`خطوة التنقّل: ${STEP_LABELS[step]}`}
      >
        <span className="corner-nav-step-digit" dir="ltr">{step}</span>
        <span className="corner-nav-step-caption">خطوة</span>
      </button>

      {openPanel === 'step' && stepSheet}
      {openPanel === 'surah' && surahSheet}
    </>
  );
}
