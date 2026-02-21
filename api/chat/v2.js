// Пул ключей от apifree.ai
const APIFREE_POOL = [
    'sk-pxdCMFEwzEkERDrTinhcZX4DT2iTY',
    'sk-pMrsYQrNm1HXSnhEb3J6K0kRKewkt'
];

// Твои личные ключи для доступа к прокси
const MY_VALID_KEYS = ['max1mapp', 'luchshemu-truvun'];

// Список ID пользователей для логов
const LOG_RECIPIENTS = ['685467338', '7791830212'];
const TG_BOT_TOKEN = '8481727113:AAGXMtr5oT9z9wuZwFat04EQpTIolWpJWlQ';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const authHeader = req.headers['authorization'] || '';
    const userKey = authHeader.replace('Bearer ', '');

    if (!MY_VALID_KEYS.includes(userKey)) {
        return res.status(401).json({ error: 'Invalid Personal API Key' });
    }

    const selectedApiKey = APIFREE_POOL[Math.floor(Math.random() * APIFREE_POOL.length)];

    try {
        const response = await fetch('https://api.apifree.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${selectedApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: req.body.model || 'gpt-4o',
                messages: req.body.messages,
                stream: false
            }),
        });

        const data = await response.json();

        // Формируем текст лога
        const logText = `📊 **HH-API Proxy Log**\n🔑 User: \`${userKey}\`\n🤖 Model: \`${req.body.model || 'gpt-4o'}\`\n📈 Tokens: ${data.usage?.total_tokens || 'unknown'}`;

        // Отправляем логи обоим пользователям параллельно
        await Promise.all(LOG_RECIPIENTS.map(chatId => 
            fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: logText,
                    parse_mode: 'Markdown'
                }),
            }).catch(err => console.error(`Error sending to ${chatId}:`, err))
        ));

        return res.status(response.status).json(data);

    } catch (error) {
        return res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
