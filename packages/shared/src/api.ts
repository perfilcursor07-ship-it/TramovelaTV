import type {
  AdminEpisode,
  AdminNovel,
  AdminStats,
  Comment,
  HomeData,
  Novel,
  NovelDetail,
  Order,
  PublicSettings,
  Report,
  ReportType,
  User,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export interface ApiOptions {
  /** Ex.: '' no web (mesmo domínio) ou 'http://192.168.0.10:3333' no Expo */
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

/** Cliente HTTP único, usado pelo web e pelo app Expo. */
export function createApi(opts: ApiOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await opts.getToken();
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetch(`${opts.baseUrl}/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token) opts.onUnauthorized?.();
      throw new ApiError(res.status, data?.message || 'Erro inesperado', data?.code);
    }
    return data as T;
  }

  const get = <T>(p: string) => request<T>('GET', p);
  const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
  const put = <T>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {});
  const del = <T>(p: string) => request<T>('DELETE', p);
  const qs = (o: Record<string, unknown>) => {
    const s = new URLSearchParams(
      Object.entries(o)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return s ? `?${s}` : '';
  };

  return {
    request,
    mediaUrl: (u?: string | null) => (!u ? '' : /^(https?:|data:)/.test(u) ? u : `${opts.baseUrl}${u}`),

    auth: {
      login: (email: string, password: string) => post<{ token: string; user: User }>('/auth/login', { email, password }),
      register: (name: string, email: string, password: string) =>
        post<{ token: string; user: User }>('/auth/register', { name, email, password }),
      me: () => get<{ user: User }>('/auth/me'),
    },

    catalog: {
      settings: () => get<PublicSettings>('/settings/public'),
      home: () => get<HomeData>('/home'),
      novels: (p: { search?: string; genre?: string; page?: number } = {}) =>
        get<{ data: Novel[]; has_more: boolean; page: number; genres: string[] }>(`/novels${qs(p)}`),
      novel: (slug: string) => get<NovelDetail>(`/novels/${encodeURIComponent(slug)}`),
      stream: (episodeId: number) =>
        get<{ url: string; expires_in: number; preview_seconds: number | null }>(`/episodes/${episodeId}/stream`),
    },

    social: {
      like: (episodeId: number) => post<{ liked: boolean; likes_count: number }>(`/episodes/${episodeId}/like`),
      favorite: (novelId: number) => post<{ favorite: boolean }>(`/novels/${novelId}/favorite`),
      comments: (episodeId: number) => get<{ data: Comment[] }>(`/episodes/${episodeId}/comments`),
      comment: (episodeId: number, body: string) => post<Comment>(`/episodes/${episodeId}/comments`, { body }),
      deleteComment: (id: number) => del<void>(`/comments/${id}`),
      progress: (episodeId: number, seconds: number) => post<{ ok: true }>(`/episodes/${episodeId}/progress`, { seconds }),
    },

    me: {
      summary: () => get<{ library: number; favorites: number; orders: number; comments: number }>('/me/summary'),
      library: () => get<{ data: Novel[] }>('/me/library'),
      favorites: () => get<{ data: Novel[] }>('/me/favorites'),
      orders: () => get<{ data: Order[] }>('/me/orders'),
      updateProfile: (p: Partial<{ name: string; cpf: string; phone: string; current_password: string; new_password: string }>) =>
        put<{ user: User }>('/me/profile', p),
    },

    support: {
      report: (d: {
        type: ReportType;
        message: string;
        contact?: string;
        novel_slug?: string;
        episode_number?: number;
        page_url?: string;
      }) => post<{ id: number }>('/reports', d),
    },

    orders: {
      create: (novel_id: number, cpf?: string, phone?: string, kind: 'full' | 'pack' = 'full') =>
        post<Order>('/orders', { novel_id, cpf, phone, kind }),
      get: (id: number) => get<Order>(`/orders/${id}`),
      simulatePay: (id: number) => post<Order>(`/orders/${id}/simulate-pay`),
    },

    admin: {
      stats: () => get<AdminStats>('/admin/stats'),
      novels: (search?: string) => get<{ data: AdminNovel[] }>(`/admin/novels${qs({ search })}`),
      novel: (id: number) => get<{ novel: AdminNovel; episodes: AdminEpisode[] }>(`/admin/novels/${id}`),
      createNovel: (f: FormData) => post<AdminNovel>('/admin/novels', f),
      updateNovel: (id: number, f: FormData) => put<AdminNovel>(`/admin/novels/${id}`, f),
      deleteNovel: (id: number) => del<void>(`/admin/novels/${id}`),
      updateEpisode: (id: number, f: FormData) => put<AdminEpisode>(`/admin/episodes/${id}`, f),
      deleteEpisode: (id: number) => del<void>(`/admin/episodes/${id}`),
      orders: (p: { status?: string; search?: string } = {}) => get<{ data: Order[] }>(`/admin/orders${qs(p)}`),
      refreshOrder: (id: number) => post<Order>(`/admin/orders/${id}/refresh`),
      reports: (status = 'open') => get<{ data: Report[]; open: number }>(`/admin/reports${qs({ status })}`),
      setReportStatus: (id: number, status: 'open' | 'resolved') => put<{ ok: boolean }>(`/admin/reports/${id}`, { status }),
      users: (search?: string) => get<{ data: (User & { purchases: number })[] }>(`/admin/users${qs({ search })}`),
      setRole: (id: number, role: 'admin' | 'user') => put<{ ok: true }>(`/admin/users/${id}`, { role }),
      grant: (id: number, novel_id: number) => post<{ ok: true }>(`/admin/users/${id}/grant`, { novel_id }),
      comments: () =>
        get<{
          data: {
            id: number;
            body: string;
            created_at: string;
            user_name: string;
            user_email: string;
            episode_number: number;
            novel_title: string;
            novel_slug: string;
          }[];
        }>('/admin/comments'),
      settings: () =>
        get<{
          settings: Record<string, string>;
          payment: {
            mode: string;
            base_url: string | null;
            token_configured: boolean;
            webhook_url: string | null;
            pix_expiration_minutes: number;
          };
        }>('/admin/settings'),
      saveSettings: (s: Record<string, string>) => put<{ settings: Record<string, string> }>('/admin/settings', s),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
