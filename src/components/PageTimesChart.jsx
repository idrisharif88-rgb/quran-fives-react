import { useState, useRef, useLayoutEffect } from 'react';
import { formatSeconds } from '../utils/sessions';
import { chartSlots } from '../utils/pageTimesChart';
import './PageTimesChart.css';

// الألوان قيم ثابتة في خصائص SVG لا CSS: «مشاركة» تصوّر البطاقة بـ html2canvas، وهو يرسم SVG بلا أنماط
// الصفحة ولا يحلّ var(). فتُقرأ ألوان السمة (أخضر/ذهبي × نهار/ليل) من .app-container عند العرض.
const FALLBACK = { bar: '#0F6E56', over: '#c2410c', empty: '#e5e7eb', axis: '#6b7280' };
const TOKENS = { bar: '--app-accent-ink', over: '--app-danger', empty: '--app-border', axis: '--app-muted' };
// خطّ الدقيقة ذهبي في كل السمات: 3.2:1 على السطح النهاري، وأعلى ليلاً
const GOLD = '#b8860b';
const MINUTE = 60;

function themeColors(el) {
  const style = getComputedStyle(el);
  const out = {};
  for (const [name, token] of Object.entries(TOKENS)) out[name] = style.getPropertyValue(token).trim() || FALLBACK[name];
  return out;
}

const W = 340, H = 150;
const PAD = { l: 30, t: 6, b: 20 };   // يسار: شريط ساعة الدقيقة
const GAP = 4;
const RADIUS = 3;

// عمود مستدير الرأس، قاعدته مستوية على خطّ الصفر
function barPath(x, y, w, h) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * مخطط أزمنة الصفحات، هادئ (اختيار المالك 2026-10-25): عمود لكل صفحة من الجزء (غير المقروءة
 * خانة فارغة)، بلون واحد وما فوق الهدف بلون ثانٍ، بلا شبكة ولا خطّي الهدف والمتوسط. خطّ ذهبي
 * سميك واحد عند الدقيقة يعبر الأعمدة، بساعته على اليسار. لمس عمود يعرض زمنه تحت المخطط.
 */
export default function PageTimesChart({ pageTimes, target }) {
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);
  const [C, setColors] = useState(FALLBACK);
  useLayoutEffect(() => { if (ref.current) setColors(themeColors(ref.current)); }, []);
  const slots = chartSlots(pageTimes);
  if (!slots.length) return null;

  const read = slots.filter((s) => s.seconds !== null);
  // الدقيقة داخل المحور دائماً، ولو كانت الصفحات كلّها أسرع منها
  const max = Math.max(...read.map((s) => s.seconds), MINUTE);
  const innerH = H - PAD.t - PAD.b;
  const base = PAD.t + innerH;
  const slot = (W - PAD.l) / slots.length;
  const barW = Math.max(2, slot - GAP);
  const xOf = (i) => PAD.l + i * slot + GAP / 2;
  const yOf = (s) => base - (s / max) * innerH;
  const yMinute = yOf(MINUTE);
  const isOver = (s) => target > 0 && s > target;
  const pick = slots.find((s) => s.page === selected && s.seconds !== null);

  return (
    <figure className="ptc" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ptc-svg" role="img" aria-label="زمن كل صفحة" style={{ direction: 'ltr' }}>
        <g transform={`translate(4 ${yMinute - 8})`} fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5V8l2.4 1.6" />
        </g>
        <text x="12" y={yMinute + 19} textAnchor="middle" fontSize="9" fontWeight="800" fill={GOLD}>{formatSeconds(MINUTE)}</text>

        {slots.map((s, i) => {
          const x = xOf(i);
          const dim = pick && pick.page !== s.page;
          const label = (s.page - slots[0].page) % 5 === 0 || i === slots.length - 1;
          return (
            <g key={s.page} opacity={dim ? 0.3 : 1}>
              {s.seconds === null
                ? <rect x={x} y={base - 3} width={barW} height={3} rx="1.5" fill={C.empty} />
                : <path d={barPath(x, yOf(s.seconds), barW, Math.max(2, base - yOf(s.seconds)))} fill={isOver(s.seconds) ? C.over : C.bar} />}
              {label && (
                <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize="10" fontWeight={pick?.page === s.page ? 800 : 500} fill={C.axis}>{s.page}</text>
              )}
            </g>
          );
        })}

        <line x1={21} x2={W} y1={yMinute} y2={yMinute} stroke={GOLD} strokeWidth="3" strokeLinecap="round" />

        {/* مساحة اللمس: الخانة كلّها بارتفاع المخطط، لا العمود وحده */}
        {slots.map((s, i) => (
          <rect
            key={`hit${s.page}`}
            x={PAD.l + i * slot}
            y={0}
            width={slot}
            height={H}
            fill="transparent"
            onClick={() => setSelected((p) => (p === s.page || s.seconds === null ? null : s.page))}
          />
        ))}
      </svg>

      <figcaption className="ptc-caption" dir="rtl">
        {pick ? (
          <span className="ptc-pick">
            صفحة {pick.page} · <strong>{formatSeconds(pick.seconds)}</strong>
            {isOver(pick.seconds) && <em> فوق الهدف بـ {formatSeconds(pick.seconds - target)}</em>}
          </span>
        ) : 'المس عموداً لترى زمنه'}
      </figcaption>
    </figure>
  );
}
