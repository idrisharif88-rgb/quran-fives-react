// قارئ mARkdown الخاص بـ OpenITI. لا يعيد التقسيم: ينقل علاماته كما هي.
//   ### |  عنوان      ← باب (عدد | = المستوى)
//   # نص / ~~ تكملة   ← بداية فقرة / سطر مكمل لها
//   PageV01P030 أو # PageV01P030 ← المجلد والصفحة
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
  let page = null;
  let cur = null; // الفقرة الجارية

  const flush = () => {
    if (cur && cur.text.trim()) passages.push({ chapter: cur.chapter, page: cur.page, text: cur.text.trim() });
    cur = null;
  };

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim()) continue;

    const pm = line.match(PAGE);
    if (pm) {
      // علامة الصفحة لا تقطع الفقرة: تبدأ فقرة جديدة بعدها فقط إذا بدأ سطر «#»
      page = pages.length + 1;
      pages.push({ id: page, vol: +pm[1], page: +pm[2] });
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
      else cur = { chapter, page, text: line.slice(2).trim() };
    } else if (line.startsWith('#')) {
      flush();
      cur = { chapter, page, text: line.replace(/^#\s*/, '') };
    }
    // أي سطر آخر (وسوم غير معروفة) يُتجاهل
  }
  flush();
  return { meta, chapters, pages, passages };
}
