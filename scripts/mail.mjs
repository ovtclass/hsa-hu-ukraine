import nodemailer from 'nodemailer';

export function createMailEnvironment(env, createTransport = nodemailer.createTransport) {
 const mode = env.MAIL_TRANSPORT || (env.SMTP_HOST ? 'smtp' : 'resend');
 if (!['smtp', 'resend'].includes(mode)) throw new Error('MAIL_TRANSPORT must be smtp or resend.');
 if (mode === 'resend') return { ...env };
 for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'APPLICATION_FROM']) {
  if (!env[key]) throw new Error(`Missing SMTP setting: ${key}`);
 }
 const port = Number(env.SMTP_PORT || 587);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT.');
 if (env.SMTP_SECURE && !['true', 'false'].includes(env.SMTP_SECURE)) throw new Error('SMTP_SECURE must be true or false.');
 const secure = env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465;
 const transport = createTransport({
  host: env.SMTP_HOST, port, secure, requireTLS: !secure,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
  disableFileAccess: true, disableUrlAccess: true,
 });
 return { ...env, SEND_APPLICATION_EMAIL: async message => {
  const result = await transport.sendMail({
   ...message, replyTo: message.reply_to,
   attachments: message.attachments.map(file => ({ ...file, encoding: 'base64' })),
  });
  if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP recipient rejected.');
 } };
}
