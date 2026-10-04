import { useState } from 'react';
import { welcomePendingFor, clearWelcome } from '../utils/syncAccount';
import './WelcomeToast.css';

/**
 * ترحيب بالمستخدم باسمه في ركن الشاشة: مرّة واحدة بعد الدخول بحساب، لا عند كل فتح
 * للتطبيق. شارة الحساب (AccountBadge) هي ما يبقى ليعرف المستخدم بأيّ حساب هو داخل.
 * الظهور والاختفاء بحركة CSS واحدة؛ نهايتها تمسح علامة الترحيب فلا يتكرّر.
 */
export default function WelcomeToast({ account }) {
  const user = account?.user;
  const [shownFor, setShownFor] = useState(null);   // الحساب الذي اكتمل ترحيبه في هذه الجلسة

  if (!user || shownFor === user || !welcomePendingFor(user)) return null;

  const finish = () => {
    clearWelcome();
    setShownFor(user);
  };

  return (
    <div key={user} className="welcome-toast" dir="rtl" role="status" onAnimationEnd={finish}>
      مرحباً، {account.name || user}
    </div>
  );
}
