
import os
from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cardápio Digital API"
    SECRET_KEY: str = "sua_chave_secreta_super_segura_aqui"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = (
        "postgresql://postgres:postgrespassword@localhost:5432/cardapioDigital_db"
    )

    class Config:
        env_file = BACKEND_DIR / ".env"
        extra = "ignore"


settings = Settings()