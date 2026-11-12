// الطبعة المطبوعة لكل كتاب، ومجلداته في مكتبة أهل البيت (ع) — ablibrary.net — لمقابلة الصفحة.
// المفتاح بداية معرّف OpenITI (المؤلف.الكتاب). رقم المجلد 0 في OpenITI = مجلد واحد.
// رابط المكتبة يفتح المجلد لا الصفحة: أرقام روابطها فهرس المسح لا الصفحة المطبوعة.
// بيانات كل كتاب كما في «هوية الكتاب» بمكتبة أهل البيت: العنوان، المؤلف، المساهم، الناشر
const SOURCES = {
  '0329IbnYacqubKulayni.Kafi': {
    title: 'الكافي',
    author: 'الشيخ الكليني',
    contributor: 'تصحيح وتعليق: علي أكبر الغفاري',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256],
  },
  '0260ImamCaskari.Tafsir': {
    title: 'تفسير الإمام العسكري (ع)',
    author: 'المنسوب إلى الإمام العسكري (ع)',
    publisher: 'مدرسة الإمام المهدي (ع) - قم',
    ablibrary: [12394],
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

export function sourceOf(uri, vol) {
  const key = Object.keys(SOURCES).find((k) => uri?.startsWith(k + '.'));
  const s = key && SOURCES[key];
  if (!s) return { edition: null, compareUrl: null, digital: DIGITAL_SOURCE };
  const id = s.ablibrary[Math.max(0, (vol || 1) - 1)];
  // «الكافي، دار الكتب الإسلامية - طهران» — الكتاب ثم الناشر، والمجلد في رابط المكتبة
  const edition = `${s.title}، ${s.publisher}`;
  return {
    edition,
    compareUrl: id ? `https://ablibrary.net/book_content/b/${id}/1` : null,
    digital: DIGITAL_SOURCE,
  };
}
