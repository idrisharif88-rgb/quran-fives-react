import { shortHijri } from '../../utils/hijriShort';
import './HomeFooter.css';

/**
 * السطر الأخير في الشاشة الرئيسية: شارة الحساب يميناً (children) والتاريخ الهجري يساراً.
 * التاريخ نصّ لا زرّ — كان دائرة بين الأزرار تشبهها ولا تفعل شيئاً.
 * بلا حساب يبقى التاريخ وحده في مكانه.
 * «II» داخل <bdi>: لولاه لصار «II 48» مقطعاً لاتينياً واحداً فيُقرأ «48 II».
 */
export default function HomeFooter({ hijri, children }) {
  const date = shortHijri(hijri);
  return (
    <div className="home-footer" dir="rtl">
      {children}
      {date && (
        <span className="home-footer-date">
          {date.weekday} {date.day} {date.month}{date.ordinal && <> <bdi>{date.ordinal}</bdi></>} {date.year}
        </span>
      )}
    </div>
  );
}
