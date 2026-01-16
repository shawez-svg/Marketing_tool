import openai
from pathlib import Path
import tempfile
import os
from app.config import settings


class WhisperService:
    """Service for transcribing audio using OpenAI's Whisper API"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: str = "en",
        prompt: str | None = None,
    ) -> dict:
        """
        Transcribe audio data using OpenAI Whisper API

        Args:
            audio_data: Raw audio bytes (webm, mp3, wav, etc.)
            language: Language code (default: "en")
            prompt: Optional prompt to guide transcription

        Returns:
            dict with 'text' and 'duration' keys
        """
        # Save audio data to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name

        try:
            # Open the file and send to Whisper API
            with open(tmp_file_path, "rb") as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,
                    prompt=prompt,
                    response_format="verbose_json",
                )

            return {
                "text": transcription.text,
                "duration": getattr(transcription, "duration", None),
                "language": getattr(transcription, "language", language),
            }

        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)

    async def transcribe_audio_file(
        self,
        file_path: str,
        language: str = "en",
        prompt: str | None = None,
    ) -> dict:
        """
        Transcribe an audio file using OpenAI Whisper API

        Args:
            file_path: Path to audio file
            language: Language code (default: "en")
            prompt: Optional prompt to guide transcription

        Returns:
            dict with 'text' and 'duration' keys
        """
        with open(file_path, "rb") as audio_file:
            transcription = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                prompt=prompt,
                response_format="verbose_json",
            )

        return {
            "text": transcription.text,
            "duration": getattr(transcription, "duration", None),
            "language": getattr(transcription, "language", language),
        }


# Singleton instance
whisper_service = WhisperService()
