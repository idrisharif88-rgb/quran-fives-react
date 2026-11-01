import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// النص مع موضع الآية: يبقى مفهوماً حيث يُلصق أو يُرسل
export const noteShareText = (surahName, ayah, note) => `${surahName} ${ayah}\n${note}`;

function copyWithSelection(text) {
  const box = document.createElement('textarea');
  box.value = text;
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  const done = document.execCommand('copy');
  box.remove();
  return done;
}

// يعيد true إن وصل النص إلى الحافظة
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

// قائمة المشاركة في أندرويد، أو Web Share في المتصفح. يعيد false إن لم تتوفّر مشاركة.
// إلغاء المستخدم للقائمة ليس فشلاً.
export async function shareText(text, title) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text }).catch(() => {});
    return true;
  }
  if (!navigator.share) return false;
  await navigator.share({ title, text }).catch(() => {});
  return true;
}
