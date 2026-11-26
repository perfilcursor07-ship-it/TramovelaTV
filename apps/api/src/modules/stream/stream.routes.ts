import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/knex';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/http';

export const streamRoutes = Router();

/**
 * Entrega o vídeo em partes (HTTP Range) a partir de um token temporário.
 * - O arquivo fica fora da pasta pública, então não há URL fixa para baixar.
 * - Recusa abertura direta na aba do navegador (Sec-Fetch-Dest: document).
 * Obs.: nenhuma proteção web é 100% contra gravação de tela; para nível "Netflix"
 * seria preciso HLS criptografado + DRM.
 */
streamRoutes.get(
  '/stream/:token',
  asyncHandler(async (req, res) => {
    let payload: { eid: number; pv?: number };
    try {
      payload = jwt.verify(req.params.token, env.streamSecret) as { eid: number; pv?: number };
    } catch {
      res.status(403).send('Link expirado.');
      return;
    }

    const dest = req.headers['sec-fetch-dest'];
    if (dest === 'document' || dest === 'iframe') {
      res.status(403).send('Acesso direto ao vídeo não é permitido.');
      return;
    }

    const ep = await db('episodes').where({ id: payload.eid }).first('video_path', 'video_mime', 'duration_seconds');
    if (!ep?.video_path) {
      res.status(404).end();
      return;
    }
    const file = path.join(env.paths.videos, path.basename(ep.video_path));
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(file);
    } catch {
      res.status(404).end();
      return;
    }

    const size = stat.size;
    const mime = ep.video_mime || 'video/mp4';
    const common = {
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      // cache só no navegador da pessoa (link é pessoal e expira): permite pré-carregar o próximo episódio
      'Cache-Control': 'private, max-age=600',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    };

    /**
     * Prévia: entrega só o começo do arquivo (proporcional aos segundos + margem).
     * Os últimos 2 MB também são liberados porque muitos MP4 guardam o índice
     * (moov) no final e o navegador precisa dele para começar a tocar.
     */
    let previewLimit = size - 1;
    const tailStart = Math.max(0, size - 2 * 1024 * 1024);
    if (payload.pv) {
      const dur = Number(ep.duration_seconds || 0);
      const ratio = dur > 0 ? Math.min(1, (payload.pv + 6) / dur) : 0.25;
      previewLimit = Math.max(512 * 1024, Math.floor(size * ratio)) - 1;
    }
    const allowed = (start: number) => start <= previewLimit || start >= tailStart;

    const range = req.headers.range;
    if (payload.pv && !range) {
      // prévia sempre por partes
      res.writeHead(206, { ...common, 'Content-Range': `bytes 0-${previewLimit}/${size}`, 'Content-Length': previewLimit + 1 });
      fs.createReadStream(file, { start: 0, end: previewLimit }).pipe(res);
      return;
    }
    if (!range) {
      res.writeHead(200, { ...common, 'Content-Length': size });
      fs.createReadStream(file).pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? parseInt(match[1], 10) : 0;
    let end = match?.[2] ? parseInt(match[2], 10) : Math.min(start + 2 * 1024 * 1024, size - 1);
    if (!match?.[1] && match?.[2]) {
      // bytes=-500 (últimos N bytes)
      start = Math.max(0, size - parseInt(match[2], 10));
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (payload.pv && start < size) {
      if (!allowed(start)) {
        // Depois do trecho da prévia: responde com bytes zerados em vez de erro.
        // Um 416 aqui faz o navegador abandonar o vídeo inteiro (ele baixa adiantado),
        // e o conteúdo real continua protegido.
        end = Math.min(end, tailStart - 1);
        res.writeHead(206, { ...common, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
        const zeros = Buffer.alloc(64 * 1024);
        let left = end - start + 1;
        const pump = () => {
          while (left > 0) {
            const n = Math.min(left, zeros.length);
            left -= n;
            if (!res.write(n === zeros.length ? zeros : zeros.subarray(0, n))) {
              res.once('drain', pump);
              return;
            }
          }
          res.end();
        };
        res.on('close', () => (left = 0));
        pump();
        return;
      }
      if (start <= previewLimit) end = Math.min(end, previewLimit);
    }
    if (start >= size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...common,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  }),
);
