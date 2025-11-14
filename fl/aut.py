# -*- coding: utf-8 -*-
from .. import loader
import logging

logger = logging.getLogger(__name__)

@loader.tds
class AutoMediaRelay(loader.Module):
    """Пересылка медиа из одного чата в другой без текста"""
    strings = {"name": "AutoMediaRelay"}

    async def client_ready(self, client, db):
        self.client = client
        self.db = db

    @loader.command()
    async def setsource(self, message):
        """Устанавливает исходный чат: .setsource 12345"""
        arg = message.raw_text.split(" ", 1)
        if len(arg) < 2:
            return await message.edit("❗ Укажи ID чата")
        try:
            src = int(arg[1])
        except:
            return await message.edit("❗ Нужен числовой ID")
        self.db.set("AutoMediaRelay", "source", src)
        await message.edit(f"📥 Источник установлен: {src}")

    @loader.command()
    async def settarget(self, message):
        """Устанавливает целевой чат: .settarget 12345"""
        arg = message.raw_text.split(" ", 1)
        if len(arg) < 2:
            return await message.edit("❗ Укажи ID чата")
        try:
            tgt = int(arg[1])
        except:
            return await message.edit("❗ Нужен числовой ID")
        self.db.set("AutoMediaRelay", "target", tgt)
        await message.edit(f"📤 Цель установлена: {tgt}")

    @loader.command()
    async def relayon(self, message):
        self.db.set("AutoMediaRelay", "enabled", True)
        await message.edit("✅ Пересылка включена")

    @loader.command()
    async def relayoff(self, message):
        self.db.set("AutoMediaRelay", "enabled", False)
        await message.edit("⛔ Пересылка выключена")

    async def watcher(self, message):
        if not self.db.get("AutoMediaRelay", "enabled"):
            return

        source = self.db.get("AutoMediaRelay", "source")
        target = self.db.get("AutoMediaRelay", "target")

        if not source or not target:
            return

        # Только из исходного чата
        if message.chat_id != source:
            return

        # Только медиа
        if not message.media:
            return

        try:
            file = await message.download_media(bytes)
            await self.client.send_file(target, file, caption=None)
        except Exception as e:
            logger.error(f"Relay error: {e}")