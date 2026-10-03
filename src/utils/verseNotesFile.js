import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// ملاحظات الآيات (التفسير المكتوب باليد): كائن { "سورة:آية": "نص" }.
// المفتاح سورة:آية مطلق — لا يتأثّر بخطوة التنقّل ولا بوضع العرض.
const KEY_PATTERN = /^(\d{1,3}):(\d{1,3})$/;

export const noteKey = (verse) => `${verse.s}:${verse.a}`;

// يُبقي المفاتيح الصحيحة والنصوص غير الفارغة فقط
export function sanitizeNotes(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  Object.entries(raw).forEach(([key, value]) => {
    const match = KEY_PATTERN.exec(key);
    if (!match || typeof value !== 'string') return;
    const surah = Number(match[1]);
    const text = value.trim();
    if (surah < 1 || surah > 114 || Number(match[2]) < 1 || !text) return;
    clean[`${surah}:${Number(match[2])}`] = text;
  });
  return clean;
}

// يقرأ ملف JSON ويعيد الملاحظات الصالحة فيه؛ يرمي خطأ إن لم يكن الملف JSON
export async function readNotesFile(file) {
  const text = await file.text();
  return sanitizeNotes(JSON.parse(text));
}

// ترتيب المصحف (سورة ثم آية) كي يُقرأ الملف ويُحرَّر باليد بسهولة
function sortedNotes(notes) {
  const order = (key) => key.split(':').map(Number);
  return Object.fromEntries(
    Object.entries(notes).sort(([a], [b]) => {
      const [sa, aa] = order(a);
      const [sb, ab] = order(b);
      return sa - sb || aa - ab;
    })
  );
}

// تصدير الملاحظات ملف JSON: ورقة المشاركة على أندرويد، وتنزيل في المتصفح
export async function exportNotesFile(notes) {
  const json = JSON.stringify(sortedNotes(notes), null, 2);
  const name = 'quran-notes.json';

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    await Share.share({ title: 'ملاحظات الآيات', files: [uri] }).catch(() => {});
    return;
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
