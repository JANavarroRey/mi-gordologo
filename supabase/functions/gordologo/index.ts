import {
  ADMIN_EMAIL,
  anonAuthClient,
  checkRateLimit,
  countApproved,
  ensureAdminRow,
  listUsersPublic,
  loadContext,
  normalizeEmail,
  publicUser,
  readDecryptedPassword,
  requireAdmin,
  requireApproved,
  requireAuth,
  saveEncryptedPassword,
  serviceClient,
  type UserRow,
} from './_lib/auth.ts';
import { handleAiAction, isLikelyGeminiKey, normalizeGeminiKey } from './_lib/gemini.ts';
import { corsHeaders, extractBearer, extractClientIp, json, PUBLIC_APP_URL } from './_lib/http.ts';
import {
  buildNewSignupAdminEmail,
  buildPasswordResetEmail,
  buildTestEmail,
  buildUserApprovedEmail,
  loadMailSmtp,
  saveMailSmtp,
  sendMail,
} from './_lib/mail.ts';
import {
  generateSixDigitCode,
  hashResetCode,
  randomTempPassword,
  timingSafeEqual,
} from './_lib/vault.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido' }, 405);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido' }, 400);
  }

  const action = String(payload.action || '');
  const jwt = extractBearer(req);
  const clientIp = extractClientIp(req);
  const sb = serviceClient();

  try {
    // =====================================================================
    // 1. ACCIONES PÚBLICAS (sin exponer datos de admin, usuarios ni API keys)
    // =====================================================================
    if (action === 'status') {
      const usersRes = await sb.from('app_users').select('id', { count: 'exact', head: true });
      if (usersRes.error) {
        return json({
          ok: true,
          backend: true,
          needsBootstrap: true,
        });
      }
      const approved = await countApproved(sb);
      return json({
        ok: true,
        backend: true,
        needsBootstrap: approved === 0,
      });
    }

    // Registro público desde la URL -> siempre member + pending + aviso al admin
    if (action === 'register') {
      const name = String(payload.name || '').trim();
      const email = normalizeEmail(payload.email);
      const password = String(payload.password || '');

      if (!name || name.length < 2) {
        return json({ ok: false, error: 'Indica tu nombre (al menos 2 caracteres).' }, 400);
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ ok: false, error: 'Indica un email válido.' }, 400);
      }
      if (password.length < 6) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      const allowedIp = await checkRateLimit(sb, 'register_ip', clientIp, 900, 6);
      const allowedEmail = await checkRateLimit(sb, 'register_email', email, 900, 3);
      if (!allowedIp || !allowedEmail) {
        return json(
          { ok: false, error: 'Demasiados intentos recientes. Espera unos minutos y vuelve a probar.' },
          429
        );
      }

      const { data: existingProfile } = await sb
        .from('app_users')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        return json(
          {
            ok: false,
            error:
              existingProfile.status === 'pending'
                ? 'Ya existe una solicitud con ese email pendiente de aprobación.'
                : 'Ya existe una cuenta con ese email. Inicia sesión o usa «Olvidé mi contraseña».',
          },
          409
        );
      }

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createErr || !created.user) {
        const msg = createErr?.message || '';
        if (/already|registered|exists/i.test(msg)) {
          return json(
            {
              ok: false,
              error: 'Ya existe una cuenta con ese email. Inicia sesión o usa «Olvidé mi contraseña».',
            },
            409
          );
        }
        return json({ ok: false, error: 'No se pudo completar el registro. Inténtalo de nuevo.' }, 500);
      }

      const authUid = created.user.id;
      await new Promise((r) => setTimeout(r, 350));

      const { data: triggerRow } = await sb
        .from('app_users')
        .select('id')
        .eq('auth_user_id', authUid)
        .maybeSingle();

      const now = new Date().toISOString();
      const userId = triggerRow?.id || `usr_${authUid.replace(/-/g, '')}`;

      const fields = {
        name,
        role: 'member' as const,
        email,
        auth_user_id: authUid,
        status: 'pending' as const,
        age: Math.max(0, Number(payload.age) || 0),
        height: Math.max(0, Number(payload.height) || 0),
        target_calories: 1500,
        settings: {
          servings: 1,
          freeDay: 5,
          freeDayEnabled: false,
          weighInDay: 4,
        },
        updated_at: now,
      };

      if (triggerRow) {
        const { error: updErr } = await sb.from('app_users').update(fields).eq('id', triggerRow.id);
        if (updErr) return json({ ok: false, error: updErr.message }, 500);
      } else {
        const { error: insErr } = await sb
          .from('app_users')
          .insert({ id: userId, ...fields, created_at: now });
        if (insErr) return json({ ok: false, error: insErr.message }, 500);
      }

      await saveEncryptedPassword(sb, userId, password);

      // Aviso al administrador (mejor esfuerzo; no bloquea el alta si SMTP falla)
      try {
        const mail = await loadMailSmtp(sb);
        if (mail) {
          const emailMsg = buildNewSignupAdminEmail({
            userName: name,
            userEmail: email,
            appUrl: PUBLIC_APP_URL,
          });
          await sendMail(mail, { to: ADMIN_EMAIL, ...emailMsg });
        }
      } catch {
        // Silencioso para el solicitante; el admin igualmente verá la solicitud pendiente en su panel
      }

      return json({
        ok: true,
        status: 'pending',
        message:
          'Solicitud registrada. Tu cuenta quedará activa en cuanto el administrador la apruebe.',
      });
    }

    // Recuperación de contraseña gratuita (OTP 6 dígitos + enlace inmune a Hotmail Safe Links)
    if (action === 'requestPasswordReset') {
      const email = normalizeEmail(payload.email);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ ok: false, error: 'Indica un email válido.' }, 400);
      }

      const allowedEmailQuick = await checkRateLimit(sb, 'reset_email_60s', email, 60, 1);
      if (!allowedEmailQuick) {
        return json(
          { ok: false, error: 'Ya hemos enviado un código hace menos de un minuto. Revisa tu bandeja o spam.' },
          429
        );
      }

      const allowedEmailHour = await checkRateLimit(sb, 'reset_email_1h', email, 3600, 5);
      const allowedIpHour = await checkRateLimit(sb, 'reset_ip_1h', clientIp, 3600, 20);
      if (!allowedEmailHour || !allowedIpHour) {
        return json(
          { ok: false, error: 'Demasiados intentos de recuperación. Espera un rato y vuelve a probar.' },
          429
        );
      }

      const mail = await loadMailSmtp(sb);
      if (!mail) {
        return json(
          {
            ok: false,
            error:
              'La recuperación por correo no está disponible en este momento. Contacta con el administrador.',
          },
          503
        );
      }

      const genericSuccess = {
        ok: true,
        message:
          'Si ese email está registrado, recibirás un correo en unos minutos con un código de 6 dígitos y un enlace (revisa también la carpeta de spam).',
      };

      const { data: userRow } = await sb
        .from('app_users')
        .select('id, email, auth_user_id')
        .eq('email', email)
        .not('auth_user_id', 'is', null)
        .maybeSingle();

      if (!userRow?.auth_user_id) {
        return json(genericSuccess);
      }

      const code = generateSixDigitCode();
      const codeHash = await hashResetCode(email, code);
      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Invalidar códigos previos sin usar para este email
      await sb
        .from('password_reset_codes')
        .update({ used_at: nowIso })
        .eq('email', email)
        .is('used_at', null);

      const { error: codeInsertErr } = await sb.from('password_reset_codes').insert({
        email,
        code_hash: codeHash,
        expires_at: expiresIso,
        attempts: 0,
      });

      if (codeInsertErr) {
        return json(
          {
            ok: false,
            error:
              'No se pudo preparar el código de recuperación en el servidor. Contacta con el administrador.',
          },
          500
        );
      }

      const resetUrl = `${PUBLIC_APP_URL}/#/restablecer-clave?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
      const emailMsg = buildPasswordResetEmail({ code, resetUrl });

      try {
        await sendMail(mail, { to: email, ...emailMsg });
      } catch {
        return json(
          {
            ok: false,
            error:
              'No se pudo enviar el correo en este momento. Inténtalo de nuevo más tarde o contacta con el administrador.',
          },
          500
        );
      }

      return json(genericSuccess);
    }

    // Confirmación atómica del código de recuperación (actualiza Auth + bóveda cifrada)
    if (action === 'confirmPasswordReset') {
      const email = normalizeEmail(payload.email);
      const code = String(payload.code || '').replace(/\s+/g, '');
      const newPassword = String(payload.newPassword || '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ ok: false, error: 'Indica tu email.' }, 400);
      }
      if (!/^\d{6}$/.test(code)) {
        return json({ ok: false, error: 'El código debe tener 6 dígitos.' }, 400);
      }
      if (newPassword.length < 6) {
        return json({ ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      const allowedVerify = await checkRateLimit(sb, 'reset_confirm_ip', clientIp, 900, 15);
      if (!allowedVerify) {
        return json({ ok: false, error: 'Demasiados intentos. Espera unos minutos.' }, 429);
      }

      const { data: codeRow } = await sb
        .from('password_reset_codes')
        .select('*')
        .eq('email', email)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeRow) {
        return json(
          { ok: false, error: 'El código es incorrecto o ha caducado. Solicita uno nuevo.' },
          400
        );
      }

      const now = new Date();
      if (new Date(codeRow.expires_at).getTime() < now.getTime() || (codeRow.attempts || 0) >= 5) {
        await sb
          .from('password_reset_codes')
          .update({ used_at: now.toISOString() })
          .eq('id', codeRow.id);
        return json(
          { ok: false, error: 'El código ha caducado o superó el límite de intentos. Solicita uno nuevo.' },
          400
        );
      }

      const expectedHash = await hashResetCode(email, code);
      if (!timingSafeEqual(expectedHash, String(codeRow.code_hash || ''))) {
        const nextAttempts = (codeRow.attempts || 0) + 1;
        await sb
          .from('password_reset_codes')
          .update({
            attempts: nextAttempts,
            ...(nextAttempts >= 5 ? { used_at: now.toISOString() } : {}),
          })
          .eq('id', codeRow.id);
        return json(
          { ok: false, error: 'Código incorrecto. Revisa el correo e inténtalo de nuevo.' },
          400
        );
      }

      const { data: userRow } = await sb
        .from('app_users')
        .select('id, auth_user_id')
        .eq('email', email)
        .not('auth_user_id', 'is', null)
        .maybeSingle();

      if (!userRow?.auth_user_id) {
        return json({ ok: false, error: 'Cuenta no encontrada.' }, 404);
      }

      const { error: authErr } = await sb.auth.admin.updateUserById(userRow.auth_user_id, {
        password: newPassword,
      });
      if (authErr) {
        return json({ ok: false, error: 'No se pudo actualizar la contraseña.' }, 500);
      }

      await saveEncryptedPassword(sb, userRow.id, newPassword);
      await sb
        .from('password_reset_codes')
        .update({ used_at: now.toISOString() })
        .eq('email', email)
        .is('used_at', null);

      return json({
        ok: true,
        message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      });
    }

    // Primer administrador (solo si no existe ningún usuario aprobado)
    if (action === 'bootstrapAdmin') {
      const email = normalizeEmail(payload.email);
      const password = String(payload.password || '');
      const name = String(payload.name || 'Admin').trim() || 'Admin';
      if (!email || !email.includes('@')) {
        return json({ ok: false, error: 'Indica un email válido.' }, 400);
      }
      if (email !== ADMIN_EMAIL) {
        return json(
          { ok: false, error: `Solo el email administrador autorizado (${ADMIN_EMAIL}) puede inicializar el sistema.` },
          403
        );
      }
      if (password.length < 8) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
      }
      if ((await countApproved(sb)) > 0) {
        return json({ ok: false, error: 'Ya existe un administrador. Regístrate y espera aprobación.' }, 409);
      }

      await ensureAdminRow(sb);

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ ok: false, error: createErr?.message || 'No se pudo crear el administrador.' }, 500);
      }

      const authUid = created.user.id;
      await sb.from('app_users').delete().eq('auth_user_id', authUid);

      const now = new Date().toISOString();
      const pepeId = 'pepe';
      const { data: existingPepe } = await sb.from('app_users').select('id').eq('id', pepeId).maybeSingle();
      if (existingPepe) {
        const { error } = await sb
          .from('app_users')
          .update({
            name,
            role: 'superadmin',
            email,
            auth_user_id: authUid,
            status: 'approved',
            updated_at: now,
          })
          .eq('id', pepeId);
        if (error) return json({ ok: false, error: error.message }, 500);
      } else {
        const { error } = await sb.from('app_users').insert({
          id: pepeId,
          name,
          role: 'superadmin',
          email,
          auth_user_id: authUid,
          status: 'approved',
          age: 0,
          height: 0,
          target_calories: 1500,
          settings: { servings: 1, freeDay: 5, freeDayEnabled: false, weighInDay: 4 },
          created_at: now,
          updated_at: now,
        });
        if (error) return json({ ok: false, error: error.message }, 500);
      }

      await saveEncryptedPassword(sb, pepeId, password);

      const { data: pepe } = await sb.from('app_users').select('*').eq('id', pepeId).maybeSingle();
      return json({
        ok: true,
        message: 'Administrador creado. Entra con tu email y contraseña.',
        authUser: pepe ? publicUser(pepe as UserRow) : null,
        needsSignIn: true,
      });
    }

    // =====================================================================
    // 2. ACCIONES AUTENTICADAS
    // =====================================================================
    const ctx = await loadContext(sb, jwt);

    if (action === 'logout') {
      if (ctx) {
        await sb.from('app_acting').delete().eq('auth_user_id', ctx.authUid);
      }
      return json({ ok: true });
    }

    if (action === 'getMyProfile') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      return json({
        ok: true,
        isAdmin: ctx!.isAdmin,
        authUser: publicUser(ctx!.auth),
        actingUser: publicUser(ctx!.acting),
        status: ctx!.auth.status,
      });
    }

    // Sincronización silenciosa en el primer login de cuentas previas sin bóveda cifrada
    if (action === 'syncOwnPasswordVault') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const password = String(payload.password || '');
      if (password.length < 6) {
        return json({ ok: false, error: 'Contraseña inválida.' }, 400);
      }
      const userEmail = normalizeEmail(ctx!.auth.email);
      if (!userEmail) {
        return json({ ok: false, error: 'Cuenta sin email.' }, 400);
      }
      // Verificamos que la contraseña coincida realmente con Supabase Auth antes de guardarla
      const verifier = anonAuthClient();
      const { error: verifyErr } = await verifier.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (verifyErr) {
        return json({ ok: false, error: 'Credenciales no verificadas.' }, 401);
      }
      await saveEncryptedPassword(sb, ctx!.auth.id, password);
      return json({ ok: true });
    }

    if (action === 'changeOwnPassword') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const blocked = requireApproved(ctx!);
      if (blocked) return blocked;

      const password = String(payload.password || '');
      if (password.length < 6) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      const { error } = await sb.auth.admin.updateUserById(ctx!.authUid, { password });
      if (error) return json({ ok: false, error: 'No se pudo actualizar la contraseña.' }, 500);

      await saveEncryptedPassword(sb, ctx!.auth.id, password);
      return json({
        ok: true,
        message: 'Contraseña actualizada correctamente.',
      });
    }

    if (action === 'getState') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;

      if (ctx!.auth.status !== 'approved') {
        return json({
          ok: true,
          pending: true,
          isAdmin: false,
          status: ctx!.auth.status,
          authUser: publicUser(ctx!.auth),
          actingUser: publicUser(ctx!.auth),
          users: [publicUser(ctx!.auth)],
        });
      }

      const uid = ctx!.acting.id;
      const [{ data: menus }, { data: meas }] = await Promise.all([
        sb.from('user_menus').select('*').eq('user_id', uid).maybeSingle(),
        sb.from('user_measurements').select('*').eq('user_id', uid).maybeSingle(),
      ]);

      const authPublic = publicUser(ctx!.auth);
      const actingPublic = publicUser(ctx!.acting);
      const needsVaultSync = !ctx!.auth.password_enc;

      if (!ctx!.isAdmin) {
        return json({
          ok: true,
          isAdmin: false,
          authUser: authPublic,
          actingUser: authPublic,
          users: [authPublic],
          needsVaultSync,
          menus: menus?.weeks ?? null,
          menusEdited: Boolean(menus?.edited),
          menusUpdatedAt: menus?.updated_at ?? null,
          measurements: meas?.payload ?? null,
          measurementsUpdatedAt: meas?.updated_at ?? null,
        });
      }

      const allUsers = await listUsersPublic(sb);
      const pendingCount = allUsers.filter((u) => u.status === 'pending').length;

      return json({
        ok: true,
        isAdmin: true,
        authUser: authPublic,
        actingUser: actingPublic,
        users: allUsers,
        pendingCount,
        needsVaultSync,
        menus: menus?.weeks ?? null,
        menusEdited: Boolean(menus?.edited),
        menusUpdatedAt: menus?.updated_at ?? null,
        measurements: meas?.payload ?? null,
        measurementsUpdatedAt: meas?.updated_at ?? null,
      });
    }

    if (action === 'updateProfile') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const blocked = requireApproved(ctx!);
      if (blocked) return blocked;

      const targetId = String(payload.userId || ctx!.acting.id);
      if (!ctx!.isAdmin && targetId !== ctx!.auth.id) {
        return json({ ok: false, error: 'No puedes editar otro perfil.' }, 403);
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.name != null) patch.name = String(payload.name).trim();
      if (payload.age != null) patch.age = Number(payload.age);
      if (payload.height != null) patch.height = Number(payload.height);
      if (payload.targetCalories != null) patch.target_calories = Number(payload.targetCalories);
      if (payload.gender !== undefined) patch.gender = payload.gender;
      if (payload.activityLevel !== undefined) patch.activity_level = payload.activityLevel;
      if (payload.goal !== undefined) patch.goal = payload.goal;
      if (payload.settings && typeof payload.settings === 'object') {
        const { data: targetRow } = await sb
          .from('app_users')
          .select('settings')
          .eq('id', targetId)
          .maybeSingle();
        const current = (targetRow?.settings as Record<string, unknown>) || {};
        const incoming = { ...(payload.settings as Record<string, unknown>) };
        delete incoming.passwordRecovery;
        delete incoming.knownPassword;
        delete incoming.password_enc;
        patch.settings = { ...current, ...incoming };
      }

      const { error } = await sb.from('app_users').update(patch).eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);
      const { data } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      return json({ ok: true, user: data ? publicUser(data as UserRow) : null });
    }

    if (action === 'saveMenus') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const blocked = requireApproved(ctx!);
      if (blocked) return blocked;

      const uid = String(payload.userId || ctx!.acting.id);
      if (!ctx!.isAdmin && uid !== ctx!.auth.id) {
        return json({ ok: false, error: 'No puedes guardar el menú de otra persona.' }, 403);
      }
      const { error } = await sb.from('user_menus').upsert({
        user_id: uid,
        weeks: payload.weeks,
        edited: payload.edited !== false,
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'saveMeasurements') {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const blocked = requireApproved(ctx!);
      if (blocked) return blocked;

      const uid = String(payload.userId || ctx!.acting.id);
      if (!ctx!.isAdmin && uid !== ctx!.auth.id) {
        return json({ ok: false, error: 'No puedes guardar la báscula de otra persona.' }, 403);
      }
      const { error } = await sb.from('user_measurements').upsert({
        user_id: uid,
        payload: payload.measurements ?? [],
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    if (
      action === 'ask' ||
      action === 'adjustMeal' ||
      action === 'personalizeMenu' ||
      action === 'importMenu'
    ) {
      const unauth = requireAuth(ctx);
      if (unauth) return unauth;
      const blocked = requireApproved(ctx!);
      if (blocked) return blocked;
      return handleAiAction(sb, ctx!, action, payload);
    }

    // =====================================================================
    // 3. ACCIONES EXCLUSIVAS DE ADMINISTRADOR (jose.navarrorey@gmail.com)
    // =====================================================================
    if (action === 'getAdminStatus') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const [{ data: admin }, allUsers, mail] = await Promise.all([
        sb.from('app_admin').select('id, gemini_api_key').eq('id', 1).maybeSingle(),
        listUsersPublic(sb),
        loadMailSmtp(sb),
      ]);

      const pendingCount = allUsers.filter((u) => u.status === 'pending').length;

      return json({
        ok: true,
        hasGemini: Boolean(admin?.gemini_api_key),
        hasMailSmtp: Boolean(mail),
        mailSmtpUser: mail?.smtpUser || null,
        mailFromName: mail?.fromName || 'Mi Gordólogo',
        pendingCount,
        totalUsers: allUsers.length,
        users: allUsers,
      });
    }

    if (action === 'getAdminCredentials') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const { data, error } = await sb.from('app_users').select('*').order('created_at');
      if (error) return json({ ok: false, error: error.message }, 500);

      const rows = (data || []) as UserRow[];
      const credentials = await Promise.all(
        rows.map(async (row) => ({
          userId: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          hasAuth: Boolean(row.auth_user_id),
          password: await readDecryptedPassword(sb, row),
        }))
      );

      return json({ ok: true, credentials });
    }

    if (action === 'listPendingUsers') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const { data } = await sb
        .from('app_users')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return json({
        ok: true,
        users: (data || []).map((row) => publicUser(row as UserRow)),
      });
    }

    if (action === 'setUserStatus') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const targetId = String(payload.userId || '');
      const status = String(payload.status || '');
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return json({ ok: false, error: 'Estado no válido.' }, 400);
      }
      if (targetId === ctx!.auth.id && status !== 'approved') {
        return json({ ok: false, error: 'No puedes desaprobarte a ti mismo.' }, 400);
      }

      const { data: before } = await sb
        .from('app_users')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
      if (!before) return json({ ok: false, error: 'Usuario no encontrado.' }, 404);

      const { error } = await sb
        .from('app_users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', targetId);
      if (error) return json({ ok: false, error: error.message }, 500);

      // Si acaba de pasar a aprobado, avisamos al usuario por email (mejor esfuerzo)
      if (status === 'approved' && before.status !== 'approved' && before.email) {
        try {
          const mail = await loadMailSmtp(sb);
          if (mail) {
            const approvedEmail = buildUserApprovedEmail({
              userName: before.name || 'Usuario',
              appUrl: PUBLIC_APP_URL,
            });
            await sendMail(mail, { to: String(before.email), ...approvedEmail });
          }
        } catch {
          // No bloquea la aprobación
        }
      }

      const { data } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      return json({ ok: true, user: data ? publicUser(data as UserRow) : null });
    }

    if (action === 'deleteUser') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const targetId = String(payload.userId || '');
      if (!targetId) return json({ ok: false, error: 'Falta userId.' }, 400);
      if (targetId === ctx!.auth.id) {
        return json({ ok: false, error: 'No puedes eliminar tu propia cuenta de administrador.' }, 400);
      }

      const { data: target } = await sb
        .from('app_users')
        .select('id, auth_user_id, email')
        .eq('id', targetId)
        .maybeSingle();
      if (!target) return json({ ok: false, error: 'Perfil no encontrado.' }, 404);

      if (normalizeEmail(target.email) === ADMIN_EMAIL) {
        return json({ ok: false, error: 'No se puede eliminar el perfil administrador.' }, 400);
      }

      const { error: delErr } = await sb.from('app_users').delete().eq('id', targetId);
      if (delErr) return json({ ok: false, error: delErr.message }, 500);

      if (target.auth_user_id) {
        await sb.auth.admin.deleteUser(target.auth_user_id).catch(() => null);
      }

      return json({ ok: true, message: 'Usuario eliminado correctamente.' });
    }

    if (action === 'openAsUser') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const targetUserId = String(payload.targetUserId || '');
      if (!targetUserId || targetUserId === ctx!.auth.id) {
        await sb.from('app_acting').delete().eq('auth_user_id', ctx!.authUid);
        return json({
          ok: true,
          actingUserId: ctx!.auth.id,
          actingUser: publicUser(ctx!.auth),
          authUser: publicUser(ctx!.auth),
        });
      }

      const { data: target } = await sb
        .from('app_users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      if (!target) return json({ ok: false, error: 'Perfil no encontrado.' }, 404);
      if ((target as UserRow).status !== 'approved') {
        return json({ ok: false, error: 'Ese perfil aún no está aprobado.' }, 400);
      }

      await sb.from('app_acting').upsert({
        auth_user_id: ctx!.authUid,
        acting_user_id: target.id,
        updated_at: new Date().toISOString(),
      });

      return json({
        ok: true,
        actingUserId: target.id,
        actingUser: publicUser(target as UserRow),
        authUser: publicUser(ctx!.auth),
      });
    }

    if (action === 'createUser') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const name = String(payload.name || '').trim();
      const email = normalizeEmail(payload.email);
      const password = String(payload.password || '');
      if (!name) return json({ ok: false, error: 'Falta el nombre.' }, 400);
      if (!email || !email.includes('@')) return json({ ok: false, error: 'Falta un email válido.' }, 400);
      if (password.length < 6) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ ok: false, error: createErr?.message || 'No se pudo crear la cuenta.' }, 500);
      }

      const authUid = created.user.id;
      await new Promise((r) => setTimeout(r, 350));
      let { data: row } = await sb
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUid)
        .maybeSingle();

      const now = new Date().toISOString();
      const preferredId = String(payload.id || '').trim();
      if (row && preferredId && preferredId !== row.id) {
        await sb.from('app_users').delete().eq('id', row.id);
        row = null;
      }

      const userId = preferredId || row?.id || `usr_${authUid.replace(/-/g, '')}`;
      const fields = {
        name,
        role: 'member' as const,
        email,
        auth_user_id: authUid,
        status: 'approved' as const,
        age: Number(payload.age) || 40,
        height: Number(payload.height) || 170,
        target_calories: Number(payload.targetCalories) || 1500,
        gender: payload.gender ? String(payload.gender) : null,
        activity_level: payload.activityLevel ? String(payload.activityLevel) : null,
        goal: payload.goal ? String(payload.goal) : null,
        settings: {
          servings: 1,
          freeDay: 5,
          freeDayEnabled: false,
          weighInDay: Number(payload.weighInDay) || 4,
        },
        updated_at: now,
      };

      if (row) {
        const { error } = await sb.from('app_users').update(fields).eq('id', row.id);
        if (error) return json({ ok: false, error: error.message }, 500);
      } else {
        const { error } = await sb.from('app_users').insert({ id: userId, ...fields, created_at: now });
        if (error) return json({ ok: false, error: error.message }, 500);
      }

      const finalId = row?.id || userId;
      await saveEncryptedPassword(sb, finalId, password);

      if (payload.weeks) {
        await sb.from('user_menus').upsert({
          user_id: finalId,
          weeks: payload.weeks,
          edited: false,
          updated_at: now,
        });
      }
      if (payload.measurements) {
        await sb.from('user_measurements').upsert({
          user_id: finalId,
          payload: payload.measurements,
          updated_at: now,
        });
      }

      const { data: saved } = await sb.from('app_users').select('*').eq('id', finalId).maybeSingle();
      return json({ ok: true, user: saved ? publicUser(saved as UserRow) : null });
    }

    if (action === 'adminResetPassword' || action === 'adminSetPassword') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const targetId = String(payload.userId || '');
      const { data: target } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();
      if (!target) return json({ ok: false, error: 'Perfil no encontrado.' }, 404);
      const authUid = (target as UserRow).auth_user_id;
      if (!authUid) {
        return json({ ok: false, error: 'Ese perfil no tiene cuenta de email vinculada.' }, 400);
      }

      const chosen = String(payload.password || '').trim();
      if (chosen && chosen.length < 6) {
        return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      const nextPassword = chosen || randomTempPassword(12);
      const { error } = await sb.auth.admin.updateUserById(authUid, { password: nextPassword });
      if (error) return json({ ok: false, error: error.message }, 500);

      await saveEncryptedPassword(sb, targetId, nextPassword);
      const { data: refreshed } = await sb.from('app_users').select('*').eq('id', targetId).maybeSingle();

      return json({
        ok: true,
        tempPassword: nextPassword,
        user: publicUser((refreshed || target) as UserRow),
        message: 'Contraseña actualizada y cifrada en la bóveda de administrador.',
      });
    }

    if (action === 'setGeminiKey') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const apiKey = normalizeGeminiKey(String(payload.apiKey || ''));
      if (!isLikelyGeminiKey(apiKey)) {
        return json(
          {
            ok: false,
            error:
              'Esa no parece una clave de Google AI Studio. Debe empezar por AIza o por AQ.',
          },
          400
        );
      }
      await ensureAdminRow(sb);
      const { error } = await sb
        .from('app_admin')
        .update({ gemini_api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, hasGemini: true });
    }

    if (action === 'setMailSmtp') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const saved = await saveMailSmtp(sb, {
        smtpUser: String(payload.smtpUser || ''),
        smtpPass: String(payload.smtpPass || ''),
        fromName: String(payload.fromName || 'Mi Gordólogo'),
      });
      return json({
        ok: true,
        hasMailSmtp: true,
        mailSmtpUser: saved.smtpUser,
        mailFromName: saved.fromName,
      });
    }

    if (action === 'testMailSmtp') {
      const denied = requireAdmin(ctx);
      if (denied) return denied;

      const mail = await loadMailSmtp(sb);
      if (!mail) {
        return json(
          { ok: false, error: 'Configura primero tu Gmail y contraseña de aplicación.' },
          400
        );
      }
      const toEmail = normalizeEmail(payload.toEmail) || ADMIN_EMAIL;
      if (!toEmail.includes('@')) {
        return json({ ok: false, error: 'Indica un email de destino válido para la prueba.' }, 400);
      }

      const testMsg = buildTestEmail({ recipient: toEmail });
      try {
        await sendMail(mail, { to: toEmail, ...testMsg });
        return json({
          ok: true,
          message: `Correo de prueba enviado a ${toEmail}. Revisa bandeja de entrada y spam.`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return json(
          {
            ok: false,
            error: `Error SMTP al enviar a ${toEmail}: ${message}`,
          },
          500
        );
      }
    }

    return json({ ok: false, error: 'Acción desconocida' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
