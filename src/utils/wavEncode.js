// تحويل تسجيل (webm/opus…) إلى WAV للمشاركة: واتساب وغيره لا يقبلون webm صوتاً، ويقبلون WAV.
// يُفكّ الترميز بـ AudioContext ثم يُكتب PCM أحادي 16 بت بتردّد 16 كيلوهرتز (يكفي للصوت البشري ويخفّف الحجم).
const TARGET_RATE = 16000;

function downmix(buffer) {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) return buffer.getChannelData(0);
  const out = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += data[i] / numberOfChannels;
  }
  return out;
}

function resample(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const frac = pos - j;
    out[i] = samples[j] * (1 - frac) + (samples[j + 1] ?? samples[j]) * frac;
  }
  return out;
}

export function encodeWav(samples, rate) {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // أحادي
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export async function toWav(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    return encodeWav(resample(downmix(decoded), decoded.sampleRate, TARGET_RATE), TARGET_RATE);
  } finally {
    ctx.close().catch(() => {});
  }
}
