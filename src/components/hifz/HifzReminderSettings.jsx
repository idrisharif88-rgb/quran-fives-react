import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadReminderSettings, saveReminderSettings, shiftMinutes, timeText, STEP_MINUTES } from '../../utils/hifzReminder';
import { ensureReminderChannel } from '../../hooks/useHifzReminder';
import { REMINDER_CHANNEL } from '../../utils/hifzReminder';
import './HifzReminderSettings.css';

/**
 * «تذكير يومي»: مفتاح تشغيل، ووقت يُضبط بـ − و + (ربع ساعة)، ونغمة يختارها الحافظ من نغمات
 * هاتفه (إعدادات قناة الإشعار في أندرويد). الإشعار على الهاتف وحده.
 */
export default function HifzReminderSettings() {
  const [settings, setSettings] = useState(loadReminderSettings);
  const [message, setMessage] = useState('');
  const native = Capacitor.isNativePlatform();

  const update = (next) => { setSettings(next); saveReminderSettings(next); };

  // صفحة أندرويد لإشعار التذكير: فيها «الصوت» بنغمات الهاتف كلها
  const canPickTone = typeof window.AndroidApp?.openNotificationChannel === 'function';
  const pickTone = async () => {
    await ensureReminderChannel();
    window.AndroidApp.openNotificationChannel(REMINDER_CHANNEL.id);
  };

  const toggle = async () => {
    setMessage('');
    if (settings.on) { update({ ...settings, on: false }); return; }
    const { display } = await LocalNotifications.requestPermissions().catch(() => ({ display: 'denied' }));
    if (display !== 'granted') { setMessage('اسمح للتطبيق بالإشعارات من إعدادات الهاتف'); return; }
    update({ ...settings, on: true });
  };

  return (
    <section className="hifz-reminder">
      <div className="hifz-reminder-row">
        <span className="hifz-reminder-label">تذكير يومي بالوِرد</span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.on}
          className={`hifz-reminder-switch ${settings.on ? 'on' : ''}`.trim()}
          onClick={toggle}
          disabled={!native}
          aria-label="تذكير يومي بالوِرد"
        >
          <span />
        </button>
      </div>
      {native && settings.on && (
        <div className="hifz-reminder-row">
          <span className="hifz-reminder-label">الوقت</span>
          <div className="hifz-reminder-time">
            <button type="button" onClick={() => update({ ...settings, minutes: shiftMinutes(settings.minutes, -STEP_MINUTES) })} aria-label="أبكر">−</button>
            <bdi>{timeText(settings.minutes)}</bdi>
            <button type="button" onClick={() => update({ ...settings, minutes: shiftMinutes(settings.minutes, STEP_MINUTES) })} aria-label="أبعد">+</button>
          </div>
        </div>
      )}
      {native && settings.on && canPickTone && (
        <div className="hifz-reminder-row">
          <span className="hifz-reminder-label">النغمة</span>
          <button type="button" className="hifz-reminder-tone" onClick={pickTone}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
            اختر من نغمات هاتفك
          </button>
        </div>
      )}
      {!native && <p className="hifz-reminder-msg">الإشعار متاح في تطبيق الهاتف</p>}
      {message && <p className="hifz-reminder-msg" role="alert">{message}</p>}
    </section>
  );
}
