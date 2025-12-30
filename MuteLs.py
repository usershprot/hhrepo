# -*- coding: utf-8 -*-
from hikkatl import loader, utils
from telethon.tl.types import Message

@loader.tds
class MutLSMod(loader.Module):
    """Модуль для мьюта ЛС с нужными эмодзи"""
    strings = {
        "name": "MutLS",
        "mut_msg": "<emoji document_id=5974558538213625534>🔇</emoji> <b>Помолчи.</b>",
        "unmut_msg": "<emoji document_id=5976746905655316100>🔊</emoji> <b>Говори.</b>",
    }

    def __init__(self):
        self._muted_users = set()

    async def client_ready(self, client, db):
        self.client = client
        self.db = db

    @loader.unrestricted
    async def mutlscmd(self, message: Message):
        """Мьют ЛС с пользователем"""
        if message.is_private:
            self._muted_users.add(message.chat_id)
            await message.edit(self.strings("mut_msg"))
        else:
            reply = await message.get_reply_message()
            if reply:
                self._muted_users.add(reply.chat_id)
                await message.edit(self.strings("mut_msg"))
            else:
                await message.edit("<b>Команду нужно использовать в ЛС или ответом на сообщение.</b>")

    @loader.unrestricted
    async def unmutlscmd(self, message: Message):
        """Размьют ЛС с пользователем"""
        if message.is_private:
            self._muted_users.discard(message.chat_id)
            await message.edit(self.strings("unmut_msg"))
        else:
            reply = await message.get_reply_message()
            if reply:
                self._muted_users.discard(reply.chat_id)
                await message.edit(self.strings("unmut_msg"))
            else:
                await message.edit("<b>Команду нужно использовать в ЛС или ответом на сообщение.</b>")

    @loader.ratelimit
    async def watcher(self, message: Message):
        """Блокирует сообщения от замьюченных пользователей в ЛС"""
        if message.is_private and message.sender_id in self._muted_users:
            await message.delete()