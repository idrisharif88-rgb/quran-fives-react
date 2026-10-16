import { loadStoredState, saveStoredState } from './persistence';
import { REMINDER_TONES, DEFAULT_TONE } from '../constants/hifzReminderTones';

// ─── تذكير الحفظ اليومي ───
// إعداد على هذا الجهاز: { on, minutes, tone } — minutes دقائق منذ منتصف الليل (الافتراضي 20:00)،
// tone معرّف النغمة (hifzReminderTones.js).
// يُجدول التذكير للأيام السبعة القادمة، ويُعاد جدوله عند فتح التطبيق وعند إتمام ورد اليوم.
export const REMINDER_KEY = 'quran-fives-hifz-reminder-daily-v1';
export const REMINDER_CHANGE_EVENT = 'quran-fives-hifz-reminder-change';
export const DEFAULT_MINUTES = 20 * 60;
export const STEP_MINUTES = 15;
export const DAYS_AHEAD = 7;
export const BASE_ID = 9100;   // معرّفات الإشعارات 9100–9106

export const REMINDER_TEXT = {
  title: 'حان موعد وِردك اليوم 🌿',
  body: 'افتح الحفظ وأكمل آياتك',
};

export function loadReminderSettings() {
  const saved = loadStoredState(REMINDER_KEY);
  const minutes = Number(saved?.minutes);
  return {
    on: saved?.on === true,
    minutes: Number.isInteger(minutes) && minutes >= 0 && minutes < 24 * 60 ? minutes : DEFAULT_MINUTES,
    tone: REMINDER_TONES.some((t) => t.id === saved?.tone) ? saved.tone : DEFAULT_TONE,
  };
}

export function saveReminderSettings(settings) {
  saveStoredState(REMINDER_KEY, settings);
  window.dispatchEvent(new Event(REMINDER_CHANGE_EVENT));
}

export const shiftMinutes = (minutes, delta) => (((minutes + delta) % 1440) + 1440) % 1440;

// «8:00 م»
export function timeText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
}

/**
 * مواعيد التذكير القادمة. يُتخطّى اليوم إن انقضى موعده أو أُتمّ وِرده.
 * @returns [Date] بالترتيب، حتى DAYS_AHEAD موعداً
 */
export function upcomingTimes(minutes, now = new Date(), todayDone = false) {
  const times = [];
  for (let d = 0; times.length < DAYS_AHEAD && d <= DAYS_AHEAD; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (d === 0 && (todayDone || at <= now)) continue;
    times.push(at);
  }
  return times;
}
