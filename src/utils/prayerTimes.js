// أوقات الصلاة — الطريقة الجعفرية (تقويم الصائغ الشيعي)
// صنعاء افتراضياً، مع إمكانية تغيير المدينة.

export const CITIES = [
  { id: 'sanaa', name: 'صنعاء', lat: 15.3694, lng: 44.191, tz: 3 },
  { id: 'aden', name: 'عدن', lat: 12.7855, lng: 45.0187, tz: 3 },
  { id: 'taiz', name: 'تعز', lat: 13.5795, lng: 44.0209, tz: 3 },
  { id: 'hodeidah', name: 'الحديدة', lat: 14.7978, lng: 42.9522, tz: 3 },
  { id: 'makkah', name: 'مكة المكرمة', lat: 21.3891, lng: 39.8579, tz: 3 },
  { id: 'madinah', name: 'المدينة المنورة', lat: 24.5247, lng: 39.5692, tz: 3 },
  { id: 'qatif', name: 'القطيف', lat: 26.5569, lng: 50.0119, tz: 3 },
  { id: 'dammam', name: 'الدمام', lat: 26.4207, lng: 50.0888, tz: 3 },
];

export const DEFAULT_CITY_ID = 'sanaa';

export const getCity = (id) => CITIES.find((c) => c.id === id) || CITIES[0];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function fixAngle(a) {
  const x = a - 360 * Math.floor(a / 360);
  return x < 0 ? x + 360 : x;
}
function fixHour(a) {
  const x = a - 24 * Math.floor(a / 24);
  return x < 0 ? x + 24 : x;
}
const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);
const tan = (d) => Math.tan(d * D2R);
const asin = (x) => Math.asin(x) * R2D;
const acos = (x) => Math.acos(x) * R2D;
const atan = (x) => Math.atan(x) * R2D;

function julianDate(date) {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const d = date.getDate() + date.getHours() / 24 + date.getMinutes() / 1440 + date.getSeconds() / 86400;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const dec = asin(sin(e) * sin(L));
  const RA = atan(cos(e) * sin(L) / cos(L)) / 15;
  const eqTime = q / 15 - fixHour(RA);
  return { dec, eqTime };
}

function midDay(tz, lng, eqTime) {
  return fixHour(12 + tz - lng / 15 - eqTime);
}

function sunAngleTime(angle, time, lat, dec, direction) {
  const cosH = (sin(angle) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec));
  if (cosH > 1 || cosH < -1) return NaN;
  const H = (direction * acos(cosH)) / 15;
  return time + H;
}

function asrAngle(lat, dec, factor) {
  // الظل = (factor) × طول الجسم — الجعفرية تستعمل 1 (الظل مثله)
  return -atan(1 / (factor + tan(Math.abs(lat - dec))));
}

// يعيد أوقات الصلاة بالساعات العشرية (كسور اليوم)
export function computePrayerTimes(date, city) {
  const { lat, lng, tz } = city;
  const jd = julianDate(date) - lng / (15 * 24);
  const { dec, eqTime } = sunPosition(jd);
  const noon = midDay(tz, lng, eqTime);
  return {
    fajr: sunAngleTime(-16, noon, lat, dec, -1),     // الفجر
    sunrise: sunAngleTime(-0.833, noon, lat, dec, -1), // الشروق
    dhuhr: noon,                                      // الظهر
    asr: sunAngleTime(asrAngle(lat, dec, 1), noon, lat, dec, 1),
    maghrib: sunAngleTime(-4, noon, lat, dec, 1),     // المغرب (زوال الحمرة)
    isha: sunAngleTime(-14, noon, lat, dec, 1),       // العشاء
    sunset: sunAngleTime(-0.833, noon, lat, dec, 1),  // الغروب
  };
}

// منتصف الليل الشرعي: منتصف المسافة بين الغروب وشروق اليوم التالي
export function midnightTime(p) {
  const night = (24 - p.sunset) + p.sunrise;
  return fixHour(p.sunset + night / 2);
}

// تنسيق ساعة (كسور اليوم) إلى «س:د ص/م»
export function formatTime(hours) {
  if (!Number.isFinite(hours)) return '—';
  const h = fixHour(hours);
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const hour12 = hh % 12 || 12;
  const period = hh >= 12 ? 'م' : 'ص';
  return `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
}

// قائمة الأوقات مرتّبة (للّوحة) مع منتصف الليل
export function prayerList(p) {
  return [
    { id: 'fajr', label: 'الفجر', time: p.fajr },
    { id: 'sunrise', label: 'الشروق', time: p.sunrise },
    { id: 'dhuhr', label: 'الظهر', time: p.dhuhr },
    { id: 'asr', label: 'العصر', time: p.asr },
    { id: 'maghrib', label: 'المغرب', time: p.maghrib },
    { id: 'isha', label: 'العشاء', time: p.isha },
    { id: 'midnight', label: 'منتصف الليل', time: midnightTime(p) },
  ];
}

// الصلاة التالية بعد اللحظة الحالية
export function nextPrayer(p, date) {
  const now = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const sorted = prayerList(p).sort((a, b) => a.time - b.time);
  for (const item of sorted) {
    if (item.time > now) return item;
  }
  return { id: 'fajr', label: 'الفجر', time: p.fajr };
}

function toMinutes(hours) {
  if (!Number.isFinite(hours)) return 0;
  return Math.round(fixHour(hours) * 60);
}

export const BUCKETS = [
  { id: 'night', label: 'الليل' },
  { id: 'fajr', label: 'الفجر' },
  { id: 'dhuhr', label: 'الظهر' },
  { id: 'asr', label: 'العصر' },
  { id: 'maghrib', label: 'المغرب' },
  { id: 'isha', label: 'العشاء' },
];

// الفترة الزمنية (الجرّة) التي تنتمي إليها لحظة معيّنة
export function timeBucket(date, city) {
  const p = computePrayerTimes(date, city);
  const now = date.getHours() * 60 + date.getMinutes();
  const fajr = toMinutes(p.fajr);
  const dhuhr = toMinutes(p.dhuhr);
  const asr = toMinutes(p.asr);
  const maghrib = toMinutes(p.maghrib);
  const isha = toMinutes(p.isha);
  if (now < fajr) return 'night';
  if (now < dhuhr) return 'fajr';
  if (now < asr) return 'dhuhr';
  if (now < maghrib) return 'asr';
  if (now < isha) return 'maghrib';
  return 'isha';
}
