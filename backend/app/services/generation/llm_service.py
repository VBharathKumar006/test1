"""
LLM provider abstraction: supports Gemini and OpenAI-compatible providers.
Never hardcodes API keys — reads from environment only.
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class LLMService:
    """Provider-independent LLM interface."""

    def __init__(self):
        self._gemini_client = None
        self._openai_client = None

    def _get_gemini(self):
        if self._gemini_client is None:
            import google.generativeai as genai
            from app.core.config import settings
            if not settings.GEMINI_API_KEY:
                raise ValueError(
                    "GEMINI_API_KEY is not set. Add it to your .env file."
                )
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._gemini_client = genai.GenerativeModel(settings.LLM_MODEL)
        return self._gemini_client

    def _get_openai(self):
        if self._openai_client is None:
            from openai import OpenAI
            from app.core.config import settings
            self._openai_client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )
        return self._openai_client

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> str:
        """Generate a completion using the configured provider."""
        from app.core.config import settings

        if settings.LLM_PROVIDER == "gemini":
            return self._generate_gemini(system_prompt, user_prompt, temperature, max_tokens)
        elif settings.LLM_PROVIDER == "openai":
            return self._generate_openai(system_prompt, user_prompt, temperature, max_tokens)
        else:
            raise ValueError(f"Unknown LLM provider: {settings.LLM_PROVIDER}")

    def _generate_gemini(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> str:
        try:
            import google.generativeai as genai
            from app.core.config import settings

            model = genai.GenerativeModel(
                settings.LLM_MODEL,
                system_instruction=system_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            response = model.generate_content(user_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

    def _generate_openai(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> str:
        try:
            from app.core.config import settings
            client = self._get_openai()
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise

    def is_available(self) -> bool:
        """Check if the LLM provider is configured."""
        from app.core.config import settings
        if settings.LLM_PROVIDER == "gemini":
            return bool(settings.GEMINI_API_KEY)
        elif settings.LLM_PROVIDER == "openai":
            return bool(settings.OPENAI_API_KEY)
        return False


llm_service = LLMService()

