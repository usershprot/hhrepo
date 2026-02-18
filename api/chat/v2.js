// Пул ключей от apifree.ai
const APIFREE_POOL = [
    'sk-pxdCMFEwzEkERDrTinhcZX4DT2iTY',
    'sk-pMrsYQrNm1HXSnhEb3J6K0kRKewkt'
];

// Твои личные ключи для доступа к прокси
const MY_VALID_KEYS = ['hh-admin-777', 'maxim-test-key', 'luchshemu-truvun'];

// Данные для уведомлений
const TG_BOT_TOKEN = '8481727113:AAGXMtr5oT9z9wuZwFat04EQpTIolWpJWlQ';
const TG_CHAT_ID = '685467338';

export default async function handler(req, res) {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const authHeader = req.headers['authorization'] || '';
    const userKey = authHeader.replace('Bearer ', '');

    // 1. Проверка твоего личного ключа
    if (!MY_VALID_KEYS.includes(userKey)) {
        return res.status(401).json({ error: 'Invalid Personal API Key' });
    }

    // 2. Выбираем случайный ключ apifree из пула
    const selectedApiKey = APIFREE_POOL[Math.floor(Math.random() * APIFREE_POOL.length)];

    try {
        // 3. Запрос к провайдеру apifree.ai
        const response = await fetch('https://api.apifree.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${selectedApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: req.body.model || 'gpt-4o', // Модель по умолчанию
                messages: req.body.messages,
                stream: false // Для простоты логов используем false
            }),
        });

        const data = await response.json();

        // 4. Отправка лога в твой Telegram (фоном)
        fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: `📊 **APIFREE Proxy Log**\n🔑 User: \`${userKey}\`\n🤖 Model: \`${req.body.model || 'gpt-4o'}\`\n📈 Tokens: ${data.usage?.total_tokens || 'unknown'}`,
                parse_mode: 'Markdown'
            }),
        }).catch(err => console.error('TG Log Error:', err));

        // 5. Возвращаем результат
        return res.status(response.status).json(data);

    } catch (error) {
        return res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}
