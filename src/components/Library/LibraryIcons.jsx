// أيقونات المكتبة: خط عريض مستدير بلا إطار (أسلوب التطبيق)
const svg = (children, size = 30) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const BackIcon = () => svg(<path d="M9 5l7 7-7 7" />);
export const NextIcon = () => svg(<path d="M15 5l-7 7 7 7" />);
export const SearchIcon = () => svg(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>, 24);
export const OfflineIcon = () => svg(<><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /><path d="M3 3l18 18" /></>, 52);
// كتب على رفّ: اختيار الكتب
export const BooksIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4" width="4" height="16" rx="1.2" /><rect x="9.5" y="6" width="4" height="14" rx="1.2" /><path d="M15.6 7.4l3.7-1.2 3.9 12.6-3.7 1.2z" />
  </svg>
);
