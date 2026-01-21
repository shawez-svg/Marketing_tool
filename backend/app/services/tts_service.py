"""
Text-to-Speech Service using OpenAI TTS API
"""
import openai
from app.config import settings
import tempfile
import os
import base64


class TTSService:
    """Service for converting text to speech using OpenAI TTS API"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.default_voice = "alloy"  # Options: alloy, echo, fable, onyx, nova, shimmer
        self.default_model = "tts-1"  # Options: tts-1 (faster), tts-1-hd (higher quality)

    async def text_to_speech(
        self,
        text: str,
        voice: str | None = None,
        model: str | None = None,
        response_format: str = "mp3",
    ) -> bytes:
        """
        Convert text to speech audio.

        Args:
            text: The text to convert to speech
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            model: TTS model (tts-1 or tts-1-hd)
            response_format: Audio format (mp3, opus, aac, flac)

        Returns:
            Audio data as bytes
        """
        try:
            response = self.client.audio.speech.create(
                model=model or self.default_model,
                voice=voice or self.default_voice,
                input=text,
                response_format=response_format,
            )

            # Get audio bytes
            audio_bytes = response.content
            return audio_bytes

        except Exception as e:
            print(f"TTS generation failed: {e}")
            raise

    async def text_to_speech_base64(
        self,
        text: str,
        voice: str | None = None,
        model: str | None = None,
    ) -> str:
        """
        Convert text to speech and return as base64 encoded string.
        Useful for sending audio directly to frontend.

        Returns:
            Base64 encoded audio string
        """
        audio_bytes = await self.text_to_speech(text, voice, model)
        return base64.b64encode(audio_bytes).decode("utf-8")

    def get_available_voices(self) -> list[dict]:
        """Return list of available voices with descriptions"""
        return [
            {"id": "alloy", "name": "Alloy", "description": "Neutral, balanced voice"},
            {"id": "echo", "name": "Echo", "description": "Warm, conversational voice"},
            {"id": "fable", "name": "Fable", "description": "Expressive, storytelling voice"},
            {"id": "onyx", "name": "Onyx", "description": "Deep, authoritative voice"},
            {"id": "nova", "name": "Nova", "description": "Friendly, upbeat voice"},
            {"id": "shimmer", "name": "Shimmer", "description": "Clear, professional voice"},
        ]


# Singleton instance
tts_service = TTSService()
