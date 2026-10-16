import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadReminderSettings, saveReminderSettings, shiftMinutes, timeText, STEP_MINUTES } from '../../utils/hifzReminder';
import { REMINDER_TONES } from '../../constants/hifzReminderTones';
import './HifzReminderSettings.css';

/**
 * «تذكير يومي»: مفتاح تشغيل، ووقت يُضبط بـ − و + (ربع ساعة)، ونغمة يختارها الحافظ
 * (تُسمع عند اختيارها). الإشعار على الهاتف وحده.
 */
export default function HifzReminderSettings() {
  const [settings, setSettings] = useState(loadReminderSettings);
  const [message, setMessage] = useState('');
  const native = Capacitor.isNativePlatform();

  const update = (next) => { setSettings(next); saveReminderSettings(next); };

  const chooseTone = (tone) => {
    update({ ...settings, tone: tone.id });
    if (tone.preview) new Audio(tone.preview).play().catch(() => {});
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
      {(settings.on || !native) && (
        <div className="hifz-reminder-tones" role="radiogroup" aria-label="نغمة التذكير">
          {REMINDER_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={settings.tone === tone.id}
              className={`hifz-reminder-tone ${settings.tone === tone.id ? 'selected' : ''}`.trim()}
              onClick={() => chooseTone(tone)}
            >
              {tone.preview && <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
              {tone.label}
            </button>
          ))}
        </div>
      )}
      {!native && <p className="hifz-reminder-msg">الإشعار متاح في تطبيق الهاتف</p>}
      {message && <p className="hifz-reminder-msg" role="alert">{message}</p>}
    </section>
  );
}
