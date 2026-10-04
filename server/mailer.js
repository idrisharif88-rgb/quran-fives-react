// إرسال البريد عبر Resend (https://resend.com) — بلا مكتبة، طلب HTTP واحد.
// بلا مفتاح (تشغيل محلي): تُطبع الرسالة في السجلّ بدل إرسالها ليمكن التجربة.
export function createMailer({ apiKey, from, fetchImpl = fetch, log = console.log }) {
  return async function sendMail({ to, subject, text, html }) {
    if (!apiKey) {
      log(`[بريد غير مُرسل — لا RESEND_API_KEY] إلى ${to}: ${subject}\n${text}`);
      return;
    }
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    // 503 لا 502: Cloudflare يستبدل 502 الأصل بصفحته فيراه التطبيق انقطاعاً.
    // سبب الرفض من Resend يُكتب في السجلّ: 422 بلا سبب كلّف جولة تشخيص (المرسِل بلا <>)
    if (!res.ok) throw new Error(`mail http ${res.status}: ${(await res.text()).slice(0, 300)}`);
  };
}
