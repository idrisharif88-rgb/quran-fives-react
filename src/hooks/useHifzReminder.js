import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  loadReminderSettings, upcomingTimes, REMINDER_TEXT, REMINDER_CHANGE_EVENT, BASE_ID, DAYS_AHEAD, REMINDER_CHANNEL,
} from '../utils/hifzReminder';

// القناة بلا نغمة محدّدة: تبدأ بصوت الإشعار في الهاتف، ويغيّرها المستخدم من إعداداتها
// (اختيار المستخدم يحفظه أندرويد، فلا تُعاد كتابته بإنشاء القناة مرة أخرى).
export const ensureReminderChannel = () => LocalNotifications.createChannel(REMINDER_CHANNEL).catch(() => {});
const ids = Array.from({ length: DAYS_AHEAD }, (_, i) => ({ id: BASE_ID + i }));

async function reschedule(enabled, todayDone) {
  await LocalNotifications.cancel({ notifications: ids }).catch(() => {});
  const { on, minutes } = loadReminderSettings();
  if (!enabled || !on) return;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
  await ensureReminderChannel();
  await LocalNotifications.schedule({
    notifications: upcomingTimes(minutes, new Date(), todayDone).map((at, i) => ({
      id: BASE_ID + i,
      title: REMINDER_TEXT.title,
      body: REMINDER_TEXT.body,
      channelId: REMINDER_CHANNEL.id,
      schedule: { at, allowWhileIdle: true },
    })),
  });
}

/**
 * يجدول تذكير الحفظ ويعيد جدولته: عند الفتح، وتغيير الإعداد، وإتمام وِرد اليوم.
 * enabled: قسم الحفظ وحده؛ لغيره تُلغى المواعيد. الضغط على الإشعار يفتح التطبيق، وشاشته الحفظ. على الهاتف فقط.
 */
export default function useHifzReminder({ enabled, hasProgram, todayDone }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const run = () => { reschedule(enabled, hasProgram && todayDone).catch(() => {}); };
    run();
    window.addEventListener(REMINDER_CHANGE_EVENT, run);
    return () => window.removeEventListener(REMINDER_CHANGE_EVENT, run);
  }, [enabled, hasProgram, todayDone]);
}
