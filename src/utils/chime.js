// نغمة جرس قصيرة من نغمتين، تُصنع في المتصفّح: لا ملف صوت، وتعمل بلا شبكة.
// تُستدعى من ضغطة المستخدم (المتصفّح لا يسمح بالصوت قبلها).
let context = null;

export function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = context || new AudioContext();
    if (context.state === 'suspended') context.resume();
    const now = context.currentTime;
    [[880, 0], [1318.5, 0.16]].forEach(([frequency, at]) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.35, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.1);
      osc.connect(gain).connect(context.destination);
      osc.start(now + at);
      osc.stop(now + at + 1.2);
    });
  } catch {
    // بلا صوت: التسبيح يكمل
  }
}
