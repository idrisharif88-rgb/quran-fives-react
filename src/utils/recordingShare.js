import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { readRecordingBlob } from './hifzRecordingStore';
import { toWav } from './wavEncode';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

// مشاركة تسجيل (لإرساله إلى المُسمِّع). يُحوَّل إلى WAV — واتساب لا يقبل webm صوتاً — وباسم
// لاتيني بلا مسافات (بعض التطبيقات ترفض الأسماء العربية في مرفقاتها). على الهاتف يُكتب في
// الذاكرة المؤقتة ثم قائمة المشاركة؛ في المتصفح Web Share أو التنزيل.
export async function shareRecording(recording, { fileName, title }) {
  const wav = await toWav(await readRecordingBlob(recording));
  const name = `${fileName}.wav`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: name, data: await blobToBase64(wav), directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    await Share.share({ title, files: [uri] }).catch(() => {});
    return;
  }

  const file = new File([wav], name, { type: 'audio/wav' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(wav);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
