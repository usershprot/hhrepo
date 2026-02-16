import { kv } from '@vercel/kv';

const CEREBRAS_POOL = [
    'csk-th8wnt28nc9tfcck6mjjmfkn4wf2f9j43v4mfe4rd3cmrcv8',
    'csk-yk8mfekexj5n96ej8m65y32ympcfw556n5y4rhf8xyywy5m2',
    'csk-mymvy3hvw89x95m4y8v8kxk2kvehd2m2jemvnewe6dypncfx'
];

const TG_CONFIG = {
    token: '8481727113:AAGXMtr5oT9z9wuZwFat04EQpTIolWpJWlQ',
    chatId: '685467338'
};

async function logToTG(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TG_CONFIG.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CONFIG.chatId, text: message, parse_mode: 'Markdown' }),
        });
    } catch (e) { console.error('TG Log Error'); }
}

export default async function handler(req, res) {
    // Настройка CORS для работы с любыми сайтами и SDK
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

    const authHeader = req.headers['authorization'] || '';
    const userKey = authHeader.replace('Bearer ', '');

    // 1. Проверка твоего ключа в базе Vercel KV
    const keyData = await kv.get(`key:${userKey}`);
    if (!keyData) {
        await logToTG(`🚫 **Взломать пытались?**\nНеверный ключ: \`${userKey}\``);
        return res.status(401).json({ error: 'Invalid API Key. Создайте его в /admin.html' });
    }

    if (keyData.used >= keyData.limit) {
        return res.status(429).json({ error: 'Token limit exceeded' });
    }

    // 2. Ротация ключей Cerebras
    const randomCerebrasKey = CEREBRAS_POOL[Math.floor(Math.random() * CEREBRAS_POOL.length)];

    try {
        const cerebrasResponse = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${randomCerebrasKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: req.body.model || 'llama3.1-8b',
                messages: req.body.messages,
                stream: req.body.stream || false, // Поддержка стриминга
                temperature: req.body.temperature || 0.7
            })
        });

        // 3. Обработка стриминга (если юзер передал stream: true)
        if (req.body.stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = cerebrasResponse.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value); // Пробрасываем чанки данных напрямую
            }
            
            await logToTG(`🚀 **Stream Finish**\n🔑 Key: \`${userKey}\``);
            return res.end();
        }

        // 4. Обычный ответ (не стрим)
        const data = await cerebrasResponse.json();
        const usage = data.usage?.total_tokens || 0;

        // Обновляем статистику в базе
        keyData.used += usage;
        keyData.total_all_time = (keyData.total_all_time || 0) + usage;
        await kv.set(`key:${userKey}`, keyData);

        await logToTG(`✅ **Success**\n🔑 Key: \`${userKey}\`\n📈 Tokens: ${usage}\n🔋 Left: ${keyData.limit - keyData.used}`);
        
        return res.status(200).json(data);

    } catch (error) {
        await logToTG(`❌ **API Error**\n${error.message}`);
        return res.status(500).json({ error: 'Cerebras connection failed' });
    }
}
