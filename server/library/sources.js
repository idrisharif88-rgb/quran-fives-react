// الطبعة المطبوعة لكل كتاب، ومجلداته في مكتبة أهل البيت (ع) — ablibrary.net — لمقابلة الصفحة.
// المفتاح بداية معرّف OpenITI (المؤلف.الكتاب). رقم المجلد 0 في OpenITI = مجلد واحد.
// رقم الصفحة في رابط المكتبة فهرس المسح لا الصفحة المطبوعة: الفرق (shift) صفحات المقدمة قبل الصفحة 1،
// قيس لكل مجلد في ثلاث نقاط (أول/وسط/آخر) في 2026-11-12. رقم واحد = فرق ثابت؛ [[من صفحة، فرق]…] = فرق يتغيّر.
// بيانات كل كتاب كما في «هوية الكتاب» بمكتبة أهل البيت: العنوان، المؤلف، المساهم، الناشر
const SOURCES = {
  '0329IbnYacqubKulayni.Kafi': {
    title: 'الكافي',
    author: 'الشيخ الكليني',
    contributor: 'تصحيح وتعليق: علي أكبر الغفاري',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256],
    shift: [48, 0, 4, 0, 0, 0, 0, 24],
  },
  '0260ImamCaskari.Tafsir': {
    title: 'تفسير الإمام العسكري (ع)',
    author: 'المنسوب إلى الإمام العسكري (ع)',
    publisher: 'مدرسة الإمام المهدي (ع) - قم',
    ablibrary: [12394],
    shift: [[[1, 8], [587, 10]]], // الصفحة 586 تشغل ثلاث صفحات مسح
  },
  '0085SulaymIbnQaysHilali.KitabSulaym': {
    title: 'كتاب سليم بن قيس الهلالي',
    publisher: 'دليل ما',
    ablibrary: [5576],
  },
  '0381IbnBabawayhSaduq.CuyunAkhbarRida': {
    title: 'عيون أخبار الرضا (ع)',
    publisher: 'مؤسسة الأعلمي للمطبوعات - بيروت',
    ablibrary: [5048, 5047],
  },
  '0320IbnMascudCayyashi.Tafsir': {
    title: 'تفسير العياشي',
    publisher: 'المكتبة العلمية الإسلامية - طهران',
    ablibrary: [1655, 1656],
    shift: [7, 0],
  },
  '0406SharifRadi.NahjBalagha': {
    title: 'نهج البلاغة',
    author: 'خطب الإمام علي (ع)',
    contributor: 'شرح: الشيخ محمد عبده',
    publisher: 'دار الذخائر - قم',
    ablibrary: [4737, 4738, 4739, 4740],
  },
};

export const DIGITAL_SOURCE = 'OpenITI';

const shiftAt = (shift, page) => (Array.isArray(shift)
  ? shift.reduce((acc, [from, s]) => (page >= from ? s : acc), 0)
  : shift || 0);

export function sourceOf(uri, vol, page) {
  const key = Object.keys(SOURCES).find((k) => uri?.startsWith(k + '.'));
  const s = key && SOURCES[key];
  if (!s) return { edition: null, compareUrl: null, digital: DIGITAL_SOURCE };
  const i = Math.max(0, (vol || 1) - 1);
  const id = s.ablibrary[i];
  const at = page ? page + shiftAt(s.shift?.[i], page) : 1;
  // «الكافي، دار الكتب الإسلامية - طهران» — الكتاب ثم الناشر، والمجلد في رابط المكتبة
  const edition = `${s.title}، ${s.publisher}`;
  return {
    edition,
    compareUrl: id ? `https://ablibrary.net/book_content/b/${id}/${at}` : null,
    digital: DIGITAL_SOURCE,
  };
}
