"""
AES-256 encryption utility for PII fields (email, phone, address).
Uses Fernet symmetric encryption (wraps AES-128-CBC with HMAC-SHA256).
For full AES-256, swap to cryptography.hazmat primitives.
"""

import base64
from cryptography.fernet import Fernet
from app.config import settings


def _get_fernet() -> Fernet:
    # Derive a valid 32-byte Fernet key from the configured encryption key
    raw = settings.ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt_field(value: str) -> str:
    """Encrypt a PII string field before storing in the database."""
    if not value:
        return value
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_field(value: str) -> str:
    """Decrypt a PII string field after retrieving from the database."""
    if not value:
        return value
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except Exception:
        return "[decryption error]"
