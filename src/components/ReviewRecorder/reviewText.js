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

// اسم الملف عند إرساله إلى المُسمِّع
export const shareName = (r) => `مراجعة ${pagesText(r)} ${dateText(r.createdAt)}`;
