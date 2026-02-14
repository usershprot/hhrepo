# meta developer: @welpdev
# meta name: AI PM Memory
# meta version: 1.1

from .. import loader, utils
from telethon.tl.types import User
import requests
import asyncio


class AIPMMemory(loader.Module):
    """ИИ отвечает в ЛС с памятью для каждого чата"""

    strings = {
        "name": "AIPMMemory",
        "api_saved": "✅ API ключ сохранён",
        "ai_on": "🤖 AI автоответчик включён",
        "ai_off": "❌ AI автоответчик выключен",
        "no_api": "⚠️ Сначала установи API ключ через .aikey",
    }

    def __init__(self):
        self.config = loader.ModuleConfig(
            loader.ConfigValue(
                "api_key",
                "",
                "API ключ от apifree.ai",
            ),
            loader.ConfigValue(
                "enabled",
                False,
                "Включен ли автоответчик",
                validator=loader.validators.Boolean(),
            ),
        )
        self.memory = {}  # память по chat_id

    async def aikeycmd(self, message):
        """<ключ> — установить API ключ"""
        args = utils.get_args_raw(message)
        if not args:
            await message.edit("⚠️ Укажи API ключ")
            return

        self.config["api_key"] = args.strip()
        await message.edit(self.strings["api_saved"])

    async def aioncmd(self, message):
        """Включить AI автоответчик"""
        if not self.config["api_key"]:
            await message.edit(self.strings["no_api"])
            return

        self.config["enabled"] = True
        await message.edit(self.strings["ai_on"])

    async def aioffcmd(self, message):
        """Выключить AI автоответчик"""
        self.config["enabled"] = False
        await message.edit(self.strings["ai_off"])

    async def watcher(self, message):
        if not self.config["enabled"]:
            return

        if not message.is_private:
            return

        if not isinstance(message.sender, User):
            return

        if message.sender.bot:
            return

        if message.out:
            return

        text = message.raw_text
        if not text:
            return

        chat_id = message.chat_id

        if chat_id not in self.memory:
            self.memory[chat_id] = [
                {
                    "role": "system",
                    "content": "Ты дружелюбный помощник. Отвечай естественно, как реальный человек."
                }
            ]

        self.memory[chat_id].append({
            "role": "user",
            "content": text
        })

        # Ограничение памяти (10 последних сообщений + system)
        if len(self.memory[chat_id]) > 11:
            self.memory[chat_id] = (
                [self.memory[chat_id][0]] +
                self.memory[chat_id][-10:]
            )

        reply = await self.generate_ai_response(chat_id)

        if reply:
            self.memory[chat_id].append({
                "role": "assistant",
                "content": reply
            })
            await message.reply(reply)

    async def generate_ai_response(self, chat_id):
        try:
            headers = {
                "Authorization": f"Bearer {self.config['api_key']}",
                "Content-Type": "application/json",
            }

            data = {
                "model": "gpt-5-nano",
                "messages": self.memory[chat_id]
            }

            response = requests.post(
                "https://apifree.ai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )

            if response.status_code != 200:
                return None

            result = response.json()
            return result["choices"][0]["message"]["content"]

        except Exception:
            return None