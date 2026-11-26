export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface Novel {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  cover_url: string | null;
  banner_url: string | null;
  genre: string | null;
  tags: string[];
  price_cents: number;
  promo_price_cents: number | null;
  promo_ends_at: string | null;
  effective_price_cents: number;
  free_episodes: number;
  /** segundos de prévia do EP 1 antes do pagamento (0 = sem prévia) */
  preview_seconds: number;
  /** pacote promocional: quantos episódios libera e o preço */
  pack_episodes: number;
  pack_price_cents: number;
  featured: boolean;
  views: number;
  episodes_count?: number;
  purchases_count?: number;
  likes_count?: number;
  last_episode?: number;
  status?: 'draft' | 'published';
}

export interface Episode {
  id: number;
  number: number;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  has_video: boolean;
  free: boolean;
  locked: boolean;
  /** > 0 quando o episódio bloqueado permite uma prévia */
  preview_seconds: number;
  likes_count: number;
  comments_count: number;
  liked: boolean;
}

export interface NovelDetail {
  novel: Novel;
  has_access: boolean;
  /** até qual episódio o usuário pode assistir (null = novela completa) */
  unlocked_until: number | null;
  favorite: boolean;
  last_episode: number | null;
  episodes: Episode[];
}

export interface HomeData {
  featured: Novel[];
  trending: Novel[];
  latest: Novel[];
  genres: { genre: string; novels: Novel[] }[];
  continue_watching: Novel[];
}

export interface Comment {
  id: number;
  body: string;
  created_at: string;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
}

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'failed';

export interface Order {
  id: number;
  reference_id: string;
  novel_id: number;
  novel_title: string;
  novel_slug: string;
  novel_cover: string | null;
  kind: 'full' | 'pack';
  episodes_unlocked: number | null;
  user_name?: string;
  user_email?: string;
  amount_cents: number;
  status: OrderStatus;
  provider_order_id: string | null;
  qr_text: string | null;
  qr_image: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface PublicSettings {
  site_name: string;
  site_tagline: string;
  paywall_badge: string;
  paywall_title: string;
  paywall_subtitle: string;
  paywall_cta: string;
  paywall_benefits: string[];
  support_whatsapp: string;
  payment_mode: 'mock' | 'sandbox' | 'production';
}

export interface AdminNovel extends Novel {
  status: 'draft' | 'published';
  raw_promo_price_cents: number | null;
  raw_promo_ends_at: string | null;
  tags_text: string;
  sales?: number;
}

export interface AdminEpisode {
  id: number;
  number: number;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  /** null = usa o padrão da novela */
  preview_seconds: number | null;
  has_video: boolean;
  video_size: number | null;
}

export interface AdminStats {
  totals: {
    revenue_cents: number;
    paid_orders: number;
    pending_orders: number;
    users: number;
    novels: number;
    episodes: number;
    comments: number;
  };
  series: { day: string; total_cents: number; orders: number }[];
  top_novels: { id: number; title: string; slug: string; cover_url: string | null; views: number; sales: number; revenue_cents: number }[];
  recent_orders: Order[];
}
