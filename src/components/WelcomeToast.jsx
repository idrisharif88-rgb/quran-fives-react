import { useState } from 'react';
import './WelcomeToast.css';

/**
 * ترحيب بالمستخدم باسمه على الشاشة الرئيسية: عند فتح التطبيق وهو داخل، وعند
 * الدخول بحساب. يؤكّد له أنّه داخل وبأيّ حساب، ثمّ يختفي وحده.
 * الظهور والاختفاء بحركة CSS واحدة؛ المفتاح (key) يعيدها عند كل دخول جديد.
 */
export default function WelcomeToast({ account }) {
  const user = account?.user;
  // الحساب الذي فُتح به التطبيق: ترحيبه «بعودتك»، وما عداه دخول جديد
  const [openedAs] = useState(user);

  if (!user) return null;

  const name = account.name || user;
  const text = user === openedAs ? `مرحباً بعودتك، ${name}` : `مرحباً، ${name} — تمّ الدخول`;

  return (
    <div key={user} className="welcome-toast" dir="rtl" role="status">
      {text}
    </div>
  );
}
