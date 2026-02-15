const CEREBRAS_POOL = [
  'csk-th8wnt28nc9tfcck6mjjmfkn4wf2f9j43v4mfe4rd3cmrcv8',
  'csk-yk8mfekexj5n96ej8m65y32ympcfw556n5y4rhf8xyywy5m2',
  'csk-mymvy3hvw89x95m4y8v8kxk2kvehd2m2jemvnewe6dypncfx'
];

const MY_VALID_KEYS = ['hh-admin-777', 'maxim-dev-key'];

// Твои данные Telegram
const TG_BOT_TOKEN = '8481727113:AAGXMtr5oT9z9wuZwFat04EQpTIolWpJWlQ';
const TG_CHAT_ID = '685467338';

async function sendLogToTG(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: `📊 **HH-API Log**\n${message}`,
        parse_mode: 'Markdown'
      }),
    });
  } catch (e) { console.error('TG Error'); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const userKey = req.headers['authorization']?.replace('Bearer ', '');
  const { messages, model = 'llama3.1-8b' } = req.body;
  const userPrompt = messages?.[messages.length - 1]?.content || 'Пустой запрос';

  // 1. Проверка доступа к твоему API
  if (!userKey || !MY_VALID_KEYS.includes(userKey)) {
    await sendLogToTG(`🚫 **Отказ в доступе!**\nКлюч: \`${userKey}\`\nТекст: ${userPrompt}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Перемешиваем ключи, чтобы каждый раз пробовать разные
  const shuffledKeys = [...CEREBRAS_POOL].sort(() => Math.random() - 0.5);
  
  let lastError = null;

  // 2. Попытка выполнить запрос (цикл по ключам если один упадет)
  for (const apiKey of shuffledKeys) {
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
      });

      const data = await response.json();

      if (response.ok) {
        const duration = (Date.now() - startTime) / 1000;
        const keyId = apiKey.slice(-4);

        await sendLogToTG(
          `✅ **Успех (Ключ ...${keyId})**\n` +
          `🔑 Client: \`${userKey}\`\n` +
          `⏱ Время: ${duration}с\n` +
          `📈 Токены: ${data.usage?.total_tokens || 0}\n` +
          `👤 Запрос: ${userPrompt.substring(0, 100)}`
        );

        return res.status(200).json(data);
      } else {
        lastError = data.error?.message || 'Cerebras Error';
        console.log(`Ключ ...${apiKey.slice(-4)} не сработал, пробуем следующий...`);
      }
    } catch (error) {
      lastError = error.message;
    }
  }

  // Если ни один ключ не сработал
  await sendLogToTG(`❌ **Все ключи исчерпаны или ошибка!**\nОшибка: ${lastError}`);
  res.status(500).json({ error: 'All API keys failed', details: lastError });
}
