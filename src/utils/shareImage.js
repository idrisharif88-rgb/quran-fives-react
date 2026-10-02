import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

// تحويل عنصر DOM إلى صورة PNG ومشاركتها عبر ورقة المشاركة الأصلية في أندرويد.
// «الطباعة» تظهر تلقائياً ضمن برامج ورقة المشاركة عند مشاركة الصورة/المستند.
export async function shareElementAsImage(element, fileName) {
  if (!element) return;
  const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const name = `${fileName || 'result'}_${Date.now()}.png`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    Share.share({ title: 'نتيجة الجزء', files: [uri] })
      .catch(() => {})
      .finally(() => Filesystem.deleteFile({ path: name, directory: Directory.Cache }).catch(() => {}));
    return;
  }

  // متصفح الويب
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
