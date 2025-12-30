# -*- coding: utf-8 -*-
from loader import Module
from telethon.tl.types import Message

class MutLSMod(Module):
    """Модуль для мьюта ЛС (HerokuTL)"""
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
        # загружаем замьюченных пользователей из базы
        self._muted_users = set(await self.db.get("muted_users", []))

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
        await self.db.set("muted_users", list(self._muted_users))
        await message.edit(self.strings("mut_msg"))

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
        await self.db.set("muted_users", list(self._muted_users))
        await message.edit(self.strings("unmut_msg"))

    async def watcher(self, message: Message):
        """Удаляет сообщения от замьюченных пользователей в ЛС"""
        if message.is_private and message.sender_id in self._muted_users:
            # Не удаляем свои системные сообщения
            if message.text in [self.strings("mut_msg"), self.strings("unmut_msg")]:
                return
            await message.delete()