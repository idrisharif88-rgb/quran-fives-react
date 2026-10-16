import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  loadReminderSettings, upcomingTimes, REMINDER_TEXT, REMINDER_CHANGE_EVENT, BASE_ID, DAYS_AHEAD,
} from '../utils/hifzReminder';
import { toneById } from '../constants/hifzReminderTones';

// قناة أندرويد لكل نغمة: النغمة تُثبَّت في القناة عند إنشائها أول مرة، فتغيير النغمة يعني قناة أخرى
const channelFor = (tone) => ({
  id: `hifz-reminder-${tone.id}`,
  name: `تذكير الحفظ — ${tone.label}`,
  description: 'تذكير يومي بوِرد الحفظ',
  importance: 4,
  vibration: true,
  ...(tone.file ? { sound: tone.file } : {}),
});
const ids = Array.from({ length: DAYS_AHEAD }, (_, i) => ({ id: BASE_ID + i }));

async function reschedule(todayDone) {
  await LocalNotifications.cancel({ notifications: ids }).catch(() => {});
  const { on, minutes, tone: toneId } = loadReminderSettings();
  if (!on) return;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
  const tone = toneById(toneId);
  const channel = channelFor(tone);
  await LocalNotifications.createChannel(channel).catch(() => {});
  await LocalNotifications.schedule({
    notifications: upcomingTimes(minutes, new Date(), todayDone).map((at, i) => ({
      id: BASE_ID + i,
      title: REMINDER_TEXT.title,
      body: REMINDER_TEXT.body,
      channelId: channel.id,
      ...(tone.file ? { sound: tone.file } : {}),
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
