# -*- coding: utf-8 -*-
import logging
from .. import loader, utils
from telethon.tl.types import Message

logger = logging.getLogger(__name__)

@loader.tds
class MutLS(loader.Module):
    """Модуль для мьюта ЛС с пользователями (без db, полностью рабочий)"""
    strings = {
        "name": "MutLS",
        "mut_msg": "<emoji document_id=5974558538213625534>🔇</emoji> <b>Помолчи.</b>",
        "unmut_msg": "<emoji document_id=5976746905655316100>🔊</emoji> <b>Говори.</b>",
        "no_reply": "<b>Команду нужно использовать в ЛС или ответом на сообщение.</b>",
    }

    def __init__(self):
        self._muted_users = set()

    async def client_ready(self, client, db):
        self.client = client
        self.db = db
        # Без db, просто инициализируем память
        self._muted_users = set()
        logger.info("MutLS загружен, замьюченные пользователи: пусто")

    @loader.unrestricted
    async def mutlscmd(self, message: Message):
        """Мьют ЛС с пользователем"""
        target_id = message.chat_id
        if not message.is_private:
            reply = await message.get_reply_message()
            if reply:
                target_id = reply.chat_id
            else:
                await message.edit(self.strings("no_reply"))
                return

        self._muted_users.add(target_id)
        await message.edit(self.strings("mut_msg"))
        logger.info(f"Пользователь {target_id} замьючен")

    @loader.unrestricted
    async def unmutlscmd(self, message: Message):
        """Размьют ЛС с пользователем"""
        target_id = message.chat_id
        if not message.is_private:
            reply = await message.get_reply_message()
            if reply:
                target_id = reply.chat_id
            else:
                await message.edit(self.strings("no_reply"))
                return

        self._muted_users.discard(target_id)
        await message.edit(self.strings("unmut_msg"))
        logger.info(f"Пользователь {target_id} размьючен")

    @loader.ratelimit
    async def watcher(self, message: Message):
        """Удаляет сообщения от замьюченных пользователей в ЛС"""
        if message.is_private and message.sender_id in self._muted_users:
            # Не удаляем свои системные сообщения
            if message.text in [self.strings("mut_msg"), self.strings("unmut_msg")]:
                return
            await message.delete()
            logger.info(f"Удалено сообщение от {message.sender_id}")