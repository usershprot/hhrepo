const CEREBRAS_POOL = [
    'csk-th8wnt28nc9tfcck6mjjmfkn4wf2f9j43v4mfe4rd3cmrcv8',
    'csk-yk8mfekexj5n96ej8m65y32ympcfw556n5y4rhf8xyywy5m2',
    'csk-mymvy3hvw89x95m4y8v8kxk2kvehd2m2jemvnewe6dypncfx'
];

// Твой список разрешенных ключей (теперь просто в коде)
const MY_VALID_KEYS = ['hh-admin-777', 'maxim-test-key', 'luchshemu-truvun'];

const TG_BOT_TOKEN = '8481727113:AAGXMtr5oT9z9wuZwFat04EQpTIolWpJWlQ';
const TG_CHAT_ID = '685467338';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const authHeader = req.headers['authorization'] || '';
    const userKey = authHeader.replace('Bearer ', '');

    // Простая проверка ключа без базы данных
    if (!MY_VALID_KEYS.includes(userKey)) {
        return res.status(401).json({ error: 'Invalid API Key' });
    }

    // Выбираем случайный ключ Cerebras
    const apiKey = CEREBRAS_POOL[Math.floor(Math.random() * CEREBRAS_POOL.length)];

    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: req.body.model || 'gpt-oss-120B',
                messages: req.body.messages,
                stream: false
            }),
        });

        const data = await response.json();

        // Лог в Телеграм (простой)
        fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: `📊 **HH-API Log**\n🔑 Key: \`${userKey}\`\n📈 Tokens: ${data.usage?.total_tokens || 0}`,
                parse_mode: 'Markdown'
            }),
        });

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
