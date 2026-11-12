import { Capacitor } from '@capacitor/core';
import { contactUrl, contactIntentUrl } from './hifzContacts';

/**
 * يفتح محادثة الشيخ في واتساب أو تلجرام.
 * - موقع الويب على أندرويد: رابط intent في الصفحة نفسها — يفتح التطبيق ولا يترك تبويباً أبيض.
 * - التطبيق (APK) وبقية المتصفّحات: كما كان، رابط https في تبويب جديد.
 */
export function openContact(contact, message) {
  const androidBrowser = !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent);
  if (androidBrowser) {
    window.location.href = contactIntentUrl(contact, message);
    return;
  }
  window.open(contactUrl(contact, message), '_blank');
}
