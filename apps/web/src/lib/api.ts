import { createApi } from '@novelas/shared';

export const TOKEN_KEY = 'tnv_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const api = createApi({
  baseUrl: import.meta.env.VITE_API_URL || '',
  getToken,
  onUnauthorized: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('tnv:logout'));
  },
});

export const media = api.mediaUrl;

/** Upload com barra de progresso (fetch não expõe progresso de envio) */
export function uploadWithProgress<T>(
  method: 'POST' | 'PUT',
  path: string,
  form: FormData,
  onProgress: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${import.meta.env.VITE_API_URL || ''}/api${path}`);
    const t = getToken();
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.message || `Erro ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload.'));
    xhr.send(form);
  });
}

/** Lê a duração de um arquivo de vídeo no navegador */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Math.round(v.duration || 0));
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}
