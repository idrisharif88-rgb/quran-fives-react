// ─── إجازاتي: الإجازات وأسانيدها ───
// إجازة: { id, type, mojeez, chain: [اسم…], notes: { رقم الاسم: نصّ }, createdAt }
// notes ظهر بطاقة الاسم: مولده ووفاته وما شاء الحافظ.
// السند من شيخ الحافظ (المُجيز، رقم 1) صعوداً حتى الإمام علي رضي الله عنه.

// أرقام بطاقات السند (من 1): «آحاد» كل الأسماء، و«خماسيات» الأسماء 5، 10، 15… وحدها
export const SANAD_STEP = 5;
export function sanadNumbers(count, mode) {
  const step = mode === 'fives' ? SANAD_STEP : 1;
  const numbers = [];
  for (let n = step; n <= count; n += step) numbers.push(n);
  return numbers;
}

export const newIjazaId = () => `ij-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const text = (v) => (typeof v === 'string' ? v.trim() : '');

// ما يُقرأ من التخزين أو المزامنة: يُسقط التالف ولا يرمي
export function sanitizeIjazat(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((ij) => ij && typeof ij === 'object' && typeof ij.id === 'string')
    .map((ij) => {
      const chain = Array.isArray(ij.chain) ? ij.chain.map(text) : [];
      const notes = {};
      if (ij.notes && typeof ij.notes === 'object') {
        for (const [n, note] of Object.entries(ij.notes)) {
          const number = Number(n);
          if (Number.isInteger(number) && number >= 1 && number <= chain.length && text(note)) notes[number] = text(note);
        }
      }
      return { id: ij.id, type: text(ij.type), mojeez: text(ij.mojeez), chain, notes, createdAt: ij.createdAt || null };
    });
}
