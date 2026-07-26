from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # API Keys
    shodan_api_key: Optional[str] = None
    virustotal_api_key: Optional[str] = None
    hibp_api_key: Optional[str] = None
    litellm_api_key: Optional[str] = None
    hybrid_analysis_api_key: Optional[str] = None
    anyrun_api_key: Optional[str] = None

    # Request signing — set to enable HMAC verification on POST /search
    hmac_secret: Optional[str] = None

    # LiteLLM model (e.g. "gpt-4o-mini", "claude-3-haiku-20240307", "ollama/llama3")
    ai_model: str = "gpt-4o-mini"

    # Redis
    redis_url: str = "redis://localhost:6379"
    cache_ttl: int = 3600  # seconds

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    # CORS — comma-separated list of allowed frontend origins.
    # Defaults to * (allow all) so deployments work out of the box.
    # WARNING: In production, restrict this to specific trusted origins to prevent
    # unwanted cross-origin access, e.g.:
    #   CORS_ORIGINS=https://your-frontend.example.com
    cors_origins: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
