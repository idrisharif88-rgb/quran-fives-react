// يولّد مقاطع صوت نافذة «طريقة الخماسيات» مرة واحدة، وتُشحن داخل التطبيق (بلا إنترنت).
// النصوص المشكولة في scripts/hifz-voice-lines.json — مفاتيحها تطابق src/constants/hifzFivesMessages.js.
// يحتاج edge-tts (pip install edge-tts):
//   node scripts/generate-hifz-voice.mjs [مسار edge-tts]
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const EDGE_TTS = process.argv[2] || 'edge-tts';
const OUT = 'src/assets/voice/hifz';
const { voice, rate, lines } = JSON.parse(readFileSync('scripts/hifz-voice-lines.json', 'utf8'));

mkdirSync(OUT, { recursive: true });
for (const [key, text] of Object.entries(lines)) {
  execFileSync(EDGE_TTS, ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', `${OUT}/${key}.mp3`]);
  console.log(key);
}
