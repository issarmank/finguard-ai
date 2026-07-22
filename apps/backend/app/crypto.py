from cryptography.fernet import Fernet, InvalidToken


def _get_fernet() -> Fernet:
    from app.config import settings
    if not settings.PLAID_ENCRYPTION_KEY:
        raise RuntimeError(
            "PLAID_ENCRYPTION_KEY is not configured. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(settings.PLAID_ENCRYPTION_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, ValueError, Exception):
        # Graceful fallback: existing plaintext tokens during migration pass through unchanged.
        # They will be re-encrypted on the next write.
        return ciphertext
