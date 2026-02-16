import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = "maxim_admin_2026"; 

export default async function handler(req, res) {
  // Настройка CORS — разрешаем запросы отовсюду
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Обработка предварительного запроса браузера (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, key, limit, pass } = req.query;

  // Проверка пароля
  if (pass !== ADMIN_PASSWORD) {
    // Важно: возвращаем JSON, чтобы фронтенд не сломался
    return res.status(403).json({ error: "Неверный пароль" });
  }

  try {
    if (action === 'set') {
      const newData = {
        used: 0,
        limit: parseInt(limit) || 100000,
        total_all_time: 0,
        created: new Date().toISOString()
      };
      await kv.set(`key:${key}`, newData);
      await kv.sadd('all_keys', key);
      return res.json({ status: 'success' });
    }

    if (action === 'stats') {
      const keys = await kv.smembers('all_keys');
      const stats = {};
      for (const k of keys) {
        const data = await kv.get(`key:${k}`);
        if (data) stats[k] = data;
      }
      return res.json(stats);
    }

    if (action === 'del') {
      await kv.del(`key:${key}`);
      await kv.srem('all_keys', key);
      return res.json({ status: 'success' });
    }

    if (action === 'reset_all') {
      const keys = await kv.smembers('all_keys');
      for (const k of keys) {
        const d = await kv.get(`key:${k}`);
        if (d) { d.used = 0; await kv.set(`key:${k}`, d); }
      }
      return res.json({ status: 'success' });
    }

    return res.status(400).json({ error: "Action not found" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
