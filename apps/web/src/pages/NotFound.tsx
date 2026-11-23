import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-gradient text-8xl font-black">404</p>
        <p className="mt-2 text-white/60">Essa página saiu de cena.</p>
        <Link to="/" className="btn-primary mt-6">Voltar ao início</Link>
      </div>
    </div>
  );
}
