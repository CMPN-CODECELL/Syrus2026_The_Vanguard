"""
MedVision AI - Backend Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Gemini API
    gemini_api_key: str = ""
    
    # Firebase
    firebase_project_id: str = ""
    firebase_private_key: str = ""
    firebase_client_email: str = ""
    
    # Environment
    environment: str = "development"
    
    # API Settings
    api_title: str = "MedVision AI API"
    api_description: str = "Clinical Time Machine powered by Gemini 3"
    api_version: str = "1.0.0"
    
    class Config:
        # Try multiple possible .env locations
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
