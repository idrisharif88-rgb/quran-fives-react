// الطبعة المطبوعة لكل كتاب، ومجلداته في مكتبة أهل البيت (ع) — ablibrary.net — لمقابلة الصفحة.
// المفتاح بداية معرّف OpenITI (المؤلف.الكتاب). رقم المجلد 0 في OpenITI = مجلد واحد.
// رابط المكتبة يفتح المجلد لا الصفحة: أرقام روابطها فهرس المسح لا الصفحة المطبوعة.
const SOURCES = {
  '0329IbnYacqubKulayni.Kafi': {
    edition: 'الكافي، الكليني، تحقيق علي أكبر الغفاري، دار الكتب الإسلامية، طهران',
    ablibrary: [3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256],
  },
  '0260ImamCaskari.Tafsir': {
    edition: 'تفسير الإمام العسكري (ع)، مدرسة الإمام المهدي (ع)، قم، ١٤٠٩هـ',
    ablibrary: [12394],
  },
  '0406SharifRadi.NahjBalagha': {
    edition: 'نهج البلاغة، جمع الشريف الرضي، شرح الشيخ محمد عبده',
    ablibrary: [4737, 4738, 4739, 4740],
  },
};

export const DIGITAL_SOURCE = 'OpenITI';

export function sourceOf(uri, vol) {
  const key = Object.keys(SOURCES).find((k) => uri?.startsWith(k + '.'));
  const s = key && SOURCES[key];
  if (!s) return { edition: null, compareUrl: null, digital: DIGITAL_SOURCE };
  const id = s.ablibrary[Math.max(0, (vol || 1) - 1)];
  return {
    edition: s.edition,
    compareUrl: id ? `https://ablibrary.net/book_content/b/${id}/1` : null,
    digital: DIGITAL_SOURCE,
  };
}
