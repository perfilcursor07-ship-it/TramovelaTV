import { useQuery } from '@tanstack/react-query';
import type { PublicSettings } from '@novelas/shared';
import { api } from './api';

const fallback: PublicSettings = {
  site_name: 'TramaNovela TV',
  site_tagline: '',
  paywall_badge: 'OFERTA ESPECIAL',
  paywall_title: 'Não pare agora!',
  paywall_subtitle: 'Desbloqueie todos os episódios e descubra o final.',
  paywall_cta: 'DESBLOQUEAR AGORA',
  paywall_benefits: ['Todos os episódios liberados', 'Acesso vitalício', 'Pix aprovado na hora'],
  support_whatsapp: '',
  support_email: '',
  payment_mode: 'mock',
};

export function useSettings(): PublicSettings {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: api.catalog.settings, staleTime: 5 * 60 * 1000 });
  return data ?? fallback;
}
