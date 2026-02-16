import { kv } from '@vercel/kv';

// Установи свой пароль здесь!
const ADMIN_PASSWORD = "maxim_admin_2026"; 

export default async function handler(req, res) {
  // 1. Настройка заголовков CORS (чтобы admin.html мог делать запросы)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, key, limit, pass } = req.query;

  // 2. Проверка пароля
  if (pass !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Неверный пароль администратора" });
  }

  try {
    // --- ДЕЙСТВИЕ: СОЗДАТЬ ИЛИ ОБНОВИТЬ КЛЮЧ ---
    if (action === 'set') {
      if (!key) return res.status(400).json({ error: "Укажите имя ключа" });
      
      const newData = {
        used: 0,
        limit: parseInt(limit) || 100000,
        total_all_time: 0,
        created: new Date().toISOString()
      };
      
      await kv.set(`key:${key}`, newData);
      await kv.sadd('all_keys', key); // Добавляем в список всех ключей
      
      return res.json({ status: 'success', message: `Ключ ${key} сохранен` });
    }

    // --- ДЕЙСТВИЕ: ПОЛУЧИТЬ СТАТИСТИКУ ---
    if (action === 'stats') {
      const keys = await kv.smembers('all_keys');
      const stats = {};
      
      for (const k of keys) {
        const data = await kv.get(`key:${k}`);
        if (data) stats[k] = data;
      }
      
      return res.json(stats);
    }

    // --- ДЕЙСТВИЕ: УДАЛИТЬ КЛЮЧ ---
    if (action === 'del') {
      if (!key) return res.status(400).json({ error: "Укажите ключ" });
      
      await kv.del(`key:${key}`);
      await kv.srem('all_keys', key);
      
      return res.json({ status: 'success', message: `Ключ ${key} удален` });
    }

    // --- ДЕЙСТВИЕ: СБРОСИТЬ ВСЕ ЛИМИТЫ (ОБНУЛЕНИЕ) ---
    if (action === 'reset_all') {
      const keys = await kv.smembers('all_keys');
      
      for (const k of keys) {
        const data = await kv.get(`key:${k}`);
        if (data) {
          data.used = 0; // Сбрасываем только текущий расход
          await kv.set(`key:${k}`, data);
        }
      }
      
      return res.json({ status: 'success', message: "Все лимиты обнулены" });
    }

    return res.status(400).json({ error: "Неизвестное действие" });

  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ error: "Ошибка сервера базы данных" });
  }
}
