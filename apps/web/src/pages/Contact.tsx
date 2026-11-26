import { Mail, MessageCircle } from 'lucide-react';
import { useSettings } from '../lib/settings';
import ReportForm from '../components/ReportForm';

/** Página de contato: WhatsApp, e-mail e formulário de problema. */
export default function Contact() {
  const s = useSettings();
  const wa = s.support_whatsapp.replace(/\D/g, '');
  const waLink = wa ? `https://wa.me/${wa.startsWith('55') ? wa : `55${wa}`}?text=${encodeURIComponent('Olá! Preciso de ajuda no site.')}` : '';

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <h1 className="text-3xl font-extrabold tracking-tight">Contato e ajuda</h1>
      <p className="mt-2 text-sm text-white/60">Teve algum problema com um vídeo, com o pagamento ou com sua conta? Fale com a gente.</p>

      {(waLink || s.support_email) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 hover:border-emerald-400/40">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#25D366]">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span>
                <b className="block">WhatsApp</b>
                <span className="text-xs text-white/50">Resposta mais rápida</span>
              </span>
            </a>
          )}
          {s.support_email && (
            <a href={`mailto:${s.support_email}`} className="card flex items-center gap-3 p-4 hover:border-brand-500/40">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500">
                <Mail className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <b className="block">E-mail</b>
                <span className="block truncate text-xs text-white/50">{s.support_email}</span>
              </span>
            </a>
          )}
        </div>
      )}

      <div className="card mt-6 p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Reportar um problema</h2>
        <ReportForm />
      </div>
    </div>
  );
}
