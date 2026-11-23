import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

fs.mkdirSync(env.paths.videos, { recursive: true });
fs.mkdirSync(path.join(env.paths.uploads, 'images'), { recursive: true });

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    // vídeos ficam FORA da pasta pública
    cb(null, file.fieldname === 'video' ? env.paths.videos : path.join(env.paths.uploads, 'images'));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxVideoSizeMb * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'video') {
      if (!VIDEO_MIMES.includes(file.mimetype)) return cb(new HttpError(400, 'Formato de vídeo não suportado (use MP4/WebM).'));
    } else if (!IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new HttpError(400, 'Imagem inválida (use JPG, PNG ou WebP).'));
    }
    cb(null, true);
  },
});

export const publicImageUrl = (file?: Express.Multer.File) => (file ? `/uploads/images/${file.filename}` : undefined);

export function removeLocalImage(url?: string | null) {
  if (!url || !url.startsWith('/uploads/')) return;
  const p = path.join(env.paths.uploads, url.replace('/uploads/', ''));
  fs.promises.unlink(p).catch(() => undefined);
}

export function removeVideo(videoPath?: string | null) {
  if (!videoPath) return;
  fs.promises.unlink(path.join(env.paths.videos, path.basename(videoPath))).catch(() => undefined);
}
