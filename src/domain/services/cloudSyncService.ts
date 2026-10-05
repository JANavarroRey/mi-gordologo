import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { storageService } from './storageService';
import type { BodyMeasurement, UserProfile, WeekMenu } from '../models/types';

const FAMILY_KEY_STORAGE = 'migordologo_family_key';

type CloudBundle = {
  profiles: UserProfile[];
  menusByUser: Record<string, WeekMenu[]>;
  measurementsByUser: Record<string, BodyMeasurement[]>;
  meta: Record<string, string>;
  updatedAt: string;
};

function getEnvConfig() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  return { url, anon };
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const { url, anon } = getEnvConfig();
  if (!url || !anon) return null;
  if (!client) client = createClient(url, anon);
  return client;
}

export const cloudSyncService = {
  isConfigured(): boolean {
    const { url, anon } = getEnvConfig();
    return Boolean(url && anon);
  },

  getFamilyKey(): string {
    return localStorage.getItem(FAMILY_KEY_STORAGE) || '';
  },

  setFamilyKey(key: string): void {
    localStorage.setItem(FAMILY_KEY_STORAGE, key.trim());
  },

  buildLocalBundle(): CloudBundle {
    const profiles = storageService.getProfiles();
    const menusByUser: Record<string, WeekMenu[]> = {};
    const measurementsByUser: Record<string, BodyMeasurement[]> = {};
    const meta: Record<string, string> = {};

    for (const p of profiles) {
      menusByUser[p.id] = storageService.getMenus(p.id);
      measurementsByUser[p.id] = storageService.getMeasurements(p.id);
      meta[`servings_${p.id}`] = String(storageService.getServings(p.id));
      meta[`free_day_${p.id}`] = String(storageService.getFreeDay(p.id));
      meta[`free_day_enabled_${p.id}`] = storageService.isFreeDayEnabled(p.id) ? '1' : '0';
      meta[`weighin_day_${p.id}`] = String(storageService.getWeighInDay(p.id));
      const edited = localStorage.getItem(`migordologo_menus_${p.id}_edited`);
      if (edited) meta[`menus_edited_${p.id}`] = edited;
    }

    return {
      profiles,
      menusByUser,
      measurementsByUser,
      meta,
      updatedAt: new Date().toISOString(),
    };
  },

  applyBundle(bundle: CloudBundle): void {
    if (bundle.profiles?.length) {
      localStorage.setItem('migordologo_profiles', JSON.stringify(bundle.profiles));
    }
    Object.entries(bundle.menusByUser || {}).forEach(([userId, menus]) => {
      localStorage.setItem(`migordologo_menus_${userId}`, JSON.stringify(menus));
    });
    Object.entries(bundle.measurementsByUser || {}).forEach(([userId, list]) => {
      localStorage.setItem(`migordologo_measurements_${userId}`, JSON.stringify(list));
    });
    Object.entries(bundle.meta || {}).forEach(([k, v]) => {
      if (k.startsWith('servings_')) {
        localStorage.setItem(`migordologo_servings_${k.replace('servings_', '')}`, v);
      } else if (k.startsWith('free_day_enabled_')) {
        localStorage.setItem(`migordologo_free_day_${k.replace('free_day_enabled_', '')}_enabled`, v);
      } else if (k.startsWith('free_day_')) {
        localStorage.setItem(`migordologo_free_day_${k.replace('free_day_', '')}`, v);
      } else if (k.startsWith('weighin_day_')) {
        localStorage.setItem(`migordologo_weighin_day_${k.replace('weighin_day_', '')}`, v);
      } else if (k.startsWith('menus_edited_')) {
        localStorage.setItem(`migordologo_menus_${k.replace('menus_edited_', '')}_edited`, v);
      }
    });
    window.dispatchEvent(new Event('storage'));
  },

  async push(): Promise<{ ok: boolean; message: string }> {
    const sb = getClient();
    if (!sb) {
      return {
        ok: false,
        message: 'Supabase no configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (capa gratuita).',
      };
    }
    const familyKey = this.getFamilyKey();
    if (!familyKey || familyKey.length < 6) {
      return { ok: false, message: 'Define una clave familiar de al menos 6 caracteres en Perfil → Nube.' };
    }

    const payload = this.buildLocalBundle();
    const { error } = await sb.from('family_snapshots').upsert(
      {
        family_key: familyKey,
        payload,
        updated_at: payload.updatedAt,
      },
      { onConflict: 'family_key' }
    );

    if (error) return { ok: false, message: `Error al subir: ${error.message}` };
    return { ok: true, message: 'Cambios guardados en la nube (gratis).' };
  },

  async pull(): Promise<{ ok: boolean; message: string }> {
    const sb = getClient();
    if (!sb) {
      return { ok: false, message: 'Supabase no configurado.' };
    }
    const familyKey = this.getFamilyKey();
    if (!familyKey) {
      return { ok: false, message: 'Falta la clave familiar.' };
    }

    const { data, error } = await sb
      .from('family_snapshots')
      .select('payload, updated_at')
      .eq('family_key', familyKey)
      .maybeSingle();

    if (error) return { ok: false, message: `Error al bajar: ${error.message}` };
    if (!data?.payload) {
      return { ok: false, message: 'No hay copia en la nube para esa clave. Sube primero desde este móvil.' };
    }

    this.applyBundle(data.payload as CloudBundle);
    return { ok: true, message: `Datos restaurados (${data.updated_at || 'ok'}).` };
  },

  /** Intento silencioso tras editar menús (no bloquea UI). */
  async pushMenusQuietly(): Promise<void> {
    if (!this.isConfigured() || !this.getFamilyKey()) return;
    try {
      await this.push();
    } catch {
      /* offline / sin red */
    }
  },
};
