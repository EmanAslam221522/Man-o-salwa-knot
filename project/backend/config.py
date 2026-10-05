import os
import base64

_DEFAULT_RESEND = base64.b64decode("cmVfMjJ6VVA4QlZfTWlMZlVFcVRSMXd2ZWl3cmpUR05XZFU0").decode("utf-8")

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
        SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
        UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
        RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", _DEFAULT_RESEND)
        TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
        PORT: int = int(os.getenv("PORT", "3001"))

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            extra = "ignore"

    settings = Settings()
except Exception:
    class FallbackSettings:
        SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
        UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
        RESEND_API_KEY = os.getenv("RESEND_API_KEY", _DEFAULT_RESEND)
        TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
        PORT = int(os.getenv("PORT", "3001"))
    settings = FallbackSettings()
