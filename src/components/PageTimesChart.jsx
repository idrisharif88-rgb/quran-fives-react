import { useState, useRef, useLayoutEffect, useId } from 'react';
import { formatSeconds } from '../utils/sessions';
import { chartSlots, axisFor } from '../utils/pageTimesChart';
import './PageTimesChart.css';

// الألوان قيم ثابتة في خصائص SVG لا CSS: «مشاركة» تصوّر البطاقة بـ html2canvas، وهو يرسم SVG بلا أنماط
// الصفحة ولا يحلّ var(). فتُقرأ ألوان السمة (أخضر/ذهبي × نهار/ليل) من .app-container عند العرض.
// العمود فوق الهدف مخطّط مائلاً فوق لونه: الأحمر قريب من لون السمة البرتقالية، وليلاً يلتبس بالأخضر
// على عمى الألوان (ΔE 4) — الخطوط وخطّ الهدف يقولان «فوق الهدف» بلا لون.
const FALLBACK = {
  bar: '#0F6E56', over: '#b91c1c', empty: '#e5e7eb', grid: '#eef0f2', base: '#cbd5e1', axis: '#6b7280', avg: '#475569', surface: '#ffffff',
};
const TOKENS = {
  bar: '--app-accent-ink', over: '--app-danger', empty: '--app-border', grid: '--app-border', base: '--app-border-strong', axis: '--app-muted', avg: '--app-text', surface: '--app-surface',
};

function themeColors(el) {
  const style = getComputedStyle(el);
  const out = {};
  for (const [name, token] of Object.entries(TOKENS)) out[name] = style.getPropertyValue(token).trim() || FALLBACK[name];
  return out;
}

const W = 340, H = 196;
const PAD = { l: 34, r: 8, t: 14, b: 22 };
const GAP = 2;          // فاصل رفيع بين الأعمدة — يفصلها ولا يقطّع المخطط
const RADIUS = 4;

// عمود مستدير الرأس، قاعدته مستوية على خطّ الصفر
function barPath(x, y, w, h) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * مخطط أزمنة الصفحات: عمود لكل صفحة من البطاقة كلّها (غير المقروءة خانة فارغة)، الأحمر فوق الهدف،
 * وخطّا الهدف والمتوسط. لمس عمود يعرض زمنه تحت المخطط.
 */
export default function PageTimesChart({ pageTimes, target, average }) {
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);
  const hatch = `ptc-over-${useId().replace(/:/g, '')}`;
  const [C, setColors] = useState(FALLBACK);
  useLayoutEffect(() => { if (ref.current) setColors(themeColors(ref.current)); }, []);
  const slots = chartSlots(pageTimes);
  if (!slots.length) return null;

  const read = slots.filter((s) => s.seconds !== null);
  const maxSec = Math.max(...read.map((s) => s.seconds), 1);
  // خطّ الهدف يدخل المحور ما دام قريباً من الأعمدة؛ هدف بعيد جداً كان سيسحقها
  const showTarget = target > 0 && target <= maxSec * 1.5;
  const axis = axisFor(Math.max(maxSec, showTarget ? target : 0));

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const base = PAD.t + innerH;
  const slot = innerW / slots.length;
  const barW = Math.max(2, slot - GAP);
  const xOf = (i) => PAD.l + i * slot + GAP / 2;
  const yOf = (s) => base - (s / axis.max) * innerH;
  const labelEvery = slots.length <= 13 ? 1 : 5;
  const isOver = (s) => target > 0 && s > target;
  const pick = slots.find((s) => s.page === selected && s.seconds !== null);

  return (
    <figure className="ptc" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ptc-svg" role="img" aria-label="زمن كل صفحة" style={{ direction: 'ltr' }}>
        <defs>
          <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill={C.over} />
            <line x1="0" y1="0" x2="0" y2="5" stroke={C.surface} strokeWidth="1.6" strokeOpacity="0.55" />
          </pattern>
        </defs>
        {axis.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yOf(t)} y2={yOf(t)} stroke={t === 0 ? C.base : C.grid} strokeWidth="1" />
            <text x={PAD.l - 5} y={yOf(t) + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill={C.axis}>{formatSeconds(t)}</text>
          </g>
        ))}

        {slots.map((s, i) => {
          const x = xOf(i);
          const dim = pick && pick.page !== s.page;
          const label = (s.page - slots[0].page) % labelEvery === 0 || i === slots.length - 1;
          return (
            <g key={s.page} opacity={dim ? 0.35 : 1}>
              {s.seconds === null
                ? <rect x={x} y={base - 3} width={barW} height={3} rx="1.5" fill={C.empty} />
                : <path d={barPath(x, yOf(s.seconds), barW, Math.max(2, base - yOf(s.seconds)))} fill={isOver(s.seconds) ? `url(#${hatch})` : C.bar} />}
              {label && (
                <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="9.5" fontWeight={pick?.page === s.page ? 800 : 500} fill={s.seconds === null ? C.base : C.axis}>{s.page}</text>
              )}
            </g>
          );
        })}

        {average > 0 && (
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(average)} y2={yOf(average)} stroke={C.avg} strokeWidth="1" strokeDasharray="2 3" />
        )}
        {showTarget && (
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(target)} y2={yOf(target)} stroke={C.over} strokeWidth="1.25" strokeDasharray="6 4" />
        )}

        {/* مساحة اللمس: الخانة كلّها بارتفاع المخطط، لا العمود وحده */}
        {slots.map((s, i) => (
          <rect
            key={`hit${s.page}`}
            x={PAD.l + i * slot}
            y={PAD.t}
            width={slot}
            height={innerH + PAD.b}
            fill="transparent"
            onClick={() => setSelected((p) => (p === s.page || s.seconds === null ? null : s.page))}
          />
        ))}
      </svg>

      <figcaption className="ptc-caption" dir="rtl">
        {pick ? (
          <span className="ptc-pick">
            صفحة {pick.page} · <strong>{formatSeconds(pick.seconds)}</strong>
            {target > 0 && (
              <em className={isOver(pick.seconds) ? 'is-over' : ''}>
                {isOver(pick.seconds) ? ` فوق الهدف بـ ${formatSeconds(pick.seconds - target)}` : ' ضمن الهدف'}
              </em>
            )}
          </span>
        ) : (
          <>
            <span className="ptc-key"><i style={{ background: C.bar }} />ضمن الهدف</span>
            <span className="ptc-key"><i style={{ background: `repeating-linear-gradient(45deg, ${C.over} 0 3px, ${C.surface} 3px 4.5px)` }} />فوقه</span>
            {showTarget && <span className="ptc-key"><i className="ptc-line" style={{ borderColor: C.over }} />الهدف {formatSeconds(target)}</span>}
            {average > 0 && <span className="ptc-key"><i className="ptc-line dotted" style={{ borderColor: C.avg }} />المتوسط</span>}
          </>
        )}
      </figcaption>
    </figure>
  );
}
