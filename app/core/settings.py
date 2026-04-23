from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "FAIR LENS API"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])


settings = Settings()
