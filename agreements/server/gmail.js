// Sends email through Lavi's own Gmail mailbox (the Gmail API), exactly like an email she sends herself.
// Why: Google rejected the studio's emails to clients when they went through Apps Script's separate mail
// service (MailApp: bounce 5.7.1 "Message rejected", 17 October 2026), while the same emails sent by hand
// from Gmail were delivered. Emails sent this way also appear in her Gmail "Sent" folder.
// Needs the gmail.send permission (appsscript.json), which only allows sending, not reading her mail.
/* global UrlFetchApp, Utilities, ScriptApp, Session, Gmail */

const CRLF = '\r\n';
const b64 = (s) => Utilities.base64Encode(s, Utilities.Charset.UTF_8);
const wrap = (s) => s.replace(/.{1,76}/g, (m) => `${m}${CRLF}`);
// Header words with anything beyond plain ASCII (£, ·, accents) are encoded so every mail program shows them right.
// Long values are split into several short encoded words (the email standard caps each at 75 characters).
function word(s) {
  const str = String(s);
  if (/^[\x20-\x7e]*$/.test(str)) return str;
  const chunks = [];
  let cur = '';
  for (const ch of str) {
    if (unescape(encodeURIComponent(cur + ch)).length > 42) { chunks.push(cur); cur = ''; }
    cur += ch;
  }
  if (cur) chunks.push(cur);
  return chunks.map((c) => `=?UTF-8?B?${b64(c)}?=`).join(`${CRLF} `);
}
const addr = (name, email) => (name ? `${word(String(name).replace(/["\\\r\n]/g, ''))} <${email}>` : email);
const clean = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim(); // no header injection
const boundary = (tag) => `lb-${tag}-${Utilities.getUuid().replace(/-/g, '')}`;

/** The email as a MIME message: plain text + HTML, plus any attachments. */
export function buildMime({ from, fromName, to, replyTo, subject, text, html, attachments = [] }) {
  const alt = boundary('alt');
  const headers = [
    `From: ${addr(fromName, clean(from))}`,
    `To: ${clean(to)}`,
    ...(replyTo ? [`Reply-To: ${clean(replyTo)}`] : []),
    `Subject: ${word(clean(subject))}`,
    'MIME-Version: 1.0',
  ];
  const body = [
    `--${alt}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(text || subject || '')),
    `--${alt}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(html || '')),
    `--${alt}--`, '',
  ].join(CRLF);
  if (!attachments.length) return [...headers, `Content-Type: multipart/alternative; boundary="${alt}"`, '', body].join(CRLF);
  const mixed = boundary('mix');
  const parts = attachments.map((a) => {
    const name = clean(a.getName ? a.getName() : 'attachment').replace(/"/g, '') || 'attachment';
    const type = (a.getContentType && a.getContentType()) || 'application/octet-stream';
    return [`--${mixed}`, `Content-Type: ${type}; name="${word(name)}"`, `Content-Disposition: attachment; filename="${word(name)}"`, 'Content-Transfer-Encoding: base64', '', wrap(Utilities.base64Encode(a.getBytes()))].join(CRLF);
  });
  return [...headers, `Content-Type: multipart/mixed; boundary="${mixed}"`, '', `--${mixed}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', body, ...parts, `--${mixed}--`, ''].join(CRLF);
}

/** Send one email from Lavi's Gmail. Throws if Gmail refuses it, so the caller can fall back or report it. */
export function sendViaGmail(opts) {
  const from = Session.getEffectiveUser().getEmail();
  const raw = Utilities.base64EncodeWebSafe(buildMime({ ...opts, from }), Utilities.Charset.UTF_8).replace(/=+$/, '');
  // In Apps Script: the built-in Gmail service (enabled in appsscript.json), which also switches on the Gmail API
  // for the script. Elsewhere (local tests): the same Gmail API call over HTTPS.
  if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Messages) return Gmail.Users.Messages.send({ raw }, 'me').id || '';
  const res = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: JSON.stringify({ raw }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`Gmail send failed (${code}): ${String(res.getContentText()).slice(0, 200)}`);
  return JSON.parse(res.getContentText() || '{}').id || '';
}
