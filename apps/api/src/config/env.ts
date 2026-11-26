import path from 'path';
import dotenv from 'dotenv';

export const API_ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(API_ROOT, '.env') });

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

// aceita também PIX_ENVIRONMENT / PAGBANK_TOKEN (nomes alternativos)
const pagbankEnv = (process.env.PAGBANK_ENV || process.env.PIX_ENVIRONMENT || 'mock') as 'mock' | 'sandbox' | 'production';

export const env = {
  nodeEnv: req('NODE_ENV', 'development'),
  port: Number(req('PORT', '3333')),
  appUrl: req('APP_URL', 'http://localhost:5173'),
  publicApiUrl: req('PUBLIC_API_URL', 'http://localhost:3333'),
  jwtSecret: req('JWT_SECRET'),
  streamSecret: req('STREAM_SECRET'),
  streamTokenMinutes: Number(req('STREAM_TOKEN_MINUTES', '180')),
  db: {
    host: req('DB_HOST', '127.0.0.1'),
    port: Number(req('DB_PORT', '3306')),
    user: req('DB_USER', 'root'),
    password: req('DB_PASSWORD', ''),
    database: req('DB_NAME', 'tramovelatv'),
  },
  pagbank: {
    env: pagbankEnv,
    token:
      pagbankEnv === 'production'
        ? process.env.PAGBANK_TOKEN_PRODUCTION || process.env.PAGBANK_TOKEN || ''
        : process.env.PAGBANK_TOKEN_SANDBOX || process.env.PAGBANK_TOKEN || '',
    baseUrl:
      pagbankEnv === 'production' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com',
    // CPF/CNPJ do titular da conta PagBank: o PagBank exige um documento no pedido e o site não pede CPF ao comprador
    taxId: (process.env.PAGBANK_TAX_ID || '').replace(/\D/g, ''),
    pixExpirationMinutes: Number(req('PIX_EXPIRATION_MINUTES', '30')),
  },
  maxVideoSizeMb: Number(req('MAX_VIDEO_SIZE_MB', '2048')),
  seedAdmin: {
    name: req('SEED_ADMIN_NAME', 'Administrador'),
    email: req('SEED_ADMIN_EMAIL', 'admin@novelas.local'),
    password: req('SEED_ADMIN_PASSWORD', ''),
  },
  paths: {
    videos: path.join(API_ROOT, 'storage', 'videos'),
    uploads: path.join(API_ROOT, 'public', 'uploads'),
  },
};
