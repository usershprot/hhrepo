from hikkatl.types import Message
from hikkatl.tl.types import MessageMediaPhoto, MessageMediaDocument
from hikka import loader, utils


@loader.tds
class MediaForwarderMod(loader.Module):
    """Пересылает медиа из одного чата в другой"""

    strings = {"name": "MediaForwarder"}

    async def client_ready(self, client, db):
        self._db = db
        self._client = client

    async def mfconfigcmd(self, message: Message):
        """Настройка пересылки медиа - .mfconfig <from_chat> <to_chat>"""
        args = utils.get_args_raw(message).split()
        if len(args) < 2:
            await utils.answer(message, "❌ Использование: .mfconfig <from_chat> <to_chat>")
            return

        from_chat = args[0]
        to_chat = args[1]

        self._db.set(__name__, "config", {
            "from_chat": from_chat,
            "to_chat": to_chat
        })

        await utils.answer(message, f"✅ Конфигурация сохранена:\n"
                                  f"Из: {from_chat}\n"
                                  f"В: {to_chat}")

    async def mfstartcmd(self, message: Message):
        """Запустить пересылку медиа"""
        config = self._db.get(__name__, "config")
        if not config:
            await utils.answer(message, "❌ Сначала настройте конфигурацию с помощью .mfconfig")
            return

        self._db.set(__name__, "active", True)
        await utils.answer(message, "✅ Пересылка медиа активирована")

    async def mfstopcmd(self, message: Message):
        """Остановить пересылку медиа"""
        self._db.set(__name__, "active", False)
        await utils.answer(message, "✅ Пересылка медиа остановлена")

    async def mfstatuscmd(self, message: Message):
        """Показать статус пересылки"""
        config = self._db.get(__name__, "config")
        active = self._db.get(__name__, "active", False)

        status = "🟢 Активна" if active else "🔴 Остановлена"
        if config:
            config_text = f"Из: {config['from_chat']}\nВ: {config['to_chat']}\nСтатус: {status}"
        else:
            config_text = "Не настроено"

        await utils.answer(message, f"📊 Статус пересылки медиа:\n{config_text}")

    async def watcher(self, message: Message):
        """Автоматически пересылает медиа сообщения"""
        if not self._db.get(__name__, "active", False):
            return

        config = self._db.get(__name__, "config")
        if not config:
            return

        # Проверяем, что сообщение из нужного чата
        chat_id = str(getattr(message, "chat_id", None))
        if chat_id != config["from_chat"]:
            return

        # Проверяем, что сообщение содержит медиа
        if not message.media:
            return

        # Проверяем тип медиа
        if not isinstance(message.media, (MessageMediaPhoto, MessageMediaDocument)):
            return

        try:
            # Пересылаем только медиа без текста и без указания отправителя
            await self._client.send_file(
                entity=config["to_chat"],
                file=message.media,
                caption="",  # Пустой текст
                parse_mode=None
            )
        except Exception as e:
            # Логируем ошибку, но не прерываем работу
            print(f"Ошибка при пересылке медиа: {e}")