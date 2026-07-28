# Quran Fives (Khamasiyat)

A paid Quran memorization app, live on Google Play.
Built with React + Capacitor — one codebase running on Android, iOS and web (PWA).

## Highlights
- **Offline-first cloud sync** with server-stamped timestamps, optimistic concurrency (baseUpdatedAt / 409 conflict handling), and idempotent writes (writeId) to survive replays and flaky connections
- Serialized push queue to prevent out-of-order state overwrites
- Audio recitations from multiple reciters (Al-Hosary, Abdul Basit, Al-Minshawi)
- Khatma (completion) tracking with its own synced log
- RTL, Arabic-first UI with night-mode support

## Stack
React · Vite · Capacitor · Node.js/Express API · MySQL

▶ **Google Play:** https://play.google.com/store/apps/details?id=com.shoaib.quranfives
