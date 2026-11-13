// الطبعة المطبوعة لكل كتاب، ومجلداته في مكتبة أهل البيت (ع) — ablibrary.net — لمقابلة الصفحة.
// المفتاح بداية معرّف OpenITI (المؤلف.الكتاب). رقم المجلد 0 في OpenITI = مجلد واحد.
// رقم الصفحة في رابط المكتبة فهرس المسح لا الصفحة المطبوعة: الفرق (shift) صفحات المقدمة قبل الصفحة 1،
// قيس لكل مجلد في ثلاث نقاط (أول/وسط/آخر) في 2026-11-12. رقم واحد = فرق ثابت؛ [[من صفحة، فرق]…] = فرق يتغيّر.
// بيانات كل كتاب كما في «هوية الكتاب» بمكتبة أهل البيت: العنوان، المؤلف، المساهم، الناشر
const SOURCES = {
  '0329IbnYacqubKulayni.Kafi': {
    section: 'hadith', order: 1, by: 'الكليني',
    title: 'الكافي',
    author: 'الشيخ الكليني',
    contributor: 'تصحيح وتعليق: علي أكبر الغفاري',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256],
    shift: [48, 0, 4, 0, 0, 0, 0, 24],
  },
  '0260ImamCaskari.Tafsir': {
    section: 'tafsir', order: 1, name: 'تفسير العسكري', by: 'المنسوب إلى الإمام العسكري (ع)',
    title: 'تفسير الإمام العسكري (ع)',
    author: 'المنسوب إلى الإمام العسكري (ع)',
    publisher: 'مدرسة الإمام المهدي (ع) - قم',
    ablibrary: [12394],
    shift: [[[1, 8], [587, 10]]], // الصفحة 586 تشغل ثلاث صفحات مسح
  },
  '0085SulaymIbnQaysHilali.KitabSulaym': {
    section: 'hadith', order: 6, name: 'كتاب سليم', by: 'سليم بن قيس الهلالي',
    title: 'كتاب سليم بن قيس الهلالي',
    publisher: 'دليل ما',
    ablibrary: [5576],
  },
  '0381IbnBabawayhSaduq.CuyunAkhbarRida': {
    section: 'hadith', order: 5, name: 'عيون أخبار الرضا', by: 'الصدوق',
    title: 'عيون أخبار الرضا (ع)',
    publisher: 'مؤسسة الأعلمي للمطبوعات - بيروت',
    ablibrary: [5048, 5047],
  },
  '0320IbnMascudCayyashi.Tafsir': {
    section: 'tafsir', order: 3, by: 'العياشي',
    title: 'تفسير العياشي',
    publisher: 'المكتبة العلمية الإسلامية - طهران',
    ablibrary: [1655, 1656],
    shift: [7, 0],
  },
  '0406SharifRadi.NahjBalagha': {
    section: 'dua', order: 1, by: 'الشريف الرضي',
    title: 'نهج البلاغة',
    author: 'خطب الإمام علي (ع)',
    contributor: 'شرح: الشيخ محمد عبده',
    publisher: 'دار الذخائر - قم',
    ablibrary: [4737, 4738, 4739, 4740],
  },
  '0381IbnBabawayhSaduq.ManLaYahduruhuFaqih': {
    section: 'hadith', order: 2, by: 'الصدوق',
    title: 'من لا يحضره الفقيه',
    publisher: 'مؤسسة النشر الإسلامي - قم',
    ablibrary: [2594, 2595, 2596, 2597],
    shift: [32, 0, 0, 0],
  },
  '0460ShaykhTusi.TahdhibAhkam': {
    section: 'hadith', order: 3, by: 'الطوسي',
    title: 'تهذيب الأحكام',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [6026, 6028, 6029, 6030, 6031, 6032, 6033, 6034, 6035, 6027], // ج10 رقمه 6027 في المكتبة
    shift: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  '0460ShaykhTusi.Istibsar': {
    section: 'hadith', order: 4, by: 'الطوسي',
    title: 'الاستبصار',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [2437, 2438, 2439, 2440],
    shift: [40, 0, 0, 0],
  },
  '0329IbnIbrahimQummi.Tafsir': {
    section: 'tafsir', order: 2, name: 'تفسير القمي', by: 'علي بن إبراهيم القمي',
    title: 'تفسير القمي',
    publisher: 'مؤسسة دار الكتاب - قم',
    ablibrary: [5124, 5125],
    shift: [26, 0],
  },
  '0548IbnHasanTabarsi.TafsirMajmacBayan': {
    section: 'tafsir', order: 4, name: 'مجمع البيان', by: 'الطبرسي',
    title: 'تفسير مجمع البيان',
    publisher: 'مؤسسة الأعلمي للمطبوعات - بيروت',
    ablibrary: [3868, 3870, 3871, 3872, 3873, 3874, 3875, 3876, 3877, 3869], // ج10 رقمه 3869
  },
  '1112IbnJumcaHuwayzi.TafsirNurThaqalayn': {
    section: 'tafsir', order: 5, name: 'نور الثقلين', by: 'الحويزي',
    title: 'تفسير نور الثقلين',
    publisher: 'مؤسسة إسماعيليان - قم',
    ablibrary: [6121, 6122, 6123, 6124, 6125],
    shift: [4, 0, 0, 0, 0],
  },
  '0786ShahidAwwal.SahifaSajjadiyya': {
    section: 'dua', order: 2, by: 'الإمام زين العابدين (ع)',
    title: 'الصحيفة السجادية',
    publisher: 'مؤسسة النشر الإسلامي - قم',
    ablibrary: [5380],
    shift: [13],
  },
  '0290IbnHasanSaffar.BasairDarajat': {
    section: 'hadith', order: 7, by: 'الصفار',
    title: 'بصائر الدرجات',
    publisher: 'منشورات الأعلمي - طهران',
    ablibrary: [1944],
  },
  '0274AhmadBarqi.Mahasin': {
    section: 'hadith', order: 8, by: 'البرقي',
    title: 'المحاسن',
    publisher: 'دار الكتب الإسلامية - طهران',
    ablibrary: [3720, 3721],
    shift: [60, -294], // ج2 يكمل ترقيم ج1: صفحته المطبوعة 295 أول صفحة فيه
  },
  '0400IbnCaliHarrani.TuhafCuqul': {
    section: 'hadith', order: 9, by: 'ابن شعبة الحراني',
    title: 'تحف العقول',
    publisher: 'مؤسسة النشر الإسلامي - قم',
    ablibrary: [6129],
    shift: [11],
  },
  '0381IbnBabawayhSaduq.KamalDin': {
    section: 'ghayba', order: 1, by: 'الصدوق',
    title: 'كمال الدين وتمام النعمة',
    publisher: 'مؤسسة النشر الإسلامي - قم',
    ablibrary: [3404],
    shift: [30],
  },
  '0460ShaykhTusi.Ghayba': {
    section: 'ghayba', order: 2, name: 'الغيبة للطوسي', by: 'الطوسي',
    title: 'الغيبة',
    publisher: 'مؤسسة المعارف الإسلامية - قم',
    ablibrary: [5083],
    shift: [28],
  },
  '0401IbnAyyashJawhari.MuqtadabAthar': {
    section: 'ghayba', order: 3, by: 'ابن عياش الجوهري',
    title: 'مقتضب الأثر',
    publisher: 'مكتبة الطباطبائي - قم',
    ablibrary: [4265],
    shift: [18],
  },
  '0803BahaDinNiliNajafi.MuntakhabAnwar': {
    section: 'ghayba', order: 4, name: 'منتخب الأنوار المضيئة', by: 'النيلي النجفي',
    title: 'منتخب الأنوار المضيئة',
    publisher: 'مؤسسة الإمام الهادي (ع)',
    ablibrary: [4627],
    shift: [65],
  },
  // كتب ليست في OpenITI: تُحوَّل من Word بـ scripts/docx-to-openiti.py وتوضع في data/library/local على السيرفر
  'Local.MasharicMawt': {
    section: 'mine', order: 1, by: 'إدريس أحمد شريف',
    title: 'مشاريع الموت',
    publisher: 'نسخة المؤلف',
    ablibrary: [],
  },
};

// أقسام المكتبة بترتيب العرض
export const SECTIONS = [
  { id: 'hadith', name: 'الحديث' },
  { id: 'tafsir', name: 'التفسير' },
  { id: 'ghayba', name: 'الغيبة والمهدوية' },
  { id: 'dua', name: 'الأدعية والخطب' },
  { id: 'mine', name: 'مؤلفات' },
];

const entryOf = (uri) => {
  const key = Object.keys(SOURCES).find((k) => uri?.startsWith(k + '.'));
  return key ? SOURCES[key] : null;
};

// بيانات العرض: القسم، الاسم المختصر، المؤلف المختصر، الترتيب داخل القسم
export function bookInfo(uri, fallbackTitle) {
  const s = entryOf(uri);
  return {
    section: s?.section || 'other',
    name: s?.name || s?.title || fallbackTitle,
    by: s?.by || null,
    order: s?.order ?? 99,
  };
}

export const DIGITAL_SOURCE = 'OpenITI';

const shiftAt = (shift, page) => (Array.isArray(shift)
  ? shift.reduce((acc, [from, s]) => (page >= from ? s : acc), 0)
  : shift || 0);

export function sourceOf(uri, vol, page) {
  const s = entryOf(uri);
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
