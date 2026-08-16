import './HomeButton.css';

/**
 * زرّ العودة إلى الشاشة الرئيسية، ثابت في أعلى يسار الشاشة.
 *
 * أعلى اليسار لأن التطبيق RTL: هي الزاوية التالية لا القائدة، فلا تزاحم
 * العناوين ولا أزرار الأعلى (وهي في الوسط أصلاً: justify-content: center).
 *
 * لا يظهر إلا خارج الشاشة الرئيسية — في الرئيسية لا وظيفة له، وإظهاره هناك
 * زحمة في الشاشة الأكثر استعمالاً.
 *
 * التصادم مع الأقسام المزدحمة يُحلّ بحجز المكان لا بإخفاء الزرّ: الصنف
 * .has-home-btn على .app-container يزيح ما يلتصق بالحافّة اليسرى فعلاً
 * (تروس إعدادات العدّاد) بمقدار --home-slot. راجع HomeButton.css.
 */
export default function HomeButton({ onClick }) {
  return (
    <button
      type="button"
      className="home-btn"
      onClick={onClick}
      title="الشاشة الرئيسية"
      aria-label="الشاشة الرئيسية"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3.5 10.7 12 4.2l8.5 6.5" />
        <path d="M5.9 9.7v9.5c0 .7.5 1.2 1.2 1.2h9.8c.7 0 1.2-.5 1.2-1.2V9.7" />
        <path d="M9.9 20.4v-4.7h4.2v4.7" />
      </svg>
    </button>
  );
}
