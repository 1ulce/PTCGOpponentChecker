import { handleOptions, setCorsHeaders } from './_http.js';

export default function handler(req: { method?: string }, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
}): void {
  setCorsHeaders(res);

  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({ status: 'ok' });
}
