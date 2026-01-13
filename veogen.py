🎬 VeoGen — Генерация видео через Google Veo 3 (Fixed)

__version__ = (1, 4, 0)
# meta developer: @ai
# scope: hikka_only
# requires: aiohttp

from .. import loader, utils
from herokutl.types import Message
import logging
import aiohttp
import asyncio
import tempfile
import os
import base64
import time

logger = logging.getLogger(__name__)

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

@loader.tds
class VeoGenMod(loader.Module):
    """Генерация видео через Google Veo 3.0/3.1"""
    
    strings = {
        "name": "VeoGen",
        "no_prompt": "❌ <b>Укажи описание видео</b>",
        "no_image": "❌ <b>Ответь на фото для image-to-video</b>",
        "generating": "🎬 <b>Генерирую видео Veo 3...</b>\n\n📝 <code>{}</code>\n⏱ {}с\n\n⏳ Ожидай 1-3 минуты...",
        "success": "✅ <b>Видео готово!</b> ⏱ {}с\n\n<blockquote expandable>📝 {}</blockquote>",
        "error": "❌ <b>Ошибка:</b> {}",
        "safety": "🛡 <b>Контент заблокирован фильтрами безопасности Google.</b>",
        "no_api_key": "⚠️ Настрой API ключ в .config VeoGen (Google AI Studio)",
    }

    def __init__(self):
        self.config = loader.ModuleConfig(
            loader.ConfigValue(
                "api_key", "", "🔑 Google AI Studio API Key",
                validator=loader.validators.Hidden()
            ),
            loader.ConfigValue(
                "model", "veo-3.0-generate-001", "🎬 Модель",
                validator=loader.validators.Choice([
                    "veo-3.0-generate-001",
                    "veo-3.0-fast-generate-001",
                    "veo-3.1-generate-preview",
                    "veo-3.1-fast-generate-preview",
                ])
            ),
            loader.ConfigValue("seconds", 5, "⏱ Длительность (влияет на лимиты)"),
            loader.ConfigValue("aspect_ratio", "16:9", "📐 Соотношение", 
                               validator=loader.validators.Choice(["16:9", "9:16", "1:1"])),
            loader.ConfigValue("timeout", 300, "⏱ Таймаут (сек)"),
        )

    async def _generate_video(self, prompt: str, call, seconds: int = 0, image_bytes: bytes = None):
        start_time = time.time()
        api_key = self.config["api_key"]
        model = self.config["model"]
        duration = seconds if seconds else self.config["seconds"]
        
        headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
        url = f"{BASE_URL}/models/{model}:predictLongRunning"
        
        instance = {"prompt": prompt}
        if image_bytes:
            instance["image"] = {
                "bytesBase64Encoded": base64.b64encode(image_bytes).decode(),
                "mimeType": "image/jpeg"
            }
        
        payload = {
            "instances": [instance],
            "parameters": {
                "aspectRatio": self.config["aspect_ratio"],
                "durationSeconds": int(duration)
            }
        }
        
        async with aiohttp.ClientSession() as session:
            # 1. Отправка запроса
            async with session.post(url, headers=headers, json=payload) as resp:
                result = await resp.json()
                if "error" in result:
                    raise Exception(result["error"].get("message", "Unknown error"))
                
                op_name = result.get("name")
                if not op_name:
                    raise Exception(f"Не удалось получить ID операции. Ответ: {result}")

            # 2. Ожидание готовности
            timeout = self.config["timeout"]
            elapsed = 0
            while elapsed < timeout:
                async with session.get(f"{BASE_URL}/{op_name}", headers=headers) as resp:
                    status = await resp.json()
                
                if status.get("done"):
                    response = status.get("response", {})
                    # Проверка структуры Veo 3
                    samples = response.get("generateVideoResponse", {}).get("generatedSamples", [])
                    
                    if not samples:
                        # Проверка фильтров безопасности
                        if "error" in status:
                            raise Exception(status["error"].get("message"))
                        raise Exception("SAFETY_TRIGGERED")

                    video_uri = samples[0].get("video", {}).get("uri")
                    if not video_uri:
                        raise Exception("URI видео отсутствует в ответе Google.")

                    # 3. Скачивание файла
                    async with session.get(video_uri, headers={"x-goog-api-key": api_key}) as v_resp:
                        if v_resp.status != 200:
                            raise Exception(f"Ошибка скачивания: {v_resp.status}")
                        return await v_resp.read(), time.time() - start_time
                
                await asyncio.sleep(10)
                elapsed += 10
                try:
                    await call.edit(f"🎬 <b>Генерация... {int((elapsed/timeout)*100)}%</b>")
                except: pass
            
            raise Exception("Превышено время ожидания (Timeout)")

    @loader.command(ru_doc="<промпт> — Сгенерировать видео через Veo 3")
    async def veocmd(self, message: Message):
        if not self.config["api_key"]:
            return await utils.answer(message, self.strings["no_api_key"])
        
        prompt = utils.get_args_raw(message)
        reply = await message.get_reply_message()
        image_bytes = None

        if not prompt and reply and reply.text:
            prompt = reply.text
        if reply and reply.photo:
            image_bytes = await reply.download_media(bytes)
            if not prompt: prompt = "Animate this"

        if not prompt:
            return await utils.answer(message, self.strings["no_prompt"])

        call = await self.inline.form(
            text=self.strings["generating"].format(utils.escape_html(prompt[:100]), self.config["seconds"]),
            message=message,
            reply_markup=[[{"text": "⏳ В очереди...", "callback": lambda x: None}]]
        )

        try:
            video_data, total_time = await self._generate_video(prompt, call, image_bytes=image_bytes)
            
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
                f.write(video_data)
                path = f.name

            await call.delete()
            await message.client.send_file(
                message.chat_id, path,
                caption=self.strings["success"].format(f"{total_time:.1f}", utils.escape_html(prompt)),
                reply_to=reply.id if reply else message.id
            )
            os.unlink(path)
        except Exception as e:
            err = str(e)
            if "SAFETY_TRIGGERED" in err:
                await call.edit(self.strings["safety"])
            else:
                await call.edit(self.strings["error"].format(err))
