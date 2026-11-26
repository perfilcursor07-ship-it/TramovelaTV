import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Flag, Link2, MessageCircleQuestion, Share } from 'lucide-react';
import { useSettings } from '../lib/settings';
import ReportForm from './ReportForm';
import { Modal } from './ui';

/** Ícones das redes (SVG simples, sem dependência extra) */
const Icon = {
  whatsapp: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2S21.8 6.6 21.8 12 17.4 21.8 12 21.8zM12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0z" /></svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" /></svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white"><path d="M9.8 15.2 9.4 20c.6 0 .8-.3 1.1-.6l2.7-2.6 5.6 4.1c1 .6 1.8.3 2-.9l3.7-17.2c.3-1.5-.6-2.1-1.6-1.7L1.2 9.5c-1.5.6-1.4 1.4-.3 1.8l5.6 1.7L19.4 4.9c.6-.4 1.2-.2.7.2" /></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.9h1.9L7.1 4.2h-2l11.9 16z" /></svg>
  ),
};

/**
 * Painel "Enviar": compartilhar nas redes + ajuda (reportar problema / falar com o suporte).
 */
export default function ShareSheet({
  open,
  onClose,
  title,
  url,
  novelSlug,
  episodeNumber,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  novelSlug?: string;
  episodeNumber?: number;
}) {
  const s = useSettings();
  const [view, setView] = useState<'share' | 'report'>('share');
  const text = `Estou assistindo "${title}" 😱 Assista grátis:`;
  const enc = encodeURIComponent;
  const wa = s.support_whatsapp.replace(/\D/g, '');

  const close = () => {
    setView('share');
    onClose();
  };

  const networks = [
    { name: 'WhatsApp', bg: 'bg-[#25D366]', icon: Icon.whatsapp, href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { name: 'Facebook', bg: 'bg-[#1877F2]', icon: Icon.facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: 'Telegram', bg: 'bg-[#229ED9]', icon: Icon.telegram, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { name: 'X', bg: 'bg-black ring-1 ring-white/20', icon: Icon.x, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const more = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* cancelado */
    }
  };

  return (
    <Modal open={open} onClose={close}>
      {view === 'share' ? (
        <>
          <h3 className="mb-4 pr-8 text-lg font-bold">Enviar para os amigos</h3>
          <div className="grid grid-cols-4 gap-3">
            {networks.map((n) => (
              <a key={n.name} href={n.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-xs text-white/75 hover:text-white">
                <span className={`grid h-14 w-14 place-items-center rounded-full ${n.bg} transition active:scale-90`}>{n.icon}</span>
                {n.name}
              </a>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={copy} className="btn-ghost flex-1 py-3">
              <Link2 className="h-4 w-4" /> Copiar link
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button onClick={more} className="btn-ghost flex-1 py-3">
                <Share className="h-4 w-4" /> Mais opções
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Precisa de ajuda?</p>
            <div className="grid gap-2">
              <button onClick={() => setView('report')} className="flex items-center gap-3 rounded-xl bg-white/[.05] px-4 py-3 text-left text-sm hover:bg-white/[.09]">
                <Flag className="h-5 w-5 text-amber-300" />
                <span>
                  <b className="block">Reportar um problema</b>
                  <span className="text-xs text-white/50">Vídeo travando, sem som, pagamento...</span>
                </span>
              </button>
              {wa ? (
                <a
                  href={`https://wa.me/${wa.startsWith('55') ? wa : `55${wa}`}?text=${enc(`Olá! Preciso de ajuda com a novela "${title}".`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white/[.05] px-4 py-3 text-sm hover:bg-white/[.09]"
                >
                  <MessageCircleQuestion className="h-5 w-5 text-emerald-300" />
                  <span>
                    <b className="block">Falar com o suporte</b>
                    <span className="text-xs text-white/50">Atendimento pelo WhatsApp</span>
                  </span>
                </a>
              ) : (
                <a href="/contato" className="flex items-center gap-3 rounded-xl bg-white/[.05] px-4 py-3 text-sm hover:bg-white/[.09]">
                  <MessageCircleQuestion className="h-5 w-5 text-emerald-300" />
                  <b>Falar com o suporte</b>
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setView('share')} className="mb-3 flex items-center gap-1 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h3 className="mb-4 text-lg font-bold">Reportar um problema</h3>
          <ReportForm novelSlug={novelSlug} episodeNumber={episodeNumber} onDone={close} />
        </>
      )}
    </Modal>
  );
}
