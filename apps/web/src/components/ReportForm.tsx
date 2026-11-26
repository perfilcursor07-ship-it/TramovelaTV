import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Send } from 'lucide-react';
import { REPORT_TYPE_LABELS, type ReportType } from '@novelas/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from './ui';

/** Formulário de "reportar problema". Guarda junto a novela/episódio de onde veio. */
export default function ReportForm({
  novelSlug,
  episodeNumber,
  onDone,
}: {
  novelSlug?: string;
  episodeNumber?: number;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>('video');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.support.report({
        type,
        message: message.trim(),
        contact: contact.trim() || undefined,
        novel_slug: novelSlug,
        episode_number: episodeNumber,
        page_url: window.location.pathname,
      });
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center animate-float-up">
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        <h3 className="text-lg font-bold">Recebemos seu aviso!</h3>
        <p className="text-sm text-white/60">Nossa equipe vai verificar e, se precisar, entra em contato com você.</p>
        {onDone && (
          <button onClick={onDone} className="btn-primary mt-3 w-full">
            Fechar
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">O que aconteceu?</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
          {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((k) => (
            <option key={k} value={k}>
              {REPORT_TYPE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Conte o que aconteceu</label>
        <textarea
          className="input min-h-[100px]"
          placeholder={type === 'payment' ? 'Ex.: paguei o Pix às 14h e os episódios não liberaram' : 'Descreva o problema'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={5}
          maxLength={2000}
        />
      </div>
      {!user && (
        <div>
          <label className="label">Seu e-mail ou WhatsApp</label>
          <input className="input" placeholder="Para podermos responder" value={contact} onChange={(e) => setContact(e.target.value)} required />
        </div>
      )}
      <button disabled={busy} className="btn-primary w-full py-3">
        {busy ? <Spinner className="h-5 w-5" /> : <><Send className="h-4 w-4" /> Enviar</>}
      </button>
    </form>
  );
}
