import asyncio
import random
import logging
import sqlite3
import aiohttp
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    LabeledPrice, PreCheckoutQuery
)
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.context import FSMContext

# === НАСТРОЙКИ ===
BOT_TOKEN = "8512020586:AAGyzxVIWDgGG6Kei5lsyKrN7MBCnCrjwX8"
CRYPTOPAY_TOKEN = "487540:AAt4VLYIGuNsgQMuTyZ4RUeNQj3UOhBQnSX"
ADMIN_ID = 685467338

# КАНАЛЫ
MAIN_CHANNEL = -1003323445468
FEMBOY_CHANNEL = -1003498432813
ANIME_CHANNEL = -1003496410192
COMICS_CHANNEL = -1003400808401
LOG_CHANNEL_ID = -1003392082006

# ЦЕНЫ
PRICE = {'main': 20, 'femboy': 15, 'anime': 30, 'comics': 10}
SUB_PRICE = {'week': 20, 'month': 50}
REF_PERCENT = 5
PHOTO_DELAY = 4
CACHE_INTERVAL = 21600  # 6 часов

# === ИНИЦИАЛИЗАЦИЯ ===
default = DefaultBotProperties(parse_mode='HTML')
bot = Bot(token=BOT_TOKEN, default=default)
dp = Dispatcher(storage=MemoryStorage())
logging.basicConfig(level=logging.INFO)

conn = sqlite3.connect('bot.db', check_same_thread=False)
cursor = conn.cursor()

# Создание таблиц
cursor.executescript('''
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 0,
    photos_left INTEGER DEFAULT 0,
    last_category TEXT,
    referrer_id INTEGER,
    earned REAL DEFAULT 0,
    sub_end INTEGER DEFAULT 0,
    last_photo_time INTEGER DEFAULT 0,
    test_given INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    join_date TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (file_id TEXT PRIMARY KEY, category TEXT);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    amount REAL, 
    currency TEXT, 
    type TEXT, 
    date TEXT
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    amount REAL, 
    status TEXT, 
    date TEXT
);
''')
conn.commit()

# === EMOJI ===
class Emoji:
    MONEY = "💳"
    PHOTO = "🖼"
    SUB = "⭐"
    REF = "👥"
    WITHDRAW = "💰"
    STATS = "📊"
    BACK = "⬅️"
    BUY = "🛒"
    CHECK = "✅"
    CRYPTO = "₿"
    STAR = "⭐"
    TIME = "⏰"
    USER = "👤"
    ADMIN = "⚡"
    CATEGORY = "📁"
    BALANCE = "💎"
    SETTINGS = "⚙️"
    SUPPORT = "💬"
    HISTORY = "📈"
    CROWN = "👑"
    GIFT = "🎁"
    FIRE = "🔥"
    LOCK = "🔒"
    UNLOCK = "🔓"

# === FSM ===
class AdminStates(StatesGroup):
    broadcast = State()
    withdraw = State()
    find_user = State()

class UserStates(StatesGroup):
    feedback = State()
    withdraw_amount = State()

# === ЛОГИ ===
async def log(text: str):
    try:
        await bot.send_message(LOG_CHANNEL_ID, text, disable_web_page_preview=True)
    except Exception:
        pass

# === КЛАВИАТУРЫ ===
def main_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"{Emoji.PHOTO} Получить фото", callback_data="get_photo"),
            InlineKeyboardButton(text=f"{Emoji.BALANCE} Баланс", callback_data="balance")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BUY} Купить доступ", callback_data="buy_menu"),
            InlineKeyboardButton(text=f"{Emoji.SUB} Подписка", callback_data="buy_sub")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.REF} Рефералы", callback_data="referrals"),
            InlineKeyboardButton(text=f"{Emoji.WITHDRAW} Вывести", callback_data="withdraw")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.SETTINGS} Профиль", callback_data="profile"),
            InlineKeyboardButton(text=f"{Emoji.SUPPORT} Поддержка", callback_data="support")
        ]
    ])

def buy_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"🎭 Основной", callback_data="buy_main"),
            InlineKeyboardButton(text=f"👗 Фембои", callback_data="buy_femboy")
        ],
        [
            InlineKeyboardButton(text=f"🇯🇵 Аниме", callback_data="buy_anime"),
            InlineKeyboardButton(text=f"📚 Комиксы", callback_data="buy_comics")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")
        ]
    ])

def payment_methods(category):
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"{Emoji.STAR} Stars", callback_data=f"stars_{category}"),
            InlineKeyboardButton(text=f"{Emoji.CRYPTO} CryptoBot", callback_data=f"crypto_{category}")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="buy_menu")
        ]
    ])

def subscription_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"{Emoji.TIME} 7 дней — {SUB_PRICE['week']}₽", callback_data="sub_week"),
            InlineKeyboardButton(text=f"{Emoji.TIME} 30 дней — {SUB_PRICE['month']}₽", callback_data="sub_month")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")
        ]
    ])

def back_to_main():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"{Emoji.BACK} Главное меню", callback_data="back_main")]
    ])

def admin_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"{Emoji.STATS} Статистика", callback_data="admin_stats"),
            InlineKeyboardButton(text=f"📢 Рассылка", callback_data="admin_broadcast")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.MONEY} Вывод", callback_data="admin_withdraw"),
            InlineKeyboardButton(text=f"🔄 Кэш", callback_data="admin_cache")
        ],
        [
            InlineKeyboardButton(text=f"📊 Детальная стата", callback_data="admin_detailed_stats"),
            InlineKeyboardButton(text=f"👤 Поиск юзера", callback_data="admin_find_user")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")
        ]
    ])

def withdraw_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=f"💰 Вывести на баланс", callback_data="withdraw_balance"),
            InlineKeyboardButton(text=f"💳 К банковской карте", callback_data="withdraw_card")
        ],
        [
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")
        ]
    ])

def choose_category():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🎭 Основной", callback_data="set_main"),
            InlineKeyboardButton(text="👗 Фембои", callback_data="set_femboy")
        ],
        [
            InlineKeyboardButton(text="🇯🇵 Аниме", callback_data="set_anime"),
            InlineKeyboardButton(text="📚 Комиксы", callback_data="set_comics")
        ],
        [
            InlineKeyboardButton(text="⭐ Все (подписка)", callback_data="set_random"),
            InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")
        ]
    ])

# === КЭШ ФОТО (ДЛЯ AIORAM 3.7+ С get_message) ===
async def cache_photos():
    try:
        cursor.execute("DELETE FROM photos")
        channels = {
            'main': MAIN_CHANNEL,
            'femboy': FEMBOY_CHANNEL,
            'anime': ANIME_CHANNEL,
            'comics': COMICS_CHANNEL
        }
        total = 0
        
        for cat, channel_id in channels.items():
            try:
                # Получаем ID последнего сообщения
                chat_info = await bot.get_chat(chat_id=channel_id)
                last_msg_id = chat_info.last_message_id or 0
                
                if last_msg_id == 0:
                    await log(f"⚠️ Не удалось получить ID последнего сообщения в {cat}")
                    continue
                
                # Проверяем последние 500 сообщений (чтобы не грузить долго)
                start_id = max(1, last_msg_id - 500)
                
                for msg_id in range(start_id, last_msg_id + 1):
                    try:
                        msg = await bot.get_message(chat_id=channel_id, message_id=msg_id)
                        if msg.photo:
                            file_id = msg.photo[-1].file_id
                            cursor.execute("INSERT OR IGNORE INTO photos (file_id, category) VALUES (?, ?)", (file_id, cat))
                            total += 1
                    except Exception:
                        continue  # Пропускаем удалённые/недоступные сообщения
                        
            except Exception as e:
                await log(f"❌ Ошибка кэша {cat}: {str(e)}")
        
        conn.commit()
        await log(f"🔄 Кэш обновлён: {total} фото")
        return total
    except Exception as e:
        await log(f"❌ Критическая ошибка кэша: {str(e)}")
        return 0

# === СТАРТ ===
@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    args = message.text.split()
    ref_id = int(args[1]) if len(args) > 1 and args[1].isdigit() else None

    cursor.execute("INSERT OR IGNORE INTO users (user_id, referrer_id, test_given, join_date) VALUES (?, ?, 0, datetime('now'))", 
                   (user_id, ref_id))
    
    if ref_id and ref_id != user_id:
        cursor.execute("SELECT 1 FROM users WHERE user_id = ?", (ref_id,))
        if cursor.fetchone():
            bonus = 5.0
            cursor.execute("UPDATE users SET balance = balance + ?, earned = earned + ? WHERE user_id = ?", 
                         (bonus, bonus, ref_id))
            try:
                await bot.send_message(ref_id, 
                                     f"🎉 Новый реферал!\n+{bonus}₽ на баланс", 
                                     reply_markup=main_menu())
            except:
                pass

    conn.commit()

    cursor.execute("SELECT test_given, sub_end FROM users WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    test_given, sub_end = result if result else (0, 0)

    welcome_text = f"""<b>🎭 18+ Фото Бот</b>

{Emoji.STAR} <b>1 звезда = 1 рубль</b>
{Emoji.PHOTO} <b>Бесплатный тест:</b> 1 день доступа

💎 <b>Реферальная система:</b>
• 5% от покупок рефералов
• +5₽ за каждого приглашенного

🛍 <b>Доступные категории:</b>
• 🎭 Основной — {PRICE['main']}₽
• 👗 Фембои — {PRICE['femboy']}₽
• 🇯🇵 Аниме — {PRICE['anime']}₽
• 📚 Комиксы — {PRICE['comics']}₽

⭐ <b>Подписка:</b>
• 7 дней — {SUB_PRICE['week']}₽
• 30 дней — {SUB_PRICE['month']}₽"""

    if not test_given:
        test_end = int((datetime.now() + timedelta(days=1)).timestamp())
        cursor.execute("UPDATE users SET sub_end = ?, test_given = 1 WHERE user_id = ?", (test_end, user_id))
        conn.commit()
        welcome_text += f"\n\n🎁 <b>Вам активирован тестовый период на 24 часа!</b>"
        await log(f"🎁 ТЕСТ: {user_id}")

    bot_info = await bot.get_me()
    ref_link = f"t.me/{bot_info.username}?start={user_id}"
    welcome_text += f"\n\n👥 <b>Ваша реферальная ссылка:</b>\n<code>{ref_link}</code>"

    await message.answer(welcome_text, reply_markup=main_menu())
    await log(f"👤 Старт: {user_id}")

# === ОБРАБОТКА КНОПОК ===
@dp.callback_query(F.data == "back_main")
async def back_main(callback: types.CallbackQuery):
    await callback.message.edit_text("🏠 <b>Главное меню</b>", reply_markup=main_menu())

@dp.callback_query(F.data == "buy_menu")
async def buy_menu_handler(callback: types.CallbackQuery):
    text = """🛍 <b>Выберите категорию:</b>

• 🎭 Основной — 15 фото за 20₽
• 👗 Фембои — 15 фото за 15₽
• 🇯🇵 Аниме — 15 фото за 30₽
• 📚 Комиксы — 15 фото за 10₽

💎 <b>При покупке вы получаете:</b>
• 15 фото выбранной категории
• Доступ к категории навсегда
• Возможность покупать фото по 1 шт."""
    await callback.message.edit_text(text, reply_markup=buy_menu())

@dp.callback_query(F.data.startswith("buy_"))
async def buy(callback: types.CallbackQuery):
    action = callback.data.split("_")[1]
    if action == "sub":
        text = f"""⭐ <b>Подписка на все категории</b>

Преимущества подписки:
• Доступ ко всем категориям
• Неограниченное количество фото
• Приоритетная загрузка
• Новые фото первыми

💎 <b>Варианты:</b>
• {Emoji.TIME} 7 дней — {SUB_PRICE['week']}₽
• {Emoji.TIME} 30 дней — {SUB_PRICE['month']}₽"""
        await callback.message.edit_text(text, reply_markup=subscription_menu())
        return

    category_names = {
        'main': '🎭 Основной',
        'femboy': '👗 Фембои', 
        'anime': '🇯🇵 Аниме',
        'comics': '📚 Комиксы'
    }
    
    amount = PRICE[action]
    text = f"""🛍 <b>{category_names[action]}</b>

💎 <b>Стоимость:</b> {amount}₽
📦 <b>Что получаете:</b>
• 15 фото сразу
• Постоянный доступ к категории
• Возможность докупать фото по 1 шт.

💳 <b>Выберите способ оплаты:</b>"""

    await callback.message.edit_text(text, reply_markup=payment_methods(action))

@dp.callback_query(F.data == "profile")
async def profile(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    
    cursor.execute("""
    SELECT balance, photos_left, sub_end, earned, total_spent, join_date, last_category
    FROM users WHERE user_id = ?
    """, (user_id,))
    result = cursor.fetchone()
    
    if not result:
        await callback.answer("❌ Ошибка получения данных", show_alert=True)
        return
        
    bal, left, sub, earned, spent, join_date, last_cat = result

    # Статистика фото
    cursor.execute("SELECT COUNT(*) FROM photos")
    total_photos = cursor.fetchone()[0]

    # Подписка
    now = int(datetime.now().timestamp())
    if sub and sub > now:
        sub_text = f"Активна до {datetime.fromtimestamp(sub).strftime('%d.%m.%Y %H:%M')}"
        sub_days = (sub - now) // 86400
        sub_text += f"\nОсталось: {sub_days} дней"
    else:
        sub_text = "Не активна"

    # Реферальная статистика
    cursor.execute("SELECT COUNT(*) FROM users WHERE referrer_id = ?", (user_id,))
    ref_count = cursor.fetchone()[0]

    # Текущая категория
    cat_names = {
        'main': '🎭 Основной',
        'femboy': '👗 Фембои', 
        'anime': '🇯🇵 Аниме',
        'comics': '📚 Комиксы',
        'random': '⭐ Все (рандом)'
    }
    current_cat = cat_names.get(last_cat, 'Не выбрана')

    profile_text = f"""<b>{Emoji.USER} Ваш профиль</b>

{Emoji.BALANCE} <b>Баланс:</b> {bal:.2f}₽
{Emoji.PHOTO} <b>Доступно фото:</b> {left}
{Emoji.SUB} <b>Подписка:</b> {sub_text}
{Emoji.CATEGORY} <b>Текущая категория:</b> {current_cat}
{Emoji.REF} <b>Рефералы:</b> {ref_count} чел.
{Emoji.MONEY} <b>Заработано с рефов:</b> {earned:.2f}₽
{Emoji.HISTORY} <b>Всего потрачено:</b> {spent:.2f}₽
{Emoji.TIME} <b>В базе с:</b> {join_date[:10] if join_date else 'Неизвестно'}

📊 <b>Всего фото в базе:</b> {total_photos}"""

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📁 Сменить категорию", callback_data="choose_category")],
        [InlineKeyboardButton(text=f"{Emoji.BACK} Назад", callback_data="back_main")]
    ])

    await callback.message.edit_text(profile_text, reply_markup=kb)

@dp.callback_query(F.data == "choose_category")
async def choose_category_handler(callback: types.CallbackQuery):
    text = """📁 <b>Выберите категорию для получения фото:</b>

Если у вас есть подписка — можно получать рандомные фото из всех категорий."""
    await callback.message.edit_text(text, reply_markup=choose_category())

@dp.callback_query(F.data.startswith("set_"))
async def set_category(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    action = callback.data.split("_")[1]
    
    cat_names = {
        'main': '🎭 Основной',
        'femboy': '👗 Фембои', 
        'anime': '🇯🇵 Аниме',
        'comics': '📚 Комиксы',
        'random': '⭐ Все (рандом)'
    }
    
    new_cat = action if action != 'random' else None  # None означает рандом при наличии подписки
    cursor.execute("UPDATE users SET last_category = ? WHERE user_id = ?", (new_cat, user_id))
    conn.commit()
    
    cat_display = cat_names.get(action, 'Не выбрана')
    
    await callback.message.edit_text(
        f"✅ <b>Категория установлена:</b> {cat_display}",
        reply_markup=main_menu()
    )

@dp.callback_query(F.data == "referrals")
async def referrals(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    bot_info = await bot.get_me()
    ref_link = f"t.me/{bot_info.username}?start={user_id}"
    
    cursor.execute("SELECT COUNT(*), COALESCE(SUM(earned), 0) FROM users WHERE referrer_id = ?", (user_id,))
    result = cursor.fetchone()
    ref_count, total_earned = result if result else (0, 0)

    ref_text = f"""<b>{Emoji.REF} Реферальная система</b>

👥 <b>Приглашено:</b> {ref_count} человек
💰 <b>Заработано:</b> {total_earned:.2f}₽

🎁 <b>Условия:</b>
• +5₽ за каждого приглашенного
• +5% от всех покупок реферала

📢 <b>Ваша ссылка:</b>
<code>{ref_link}</code>

💡 <b>Приглашайте друзей и зарабатывайте!</b>"""

    await callback.message.edit_text(ref_text, reply_markup=back_to_main())

@dp.callback_query(F.data == "withdraw")
async def withdraw_handler(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    cursor.execute("SELECT balance FROM users WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    balance = result[0] if result else 0
    
    if balance < 10:
        await callback.answer(f"❌ Минимальная сумма вывода: 10₽\nВаш баланс: {balance:.2f}₽", show_alert=True)
        return
        
    text = f"""<b>{Emoji.WITHDRAW} Вывод средств</b>

💎 <b>Доступно для вывода:</b> {balance:.2f}₽
💰 <b>Минимальная сумма:</b> 10₽

💳 <b>Способы вывода:</b>
• На баланс бота (мгновенно)
• На банковскую карту (1-3 дня)

⚠️ <b>Внимание:</b> Вывод осуществляется в рабочие дни с 10:00 до 18:00"""

    await callback.message.edit_text(text, reply_markup=withdraw_menu())

@dp.callback_query(F.data == "support")
async def support(callback: types.CallbackQuery):
    support_text = f"""<b>{Emoji.SUPPORT} Поддержка</b>

💬 <b>По всем вопросам:</b>
• Технические проблемы
• Вопросы по оплате
• Предложения по улучшению

📧 <b>Связь:</b> @admin_username

⏰ <b>Время ответа:</b> 1-12 часов

⚠️ <b>Перед обращением:</b>
1. Проверьте раздел FAQ
2. Убедитесь что оплата прошла
3. Подготовьте скриншот проблемы"""

    await callback.message.edit_text(support_text, reply_markup=back_to_main())

# === ОПЛАТА STARS ===
@dp.callback_query(F.data.startswith("stars_"))
async def pay_stars(callback: types.CallbackQuery):
    cat = callback.data.split("_")[1]
    amount = PRICE[cat]
    
    # Для подписки
    if cat in ['week', 'month']:
        amount = SUB_PRICE[cat]
        title = f"Подписка на {cat} дн."
    else:
        title = f"Доступ: {cat.upper()}"
    
    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=title,
        description="Оплата через Stars",
        payload=f"stars_{cat}_{callback.from_user.id}",
        provider_token="",  # Звёзды не требуют токена
        currency="XTR",
        prices=[LabeledPrice("Доступ", amount)],
        start_parameter="stars"
    )

# === CRYPTOBOT ===
@dp.callback_query(F.data.startswith("crypto_"))
async def pay_crypto(callback: types.CallbackQuery):
    cat = callback.data.split("_")[1]
    user_id = callback.from_user.id
    
    # Для подписки
    if cat in ['week', 'month']:
        amount = SUB_PRICE[cat]
        desc = f"Подписка на {cat} дн."
    else:
        amount = PRICE[cat]
        desc = f"Доступ: {cat.upper()}"
    
    try:
        async with aiohttp.ClientSession() as s:
            resp = await s.post("https://pay.crypt.bot/api/createInvoice", json={
                "token": CRYPTOPAY_TOKEN,
                "amount": amount,
                "currency": "RUB",
                "description": desc,
                "payload": f"crypto_{cat}_{user_id}"
            })
            data = await resp.json()
            if data.get("ok"):
                inv = data["result"]
                kb = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton("💳 Оплатить", url=inv["pay_url"])],
                    [InlineKeyboardButton("🔄 Проверить", callback_data=f"check_{inv['invoice_id']}")],
                    [InlineKeyboardButton("⬅️ Назад", callback_data=f"buy_{cat}")]
                ])
                await callback.message.edit_text(
                    f"<b>💎 Счёт на {amount}₽</b>\n\n"
                    f"Описание: <b>{desc}</b>\n"
                    f"После оплаты нажмите «Проверить»",
                    reply_markup=kb
                )
            else:
                await callback.message.edit_text("❌ Ошибка создания счёта", reply_markup=back_to_main())
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка: {str(e)}", reply_markup=back_to_main())

# === ПРОВЕРКА ОПЛАТЫ ===
@dp.callback_query(F.data.startswith("check_"))
async def check(callback: types.CallbackQuery):
    inv_id = callback.data.split("_")[1]
    
    try:
        async with aiohttp.ClientSession() as s:
            resp = await s.get(f"https://pay.crypt.bot/api/getInvoices", 
                             params={"token": CRYPTOPAY_TOKEN, "invoice_ids": inv_id})
            data = await resp.json()
            
            if data["ok"] and data["result"]["items"]:
                item = data["result"]["items"][0]
                if item["status"] == "paid":
                    user_id = callback.from_user.id
                    amount = float(item["amount"])
                    desc = item["description"]
                    
                    # Определяем тип покупки
                    if "Подписка" in desc:
                        if "7" in desc:
                            duration = 7 * 86400
                        elif "30" in desc:
                            duration = 30 * 86400
                        else:
                            duration = 0
                            
                        # Обновляем подписку
                        cursor.execute("SELECT sub_end FROM users WHERE user_id = ?", (user_id,))
                        result = cursor.fetchone()
                        current_end = result[0] if result and result[0] > int(datetime.now().timestamp()) else int(datetime.now().timestamp())
                        
                        new_end = current_end + duration
                        cursor.execute("UPDATE users SET sub_end = ? WHERE user_id = ?", (new_end, user_id))
                        pay_type = "sub_week" if "7" in desc else "sub_month"
                    else:
                        # Оплата доступа к категории
                        cat = desc.split(": ")[1].lower()
                        
                        # Рефералка
                        cursor.execute("SELECT referrer_id FROM users WHERE user_id = ?", (user_id,))
                        ref = cursor.fetchone()
                        if ref and ref[0]:
                            bonus = amount * (REF_PERCENT / 100)
                            cursor.execute("UPDATE users SET balance = balance + ?, earned = earned + ? WHERE user_id = ?", 
                                         (bonus, bonus, ref[0]))
                            try:
                                await bot.send_message(ref[0], 
                                                    f"🎉 Реферал оплатил!\n+{bonus:.2f}₽ на баланс", 
                                                    reply_markup=main_menu())
                            except:
                                pass

                        # Обновление данных пользователя
                        cursor.execute("UPDATE users SET photos_left = photos_left + 15, last_category = ? WHERE user_id = ?", 
                                     (cat, user_id))
                        pay_type = f"access_{cat}"
                    
                    # Обновляем total_spent
                    cursor.execute("UPDATE users SET total_spent = total_spent + ? WHERE user_id = ?", (amount, user_id))
                    cursor.execute("INSERT INTO payments VALUES (NULL, ?, ?, ?, ?, ?)", 
                                 (user_id, amount, "RUB", pay_type, datetime.now().isoformat()))
                    conn.commit()

                    await callback.message.edit_text(
                        f"✅ <b>Оплата прошла успешно!</b>\n\n"
                        f"💰 Сумма: <b>{amount}₽</b>",
                        reply_markup=main_menu()
                    )
                    await log(f"💳 ОПЛАТА CRYPTO: {user_id} | {amount}₽ | {pay_type}")
                else:
                    await callback.answer("❌ Счёт ещё не оплачен", show_alert=True)
            else:
                await callback.answer("❌ Ошибка проверки", show_alert=True)
    except Exception as e:
        await callback.answer(f"❌ Ошибка: {str(e)}", show_alert=True)

# === УСПЕШНАЯ ОПЛАТА STARS ===
@dp.message(F.successful_payment)
async def success(message: types.Message):
    try:
        payload = message.successful_payment.invoice_payload
        if payload.startswith("stars_"):
            parts = payload.split("_")
            if len(parts) >= 3:
                cat = parts[1]
                user_id = message.from_user.id
                
                # Для подписки
                if cat in ['week', 'month']:
                    duration = 7 * 86400 if cat == 'week' else 30 * 86400
                    
                    cursor.execute("SELECT sub_end FROM users WHERE user_id = ?", (user_id,))
                    result = cursor.fetchone()
                    current_end = result[0] if result and result[0] > int(datetime.now().timestamp()) else int(datetime.now().timestamp())
                    
                    new_end = current_end + duration
                    cursor.execute("UPDATE users SET sub_end = ? WHERE user_id = ?", (new_end, user_id))
                else:
                    # Для доступа к категории
                    cursor.execute("UPDATE users SET photos_left = photos_left + 15, last_category = ? WHERE user_id = ?", (cat, user_id))
                
                conn.commit()
                
                await message.answer(
                    f"✅ <b>Оплата Stars прошла успешно!</b>",
                    reply_markup=main_menu()
                )
                await log(f"⭐ ОПЛАТА STARS: {user_id} | {cat}")
    except Exception as e:
        await log(f"Ошибка обработки оплаты: {str(e)}")

# === ПОЛУЧЕНИЕ ФОТО ===
@dp.callback_query(F.data == "get_photo")
async def photo(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    now = int(datetime.now().timestamp())
    
    cursor.execute("SELECT photos_left, last_category, sub_end, last_photo_time FROM users WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    
    if not result:
        await callback.answer("❌ Ошибка доступа", show_alert=True)
        return
        
    left, cat, sub_end, last_time = result

    # Проверка задержки
    if last_time and now - last_time < PHOTO_DELAY:
        wait_time = PHOTO_DELAY - (now - last_time)
        await callback.answer(f"⏰ Подождите {wait_time} сек.", show_alert=True)
        return

    # Проверка доступа
    has_access = left > 0 or (sub_end and sub_end > now)
    if not has_access:
        await callback.answer("❌ Нет доступа! Приобретите подписку или фото", show_alert=True)
        return

    # Выбор категории для подписчиков
    if sub_end and sub_end > now:
        if cat is None:  # Если категория не установлена, выбираем рандом
            selected_cat = random.choice(list(PRICE.keys()))
        else:
            selected_cat = cat
    else:
        if cat is None:
            await callback.answer("❌ Сначала выберите категорию", show_alert=True)
            return
        selected_cat = cat

    # Поиск фото
    cursor.execute("SELECT file_id FROM photos WHERE category = ? ORDER BY RANDOM() LIMIT 1", (selected_cat,))
    row = cursor.fetchone()
    
    if not row:
        await callback.answer("❌ Фото временно недоступны", show_alert=True)
        return

    # Отправка фото
    try:
        await bot.send_photo(callback.message.chat.id, row[0], 
                           caption=f"<b>🎭 Категория: {selected_cat.upper()}</b>")
        
        # Обновление времени и счетчика
        if left > 0:
            cursor.execute("UPDATE users SET photos_left = photos_left - 1, last_photo_time = ? WHERE user_id = ?", (now, user_id))
        else:
            cursor.execute("UPDATE users SET last_photo_time = ? WHERE user_id = ?", (now, user_id))
        conn.commit()
        
        await callback.message.delete()
        await log(f"🖼 ФОТО: {user_id} | {selected_cat}")
        
    except Exception as e:
        await callback.answer("❌ Ошибка отправки фото", show_alert=True)
        await log(f"❌ Ошибка фото {user_id}: {e}")

# === БАЛАНС ===
@dp.callback_query(F.data == "balance")
async def balance(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    cursor.execute("SELECT balance, photos_left, sub_end FROM users WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    
    if not result:
        await callback.answer("❌ Ошибка", show_alert=True)
        return
        
    bal, left, sub = result
    
    now = int(datetime.now().timestamp())
    if sub and sub > now:
        sub_text = f"Активна до {datetime.fromtimestamp(sub).strftime('%d.%m %H:%M')}"
        days_left = (sub - now) // 86400
        sub_text += f" ({days_left} дн.)"
    else:
        sub_text = "Не активна"

    balance_text = f"""<b>{Emoji.BALANCE} Ваш баланс</b>

💎 <b>Баланс:</b> {bal:.2f}₽
🖼 <b>Доступно фото:</b> {left}
⭐ <b>Подписка:</b> {sub_text}

💳 <b>Пополнить баланс можно:</b>
• Через покупку доступа к категориям
• Через реферальную систему"""

    await callback.message.edit_text(balance_text, reply_markup=main_menu())

# === АДМИН ПАНЕЛЬ ===
@dp.message(Command("admin"))
async def admin_panel(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return await message.answer("❌ Доступ запрещён.")
    
    await message.answer("<b>⚡ Админ-панель</b>", reply_markup=admin_menu())

@dp.callback_query(F.data.startswith("admin_"))
async def admin_handler(callback: types.CallbackQuery, state: FSMContext):
    if callback.from_user.id != ADMIN_ID: 
        return
    
    action = callback.data.split("_")[1]
    
    if action == "stats":
        cursor.execute("SELECT COUNT(*) FROM users")
        users = cursor.fetchone()[0]
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payments")
        revenue = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM photos")
        photos = cursor.fetchone()[0]
        
        text = f"""<b>{Emoji.STATS} Статистика бота</b>

👤 <b>Пользователей:</b> {users}
💎 <b>Выручка:</b> {revenue:.2f}₽
🖼 <b>Фото в базе:</b> {photos}
🔥 <b>Активных подписок:</b> В разработке"""

        await callback.message.edit_text(text, reply_markup=admin_menu())
        
    elif action == "broadcast":
        await state.set_state(AdminStates.broadcast)
        await callback.message.edit_text(
            "📢 <b>Отправьте сообщение для рассылки:</b>\n\n"
            "Поддерживается HTML разметка",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_cancel")]
            ])
        )
        
    elif action == "withdraw":
        await state.set_state(AdminStates.withdraw)
        await callback.message.edit_text(
            "💰 <b>Вывод средств пользователю</b>\n\n"
            "Формат: <code>user_id сумма</code>\n"
            "Пример: <code>123456789 100.50</code>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_cancel")]
            ])
        )
        
    elif action == "cache":
        await callback.message.edit_text("🔄 Обновление кэша...")
        total = await cache_photos()
        await callback.message.edit_text(f"✅ Кэш обновлён!\nЗагружено фото: {total}", reply_markup=admin_menu())
        
    elif action == "detailed_stats":
        # Детальная статистика
        cursor.execute("SELECT COUNT(*) FROM users WHERE DATE(join_date) = DATE('now')")
        new_today = cursor.fetchone()[0]
        
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(date) = DATE('now')")
        revenue_today = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE sub_end > ?", (int(datetime.now().timestamp()),))
        active_subs = cursor.fetchone()[0]
        
        text = f"""<b>📊 Детальная статистика</b>

📈 <b>Сегодня:</b>
• Новых пользователей: {new_today}
• Выручка: {revenue_today:.2f}₽

👥 <b>Общее:</b>
• Всего пользователей: В разработке
• Активных подписок: {active_subs}"""

        await callback.message.edit_text(text, reply_markup=admin_menu())
        
    elif action == "find_user":
        await state.set_state(AdminStates.find_user)
        await callback.message.edit_text(
            "👤 <b>Введите ID пользователя:</b>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_cancel")]
            ])
        )
        
    elif action == "cancel":
        await state.clear()
        await callback.message.edit_text("❌ Операция отменена", reply_markup=admin_menu())

# === АДМИН ХЕНДЛЕРЫ ===
@dp.message(AdminStates.broadcast)
async def broadcast_message(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: 
        return
        
    cursor.execute("SELECT user_id FROM users")
    users = [row[0] for row in cursor.fetchall()]
    
    sent = 0
    failed = 0
    
    await message.answer(f"📢 Рассылка начата...\nПолучателей: {len(users)}")
    
    for user in users:
        try:
            await bot.send_message(user, message.text)
            sent += 1
            await asyncio.sleep(0.05)
        except:
            failed += 1
            
    await message.answer(
        f"✅ Рассылка завершена!\n\n"
        f"📤 Отправлено: {sent}\n"
        f"❌ Не отправлено: {failed}\n"
        f"📊 Всего: {len(users)}"
    )
    await state.clear()
    await log(f"📢 РАССЫЛКА: {message.text[:100]}... | {sent}/{len(users)}")

@dp.message(AdminStates.withdraw)
async def admin_withdraw_handler(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: 
        return
        
    try:
        parts = message.text.split()
        if len(parts) != 2:
            raise ValueError
            
        uid = int(parts[0])
        amount = float(parts[1])
        
        cursor.execute("SELECT balance FROM users WHERE user_id = ?", (uid,))
        result = cursor.fetchone()
        
        if not result:
            await message.answer("❌ Пользователь не найден")
            return
            
        current_balance = result[0]
        
        if amount > current_balance:
            await message.answer(f"❌ Недостаточно средств. Баланс: {current_balance:.2f}₽")
            return
            
        cursor.execute("UPDATE users SET balance = balance - ? WHERE user_id = ?", (amount, uid))
        cursor.execute("INSERT INTO withdrawals VALUES (NULL, ?, ?, 'completed', datetime('now'))", (uid, amount))
        conn.commit()
        
        try:
            await bot.send_message(uid, f"✅ Вывод {amount:.2f}₽ выполнен!")
        except:
            pass
            
        await message.answer(f"✅ Вывод {amount:.2f}₽ для {uid} выполнен")
        await log(f"💰 ВЫВОД АДМИН: {uid} | {amount}₽")
        
    except ValueError:
        await message.answer("❌ Неверный формат. Используйте: user_id сумма")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")
        
    await state.clear()

@dp.message(AdminStates.find_user)
async def admin_find_user(message: types.Message, state: FSMContext):
    if message.from_user.id != ADMIN_ID: 
        return
        
    try:
        user_id = int(message.text)
        
        cursor.execute("""
        SELECT user_id, balance, photos_left, sub_end, earned, total_spent, join_date
        FROM users WHERE user_id = ?
        """, (user_id,))
        result = cursor.fetchone()
        
        if not result:
            await message.answer("❌ Пользователь не найден")
            return
            
        uid, bal, left, sub, earned, spent, join = result
        
        # Подписка
        now = int(datetime.now().timestamp())
        if sub and sub > now:
            sub_text = f"До {datetime.fromtimestamp(sub).strftime('%d.%m.%Y %H:%M')}"
        else:
            sub_text = "Не активна"
        
        user_info = f"""<b>👤 Информация о пользователе</b>

🆔 <b>ID:</b> <code>{uid}</code>
💎 <b>Баланс:</b> {bal:.2f}₽
🖼 <b>Фото:</b> {left}
⭐ <b>Подписка:</b> {sub_text}
💰 <b>Заработал:</b> {earned:.2f}₽
💸 <b>Потратил:</b> {spent:.2f}₽
📅 <b>Дата регистрации:</b> {join[:10]}"""

        await message.answer(user_info)
        
    except ValueError:
        await message.answer("❌ Введите корректный ID пользователя")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")
        
    await state.clear()

# === АВТОМАТИЧЕСКОЕ КЭШИРОВАНИЕ ===
async def auto_cache():
    while True:
        await asyncio.sleep(CACHE_INTERVAL)
        try:
            await cache_photos()
        except Exception as e:
            await log(f"❌ Ошибка авто-кэша: {e}")

# === ЗАПУСК БОТА ===
async def main():
    # Запуск фоновых задач
    asyncio.create_task(auto_cache())
    
    # Первоначальное кэширование
    try:
        await cache_photos()
    except Exception as e:
        await log(f"❌ Ошибка первоначального кэша: {e}")
    
    # Уведомление о запуске
    await log("🤖 Бот запущен и готов к работе!")
    
    # Запуск поллинга
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())