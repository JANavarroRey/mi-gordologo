import type { ServiceSupabase } from './auth.ts';
import { ensureAdminRow } from './auth.ts';
import { decryptSecret, encryptSecret } from './vault.ts';

export type MailConfig = {
  smtpUser: string;
  smtpPass: string;
  fromName: string;
};

export async function loadMailSmtp(sb: ServiceSupabase): Promise<MailConfig | null> {
  const { data } = await sb.from('app_admin').select('*').eq('id', 1).maybeSingle();
  if (!data) return null;

  const smtpUser = String((data as Record<string, unknown>).mail_smtp_user || '').trim();
  const fromName =
    String((data as Record<string, unknown>).mail_from_name || 'Mi Gordólogo').trim() ||
    'Mi Gordólogo';

  const encPass = (data as Record<string, unknown>).mail_smtp_pass_enc as string | null | undefined;
  const legacyPass = (data as Record<string, unknown>).mail_smtp_pass as string | null | undefined;

  let smtpPass = '';
  if (encPass) {
    smtpPass = (await decryptSecret(encPass)) || '';
  } else if (legacyPass) {
    smtpPass = String(legacyPass).replace(/\s+/g, '');
    // Migración progresiva: cifra la contraseña SMTP heredada y borra la columna en texto plano
    try {
      const upgraded = await encryptSecret(smtpPass);
      await sb
        .from('app_admin')
        .update({
          mail_smtp_pass_enc: upgraded,
          mail_smtp_pass: null,
          mail_provider: 'gmail_smtp',
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    } catch {
      // Si fallase el upgrade, seguimos enviando sin bloquear
    }
  }

  if (!smtpUser || !smtpPass) return null;
  return { smtpUser, smtpPass, fromName };
}

export async function saveMailSmtp(
  sb: ServiceSupabase,
  opts: { smtpUser: string; smtpPass: string; fromName?: string }
): Promise<{ smtpUser: string; fromName: string }> {
  const smtpUser = opts.smtpUser.trim().toLowerCase();
  const smtpPass = opts.smtpPass.replace(/\s+/g, '');
  const fromName = (opts.fromName || 'Mi Gordólogo').trim() || 'Mi Gordólogo';

  if (!smtpUser.includes('@') || smtpUser.includes('…') || smtpUser.includes('...')) {
    throw new Error('Indica el email completo de Gmail (sin ocultar caracteres).');
  }
  if (smtpPass.length < 8) {
    throw new Error(
      'Introduce la contraseña de aplicación de Google (16 caracteres), no la contraseña habitual de Gmail.'
    );
  }

  await ensureAdminRow(sb);
  const encryptedPass = await encryptSecret(smtpPass);

  const { error } = await sb
    .from('app_admin')
    .update({
      mail_smtp_user: smtpUser,
      mail_smtp_pass_enc: encryptedPass,
      mail_smtp_pass: null,
      mail_from_name: fromName,
      mail_provider: 'gmail_smtp',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) {
    throw new Error(
      error.message.includes('mail_smtp_pass_enc')
        ? 'Falta ejecutar supabase/schema_auth_v3.sql en Supabase.'
        : error.message
    );
  }

  return { smtpUser, fromName };
}

async function attemptGmailSend(
  config: MailConfig,
  msg: { to: string; subject: string; text: string; html: string },
  port: 465 | 587
): Promise<void> {
  const nodemailer = await import('npm:nodemailer@6.9.16');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { minVersion: 'TLSv1.2' },
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.smtpUser}>`,
      replyTo: config.smtpUser,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  } finally {
    transporter.close();
  }
}

/** Envío gratuito universal vía Gmail SMTP (SPF+DKIM+DMARC alineados para Gmail, Hotmail, Outlook, Yahoo, iCloud). */
export async function sendMail(
  config: MailConfig,
  msg: { to: string; subject: string; text: string; html: string }
): Promise<void> {
  try {
    await attemptGmailSend(config, msg, 465);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Si es error de autenticación, no reintentamos en otro puerto
    if (/invalid login|auth|535|534|credentials/i.test(message)) {
      throw err;
    }
    // Fallback automático a STARTTLS 587
    await attemptGmailSend(config, msg, 587);
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPasswordResetEmail(opts: { code: string; resetUrl: string }) {
  const safeCode = escapeHtml(opts.code);
  const safeUrl = escapeHtml(opts.resetUrl);
  return {
    subject: 'Código para restablecer tu contraseña — Mi Gordólogo',
    text: [
      'Hola,',
      '',
      'Has solicitado restablecer tu contraseña en Mi Gordólogo.',
      '',
      `Tu código de verificación (válido 15 minutos): ${opts.code}`,
      '',
      'Puedes abrir directamente este enlace para introducir tu nueva contraseña:',
      opts.resetUrl,
      '',
      'Si abres la app instalada en tu móvil, pulsa "Olvidé mi contraseña" -> "Ya tengo un código" e introduce el código anterior.',
      '',
      'Si no solicitaste este cambio, puedes ignorar este mensaje.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.5">
        <h2 style="margin:0 0 12px;color:#047857;font-size:20px">Mi Gordólogo</h2>
        <p style="margin:0 0 16px;font-size:15px">Has solicitado cambiar tu contraseña. Utiliza este código de verificación (caduca en <strong>15 minutos</strong>):</p>
        <div style="background:#ecfdf5;border:2px solid #047857;border-radius:14px;padding:16px;text-align:center;margin:18px 0">
          <span style="font-family:monospace;font-size:30px;font-weight:700;letter-spacing:6px;color:#064e3b">${safeCode}</span>
        </div>
        <p style="text-align:center;margin:20px 0">
          <a href="${safeUrl}" style="display:inline-block;padding:13px 22px;background:#047857;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Elegir nueva contraseña</a>
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#57534e">Si usas la app instalada en tu móvil, también puedes abrirla y escribir el código de 6 dígitos en «Olvidé mi contraseña».</p>
        <p style="margin:10px 0 0;font-size:12px;color:#78716c">Si no pediste este correo, ignóralo con tranquilidad.</p>
      </div>
    `.trim(),
  };
}

export function buildNewSignupAdminEmail(opts: {
  userName: string;
  userEmail: string;
  appUrl: string;
}) {
  const safeName = escapeHtml(opts.userName);
  const safeEmail = escapeHtml(opts.userEmail);
  const safeUrl = escapeHtml(opts.appUrl);
  return {
    subject: `Nueva solicitud de acceso: ${opts.userName} — Mi Gordólogo`,
    text: [
      'Hola,',
      '',
      `Un nuevo usuario ha solicitado acceso a Mi Gordólogo:`,
      `- Nombre: ${opts.userName}`,
      `- Email: ${opts.userEmail}`,
      '',
      `Entra en Mi Perfil -> Administración para aprobar o rechazar la cuenta:`,
      `${opts.appUrl}/#/perfil`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.5">
        <h2 style="margin:0 0 12px;color:#047857;font-size:20px">Nueva solicitud en Mi Gordólogo</h2>
        <p style="margin:0 0 12px;font-size:15px">Una persona ha creado una cuenta y espera tu aprobación:</p>
        <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:14px;margin:14px 0">
          <p style="margin:0 0 4px"><strong>Nombre:</strong> ${safeName}</p>
          <p style="margin:0"><strong>Email:</strong> ${safeEmail}</p>
        </div>
        <p style="margin:18px 0">
          <a href="${safeUrl}/#/perfil" style="display:inline-block;padding:12px 20px;background:#047857;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Revisar solicitud</a>
        </p>
      </div>
    `.trim(),
  };
}

export function buildUserApprovedEmail(opts: { userName: string; appUrl: string }) {
  const safeName = escapeHtml(opts.userName);
  const safeUrl = escapeHtml(opts.appUrl);
  return {
    subject: '¡Tu cuenta ha sido aprobada! — Mi Gordólogo',
    text: [
      `Hola ${opts.userName},`,
      '',
      'Tu cuenta en Mi Gordólogo ya está aprobada. Puedes entrar con tu email y contraseña desde:',
      opts.appUrl,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.5">
        <h2 style="margin:0 0 12px;color:#047857;font-size:20px">¡Cuenta aprobada!</h2>
        <p style="margin:0 0 16px;font-size:15px">Hola <strong>${safeName}</strong>, tu acceso a Mi Gordólogo ya está activo.</p>
        <p style="margin:18px 0">
          <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#047857;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Entrar en Mi Gordólogo</a>
        </p>
      </div>
    `.trim(),
  };
}

export function buildTestEmail(opts: { recipient: string }) {
  const safeTo = escapeHtml(opts.recipient);
  return {
    subject: 'Correo de prueba — Mi Gordólogo',
    text: `Este es un correo de prueba enviado correctamente desde Mi Gordólogo a ${opts.recipient}. El envío gratuito por Gmail SMTP funciona correctamente.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.5">
        <h2 style="margin:0 0 10px;color:#047857;font-size:18px">Prueba de correo correcta</h2>
        <p style="margin:0;font-size:14px">El envío gratuito de recuperación de contraseña de <strong>Mi Gordólogo</strong> funciona correctamente para <strong>${safeTo}</strong>.</p>
      </div>
    `.trim(),
  };
}
