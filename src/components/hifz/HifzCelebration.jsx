// تنبيه إتمام اليوم: يظهر مرة واحدة حين تُنجَز كل مهام الخط الزمني
const SPARKS = Array.from({ length: 18 }, (_, i) => i);

export default function HifzCelebration({ memorized, onClose }) {
  return (
    <div className="hifz-celebration" onClick={onClose} role="dialog" aria-label="أتممت يومك">
      <div className="hifz-celebration-sparks" aria-hidden="true">
        {SPARKS.map((i) => <span key={i} style={{ '--i': i }} />)}
      </div>
      <div className="hifz-celebration-card" onClick={(e) => e.stopPropagation()}>
        <div className="hifz-celebration-star" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </div>
        <h2>أتممت يومك</h2>
        <p className="hifz-celebration-count"><strong>{memorized}</strong> آية محفوظة</p>
        <p className="hifz-celebration-note">بارك الله فيك وثبّتك</p>
        <button type="button" className="hifz-btn primary" onClick={onClose}>الحمد لله</button>
      </div>
    </div>
  );
}
