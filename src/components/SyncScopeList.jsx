import { useState } from 'react';
import './SyncScopeList.css';

// ما يُرفع مع الحساب وما يبقى على الجهاز — يطابق لقطة المزامنة في App.jsx
const SYNCED = [
  'موضع القراءة والخطوة (الخماسيات، الصفحات، بدايات ونهايات الصفحات)',
  'المثبّتات (النجوم) في كل الأوضاع',
  'التفسير على ظهر البطاقات',
  'ملاحظات «عجائب القرآن»',
  'العدّادات، وهدف الساعة وأفضل أرقامها',
  'المحفوظات (جلسات الأجزاء والأدعية)',
  'برنامج الحفظ وشيوخ التواصل',
  'إجازاتي (الإجازات وأسانيدها)',
  'تقدّم الاختبارات الخمسة',
  'المقرئ، وسرعة تشغيل التسجيلات',
  'الخطّ، والوضع الليلي، واللون',
  'ختماتي (سجلّ خاص، يُزامَن بعد الدخول إليه)',
];

const LOCAL = [
  ['ملفّات الإجازات (PDF)', 'تبقى على الجهاز الذي أُرفقت فيه'],
  ['تسجيلات الحفظ (تسجيلاتي)', 'ملفّات صوتية — مزامنتها البند 35'],
  ['التلاوات المحمّلة', 'تُحمَّل من جديد على كل جهاز'],
  ['وضع التجربة', 'تجربة على هذا الجهاز وحده'],
];

// «ما الذي يُزامَن؟» في لوحة المزامنة: قائمة تُفتح بضغطة
export default function SyncScopeList() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sync-scope" dir="rtl">
      <button type="button" className="sync-scope-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>ما الذي يُزامَن؟</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="sync-scope-body">
          <h4>يُزامَن مع حسابك</h4>
          <ul>
            {SYNCED.map((item) => <li key={item} className="is-synced">{item}</li>)}
          </ul>
          <h4>يبقى على هذا الجهاز</h4>
          <ul>
            {LOCAL.map(([item, why]) => (
              <li key={item} className="is-local">{item} <span>— {why}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
