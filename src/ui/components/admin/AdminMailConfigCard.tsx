import React, { useState } from 'react';
import { Mail, CheckCircle2, Send } from 'lucide-react';
import { PasswordField, fieldInputClass } from '@/ui/components/forms/PasswordField';

interface Props {
  hasMailSmtp: boolean;
  mailSmtpUser: string | null;
  busy: boolean;
  onSaveMailSmtp: (smtpUser: string, smtpPass: string) => Promise<boolean>;
  onTestMailSmtp: (toEmail: string) => Promise<void>;
}

export const AdminMailConfigCard: React.FC<Props> = ({
  hasMailSmtp,
  mailSmtpUser,
  busy,
  onSaveMailSmtp,
  onTestMailSmtp,
}) => {
  const [editMail, setEditMail] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const showForm = !hasMailSmtp || editMail;

  const handleOpenEdit = () => {
    setSmtpUser(mailSmtpUser || '');
    setSmtpPass('');
    setEditMail(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSaveMailSmtp(smtpUser, smtpPass);
    if (ok) {
      setSmtpPass('');
      setEditMail(false);
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    await onTestMailSmtp(testEmail.trim() || mailSmtpUser || '');
  };

  return (
    <div className="space-y-2.5 pt-3 border-t border-neutral-100">
      <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
        <Mail className="w-4 h-4 text-emerald-700" />
        Correo de recuperación y avisos (Gmail SMTP gratis)
      </label>

      {hasMailSmtp && !editMail && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950">Activo y cifrado en servidor</p>
              <p className="text-xs text-emerald-800 break-all mt-0.5 font-medium">
                {mailSmtpUser || 'Gmail configurado'}
              </p>
              <p className="text-[11px] text-emerald-800/90 mt-1 leading-relaxed">
                Envía códigos OTP de 6 dígitos (inmune a Hotmail/Outlook Safe Links) a Gmail, Hotmail, Outlook, Yahoo e iCloud sin coste.
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleTest(e)} className="flex gap-1.5 pt-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={mailSmtpUser || 'correo@hotmail.com o @gmail.com'}
              className={`${fieldInputClass} bg-white text-xs`}
            />
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Probar
            </button>
          </form>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="w-full py-2 rounded-xl border border-emerald-200 bg-white text-emerald-900 text-xs font-bold"
          >
            Cambiar cuenta Gmail o contraseña de aplicación
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            1) En tu cuenta Google: <strong>Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones</strong> → crea una para «Correo». 2) Introduce tu Gmail completo y los 16 caracteres generados.
          </p>
          <input
            type="email"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder={mailSmtpUser || 'jose.navarrorey@gmail.com'}
            required
            className={fieldInputClass}
          />
          <PasswordField
            value={smtpPass}
            onChange={setSmtpPass}
            placeholder="Contraseña de aplicación (16 caracteres)"
            required
            autoComplete="off"
          />
          <div className="flex gap-2">
            {editMail && (
              <button
                type="button"
                onClick={() => {
                  setEditMail(false);
                  setSmtpPass('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-bold text-xs"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs"
            >
              Guardar configuración Gmail
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
