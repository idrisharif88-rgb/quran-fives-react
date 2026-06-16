import { useRef, useState, useEffect } from 'react';
import { QURAN_VERSES } from '../data/quranVerses';
import { SURAH_METADATA } from '../data/quranConstants';
import { getSecureRandomIntInclusive } from '../utils/quizUtils';

const TOTAL = QURAN_VERSES.length; // 6236
const CX = 100, CY = 100, R = 86; // مركز ونصف قطر الحلقة
const toArabic = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// نقطة على المحيط عند زاوية θ (من الأعلى، باتجاه عقارب الساعة)
const pointOnRing = (theta, r = R) => {
  const rad = (theta * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
};

export default function QuranFal({ onClose }) {
  const [pointer, setPointer] = useState(0);     // زاوية المؤشّر المعروضة
  const [arcAngle, setArcAngle] = useState(0);   // زاوية القوس الممتلئ
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const rotationRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // اختيار عشوائي حقيقي (crypto) على كل الآيات، ثم يستقرّ المؤشّر عند زاوية الآية المختارة
  const pick = () => {
    if (spinning) return;
    const targetIndex = getSecureRandomIntInclusive(0, TOTAL - 1);
    const theta = (targetIndex / TOTAL) * 360;
    const start = rotationRef.current;
    const delta = 720 + ((((theta - (start % 360)) % 360) + 360) % 360); // دورتان + المسافة للهدف
    const end = start + delta;
    const dur = 1200;
    const t0 = performance.now();
    setSpinning(true);
    setSelectedIndex(null);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const v = start + delta * easeOutCubic(p);
      setPointer(v);
      setArcAngle(((v % 360) + 360) % 360);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rotationRef.current = end;
        setArcAngle(theta);
        setSpinning(false);
        setSelectedIndex(targetIndex);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const verse = selectedIndex !== null ? QURAN_VERSES[selectedIndex] : null;
  const surahName = verse ? (SURAH_METADATA[verse.s - 1]?.name || '') : '';

  // مسار القوس الممتلئ من الأعلى حتى الزاوية الحالية
  const arcEnd = pointOnRing(arcAngle || 0.0001);
  const largeArc = arcAngle > 180 ? 1 : 0;
  const arcPath = `M ${CX} ${CY - R} A ${R} ${R} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`;
  const knob = pointOnRing(pointer);

  return (
    <div className="audio-settings-overlay" dir="rtl" style={{ zIndex: 10000 }}>
      <div className="audio-settings-card" style={{ maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', textAlign: 'center' }}>
        <h2 className="audio-settings-title">فأل القرآن</h2>
        <p style={{ fontSize: '14px', color: 'var(--app-muted)', margin: '0 0 16px', lineHeight: 1.7 }}>
          اضغط في أيّ موضع لتدور الحلقة، فتظهر لك آية من كتاب الله — وتفاءل خيراً.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg
            viewBox="0 0 200 200"
            width="280"
            height="280"
            style={{
              maxWidth: '78vw',
              cursor: spinning ? 'default' : 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              outline: 'none',
            }}
            onClick={pick}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* مسار الحلقة */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--app-border)" strokeWidth="10" />
            {/* القوس الممتلئ */}
            {arcAngle > 0 && (
              <path d={arcPath} fill="none" stroke="var(--app-accent)" strokeWidth="10" strokeLinecap="round" />
            )}
            {/* النقطة الدائرة على المحيط تُظهر الدوران وموضع الاستقرار */}
            <circle cx={knob.x} cy={knob.y} r="8" fill="var(--app-accent)" stroke="var(--app-surface)" strokeWidth="2.5" />
            {/* النص المركزي */}
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="13" fill="var(--app-muted)" fontFamily="inherit">
              {verse ? 'سورة' : 'اضغط'}
            </text>
            <text x={CX} y={CY + 16} textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--app-accent)" fontFamily="inherit">
              {verse ? surahName : `${toArabic(TOTAL)} آية`}
            </text>
          </svg>
        </div>

        {verse && (
          <div style={{
            marginTop: '18px', padding: '18px', borderRadius: '14px',
            border: '2px solid var(--app-accent)', background: 'var(--app-surface-2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--app-accent)', marginBottom: '12px' }}>
              سورة {surahName} — آية {toArabic(verse.a)}
            </div>
            <div style={{
              fontSize: '24px', lineHeight: 2, color: 'var(--app-text)',
              fontFamily: "'Amiri', serif", maxHeight: '34vh', overflowY: 'auto',
            }}>
              {verse.t}
            </div>
          </div>
        )}

        <div className="audio-settings-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="khmasiyat-quiz-btn secondary" onClick={onClose} style={{ width: '100%' }}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
