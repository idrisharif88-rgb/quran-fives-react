// قارئ mARkdown الخاص بـ OpenITI. لا يعيد التقسيم: ينقل علاماته كما هي.
//   ### |  عنوان      ← باب (عدد | = المستوى)
//   # نص / ~~ تكملة   ← بداية فقرة / سطر مكمل لها
//   PageV01P030 أو # PageV01P030 ← نهاية الصفحة 30 من المجلد 1 (العلامة بعد نص الصفحة لا قبله)
//   #META# حقل :: قيمة ← بيانات الكتاب
const PAGE = /^(?:#\s*)?PageV(\d+)P(\d+)\s*$/;
const HEADING = /^###\s*(\|+)\s*(.*)$/;

export function cleanTitle(t) {
  return t.replace(/[()*]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseMeta(lines) {
  const meta = {};
  for (const l of lines) {
    const m = l.match(/^#META#\s*([\w.]+)\s*::\s*(.*)$/);
    if (m && m[2].trim() !== 'NODATA' && m[2].trim() !== 'NOTGIVEN') meta[m[1]] = m[2].trim();
  }
  return meta;
}

// يعيد { meta, chapters:[{id,parent,level,title}], pages:[{id,vol,page}], passages:[{chapter,page,text}] }
export function parseOpenITI(raw) {
  const lines = raw.split(/\r?\n/);
  const end = lines.findIndex((l) => l.startsWith('#META#Header#End#'));
  const meta = parseMeta(lines.slice(0, end < 0 ? 0 : end));
  const chapters = [];
  const pages = [];
  const passages = [];
  const stack = []; // أبواب مفتوحة بحسب المستوى
  let seen = 0; // علامات الصفحات قبل الموضع الحالي: النص يقع في الصفحة التي تُغلقها العلامة التالية
  let cur = null; // الفقرة الجارية

  // معالم ms0001 علامات ترقيم داخلية في OpenITI، لا تُعرض للقارئ
  const flush = () => {
    const text = cur ? cur.text.replace(/\s*\bms\d+\b/g, '').replace(/\s{2,}/g, ' ').trim() : '';
    if (text) passages.push({ chapter: cur.chapter, page: cur.page, text });
    cur = null;
  };

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim()) continue;

    const pm = line.match(PAGE);
    if (pm) {
      // علامة الصفحة لا تقطع الفقرة: تبدأ فقرة جديدة بعدها فقط إذا بدأ سطر «#»
      pages.push({ id: pages.length + 1, vol: +pm[1], page: +pm[2] });
      seen = pages.length;
      continue;
    }

    const hm = line.match(HEADING);
    if (hm) {
      flush();
      const level = hm[1].length;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const ch = {
        id: chapters.length + 1,
        parent: stack.length ? stack[stack.length - 1].id : null,
        level,
        title: cleanTitle(hm[2]) || 'مقدمة',
      };
      chapters.push(ch);
      stack.push(ch);
      continue;
    }

    const chapter = stack.length ? stack[stack.length - 1].id : null;
    if (line.startsWith('~~')) {
      if (cur) cur.text += ' ' + line.slice(2).trim();
      else cur = { chapter, page: seen + 1, text: line.slice(2).trim() };
    } else if (line.startsWith('#')) {
      flush();
      cur = { chapter, page: seen + 1, text: line.replace(/^#\s*/, '') };
    }
    // أي سطر آخر (وسوم غير معروفة) يُتجاهل
  }
  flush();
  // نص بعد آخر علامة (آخر صفحة بلا علامة تغلقها) يُنسب إلى آخر صفحة معروفة
  for (const ps of passages) ps.page = pages.length ? Math.min(ps.page, pages.length) : null;
  return { meta, chapters, pages, passages };
}
