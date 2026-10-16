const toArabicDigits = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

export const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const dateText = (timestamp) => new Date(timestamp).toLocaleDateString('ar', { day: 'numeric', month: 'long' });

// «الصفحات ١٢–١٥» أو «الصفحة ١٢»
export const pagesText = ({ fromPage, toPage }) => (fromPage === toPage
  ? `الصفحة ${toArabicDigits(fromPage)}`
  : `الصفحات ${toArabicDigits(fromPage)}–${toArabicDigits(toPage)}`);

// عنوان المشاركة (يُعرض)، واسم الملف لاتينياً: review-p12-15-2026-10-17
export const shareTitle = (r) => `مراجعة ${pagesText(r)} — ${dateText(r.createdAt)}`;
export function shareFileName(r) {
  const d = new Date(r.createdAt);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pages = r.fromPage === r.toPage ? `p${r.fromPage}` : `p${r.fromPage}-${r.toPage}`;
  return `review-${pages}-${day}`;
}
