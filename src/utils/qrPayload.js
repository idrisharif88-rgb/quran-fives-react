// حمولة رمز QR: موضع القراءة والمثبّتات فقط، بترميز مضغوط.
// الرمز القديم (v1) كان يحمل JSON كاملاً بالعدادات والملاحظات والختمات في base64،
// فيخرج رمزاً كثيف المربّعات يصعب مسحه. الصيغة الجديدة أرقام فقط:
//   QF2|step|index|pageIndex|stars|starredPages|starredPageEnds
// كل قائمة مرتّبة ومخزّنة كفروقات بالأساس 36 مفصولة بنقطة.

const PREFIX = 'QF2';

const toNumbers = (list) => Array.from(list || [])
  .filter((n) => Number.isInteger(n) && n >= 0)
  .sort((a, b) => a - b);

function packList(list) {
  let prev = 0;
  return toNumbers(list).map((n) => {
    const delta = n - prev;
    prev = n;
    return delta.toString(36);
  }).join('.');
}

function unpackList(text) {
  if (!text) return [];
  let prev = 0;
  return text.split('.').map((part) => {
    const delta = parseInt(part, 36);
    if (!Number.isInteger(delta) || delta < 0) throw new Error('bad list');
    prev += delta;
    return prev;
  });
}

const packInt = (n) => (Number.isInteger(n) && n >= 0 ? n : 0).toString(36);

function unpackInt(text) {
  const n = parseInt(text, 36);
  if (!Number.isInteger(n) || n < 0) throw new Error('bad number');
  return n;
}

export function encodeQrPayload(appState) {
  return [
    PREFIX,
    packInt(appState?.stepSize ?? 5),
    packInt(appState?.currentIndex),
    packInt(appState?.currentPageIndex),
    packList(appState?.starredIndices),
    packList(appState?.starredPages),
    packList(appState?.starredPageEnds),
  ].join('|');
}

// base64 ← نص UTF-8 (صيغة الرموز القديمة)
function base64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function decodeLegacy(text) {
  const attempts = [
    () => base64ToUtf8(text),
    () => decodeURIComponent(text),
    () => text,
  ];
  for (const attempt of attempts) {
    try {
      const data = JSON.parse(attempt());
      if (data && data.v === 1) return data;
    } catch { /* نجرّب الصيغة التالية */ }
  }
  return null;
}

// يعيد كائن الاستعادة { st, c, p, s, sp, spe, ... } أو null إن لم يكن الرمز من التطبيق
export function decodeQrPayload(text) {
  if (typeof text !== 'string') return null;
  if (text.startsWith(PREFIX + '|')) {
    const parts = text.split('|');
    if (parts.length !== 7) return null;
    try {
      return {
        st: unpackInt(parts[1]),
        c: unpackInt(parts[2]),
        p: unpackInt(parts[3]),
        s: unpackList(parts[4]),
        sp: unpackList(parts[5]),
        spe: unpackList(parts[6]),
      };
    } catch {
      return null;
    }
  }
  return decodeLegacy(text);
}
