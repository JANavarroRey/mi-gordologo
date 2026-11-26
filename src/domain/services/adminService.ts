import { backendService, type RemoteUser } from './backendService';

export interface AdminCredentialItem {
  readonly userId: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: string;
  readonly status: string;
  readonly hasAuth: boolean;
  readonly password: string | null;
}

export interface AdminStatusResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly hasGemini?: boolean;
  readonly hasMailSmtp?: boolean;
  readonly mailSmtpUser?: string | null;
  readonly mailFromName?: string;
  readonly pendingCount?: number;
  readonly totalUsers?: number;
  readonly users?: RemoteUser[];
}

export interface AdminCredentialsResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly credentials?: AdminCredentialItem[];
}

export const adminService = {
  getAdminStatus(): Promise<AdminStatusResult> {
    return backendService.call({ action: 'getAdminStatus' }) as Promise<AdminStatusResult>;
  },

  getAdminCredentials(): Promise<AdminCredentialsResult> {
    return backendService.call({ action: 'getAdminCredentials' }) as Promise<AdminCredentialsResult>;
  },

  listPendingUsers() {
    return backendService.call({ action: 'listPendingUsers' });
  },

  setUserStatus(userId: string, status: 'approved' | 'rejected' | 'pending') {
    return backendService.call({ action: 'setUserStatus', userId, status });
  },

  deleteUser(userId: string) {
    return backendService.call({ action: 'deleteUser', userId });
  },

  openAsUser(targetUserId: string) {
    return backendService.call({ action: 'openAsUser', targetUserId });
  },

  createUser(body: Record<string, unknown>) {
    return backendService.call({ action: 'createUser', ...body });
  },

  setUserPassword(userId: string, password?: string) {
    return backendService.call({
      action: password ? 'adminSetPassword' : 'adminResetPassword',
      userId,
      ...(password ? { password } : {}),
    });
  },

  setGeminiKey(apiKey: string) {
    return backendService.call({ action: 'setGeminiKey', apiKey });
  },

  setMailSmtp(smtpUser: string, smtpPass: string, fromName?: string) {
    return backendService.call({ action: 'setMailSmtp', smtpUser, smtpPass, fromName });
  },

  testMailSmtp(toEmail?: string) {
    return backendService.call({ action: 'testMailSmtp', ...(toEmail ? { toEmail } : {}) });
  },
};
