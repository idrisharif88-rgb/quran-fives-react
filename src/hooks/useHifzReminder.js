import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  loadReminderSettings, upcomingTimes, REMINDER_TEXT, REMINDER_CHANGE_EVENT, BASE_ID, DAYS_AHEAD, REMINDER_CHANNEL,
} from '../utils/hifzReminder';

// القناة بلا نغمة محدّدة: تبدأ بصوت الإشعار في الهاتف، ويغيّرها المستخدم من إعداداتها
// (اختيار المستخدم يحفظه أندرويد، فلا تُعاد كتابته بإنشاء القناة مرة أخرى).
export const ensureReminderChannel = () => LocalNotifications.createChannel(REMINDER_CHANNEL).catch(() => {});
const ids = Array.from({ length: DAYS_AHEAD }, (_, i) => ({ id: BASE_ID + i }));

async function reschedule(todayDone) {
  await LocalNotifications.cancel({ notifications: ids }).catch(() => {});
  const { on, minutes } = loadReminderSettings();
  if (!on) return;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
  await ensureReminderChannel();
  await LocalNotifications.schedule({
    notifications: upcomingTimes(minutes, new Date(), todayDone).map((at, i) => ({
      id: BASE_ID + i,
      title: REMINDER_TEXT.title,
      body: REMINDER_TEXT.body,
      channelId: REMINDER_CHANNEL.id,
      schedule: { at, allowWhileIdle: true },
      extra: { open: 'hifz' },
    })),
  });
}

/**
 * يجدول تذكير الحفظ ويعيد جدولته: عند الفتح، وتغيير الإعداد، وإتمام وِرد اليوم.
 * الضغط على الإشعار يفتح شاشة الحفظ (onOpen). على الهاتف فقط.
 */
export default function useHifzReminder({ hasProgram, todayDone, onOpen }) {
  const openRef = useRef(onOpen);
  useEffect(() => { openRef.current = onOpen; }, [onOpen]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const run = () => { reschedule(hasProgram && todayDone).catch(() => {}); };
    run();
    window.addEventListener(REMINDER_CHANGE_EVENT, run);
    return () => window.removeEventListener(REMINDER_CHANGE_EVENT, run);
  }, [hasProgram, todayDone]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const handle = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      if (action?.notification?.extra?.open === 'hifz') openRef.current?.();
    });
    return () => { handle.then((h) => h.remove()).catch(() => {}); };
  }, []);
}
