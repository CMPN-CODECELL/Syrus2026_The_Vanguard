"""
Encryption Service
Provides AES-256-GCM encryption for secure messaging between doctors and patients.
"""

import os
import base64
import hashlib
import hmac
import secrets
from typing import Tuple, Optional
from datetime import datetime

# Cryptography library for proper encryption
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("Warning: cryptography library not installed. Using fallback encryption.")


class EncryptionService:
    """
    Handles encryption and decryption for secure messaging.
    Uses AES-256-GCM for authenticated encryption.
    """
    
    def __init__(self):
        """Initialize encryption service."""
        # Master key from environment (should be 32 bytes for AES-256)
        master_key_env = os.getenv("ENCRYPTION_MASTER_KEY", "")
        
        if master_key_env:
            # Derive 32-byte key from environment variable
            self._master_key = hashlib.sha256(master_key_env.encode()).digest()
        else:
            # Generate a random key for development (NOT for production!)
            self._master_key = hashlib.sha256(b"medvision-dev-key-change-in-production").digest()
            print("Warning: Using development encryption key. Set ENCRYPTION_MASTER_KEY in production.")
    
    def generate_session_key(self, consultation_id: str) -> bytes:
        """
        Generate a unique session key for a consultation.
        Derived from master key + consultation ID.
        """
        key_material = f"{consultation_id}:session".encode()
        return hashlib.sha256(self._master_key + key_material).digest()
    
    def generate_iv(self) -> bytes:
        """Generate a random 12-byte IV for AES-GCM."""
        return secrets.token_bytes(12)
    
    def encrypt_message(
        self,
        plaintext: str,
        consultation_id: str,
        associated_data: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Encrypt a message using AES-256-GCM.
        
        Args:
            plaintext: The message to encrypt
            consultation_id: Consultation ID for key derivation
            associated_data: Additional authenticated data (not encrypted but verified)
        
        Returns:
            Tuple of (encrypted_content_base64, iv_base64)
        """
        session_key = self.generate_session_key(consultation_id)
        iv = self.generate_iv()
        
        if CRYPTO_AVAILABLE:
            # Use proper AES-GCM encryption
            aesgcm = AESGCM(session_key)
            aad = associated_data.encode() if associated_data else None
            ciphertext = aesgcm.encrypt(iv, plaintext.encode('utf-8'), aad)
        else:
            # Fallback: Simple XOR (NOT secure, for development only!)
            ciphertext = self._simple_xor(plaintext.encode(), session_key)
        
        return (
            base64.b64encode(ciphertext).decode('ascii'),
            base64.b64encode(iv).decode('ascii')
        )
    
    def decrypt_message(
        self,
        encrypted_content: str,
        iv: str,
        consultation_id: str,
        associated_data: Optional[str] = None
    ) -> str:
        """
        Decrypt a message using AES-256-GCM.
        
        Args:
            encrypted_content: Base64 encoded ciphertext
            iv: Base64 encoded initialization vector
            consultation_id: Consultation ID for key derivation
            associated_data: Additional authenticated data (must match encryption)
        
        Returns:
            Decrypted plaintext message
        """
        session_key = self.generate_session_key(consultation_id)
        ciphertext = base64.b64decode(encrypted_content)
        iv_bytes = base64.b64decode(iv)
        
        if CRYPTO_AVAILABLE:
            aesgcm = AESGCM(session_key)
            aad = associated_data.encode() if associated_data else None
            plaintext = aesgcm.decrypt(iv_bytes, ciphertext, aad)
        else:
            # Fallback: Simple XOR (NOT secure, for development only!)
            plaintext = self._simple_xor(ciphertext, session_key)
        
        return plaintext.decode('utf-8')
    
    def _simple_xor(self, data: bytes, key: bytes) -> bytes:
        """Simple XOR for fallback (NOT secure - development only)."""
        return bytes(a ^ b for a, b in zip(data, (key * (len(data) // len(key) + 1))[:len(data)]))
    
    def generate_signature(
        self,
        content: str,
        doctor_id: str,
        timestamp: datetime
    ) -> str:
        """
        Generate a digital signature for prescriptions.
        Uses HMAC-SHA256 for non-repudiation.
        
        Args:
            content: The content to sign (prescription data)
            doctor_id: Doctor's ID
            timestamp: Timestamp of signing
        
        Returns:
            Base64 encoded HMAC signature
        """
        message = f"{doctor_id}:{timestamp.isoformat()}:{content}".encode()
        signature = hmac.new(self._master_key, message, hashlib.sha256).digest()
        return base64.b64encode(signature).decode('ascii')
    
    def verify_signature(
        self,
        content: str,
        doctor_id: str,
        timestamp: datetime,
        signature: str
    ) -> bool:
        """
        Verify a digital signature.
        
        Returns:
            True if signature is valid
        """
        expected_signature = self.generate_signature(content, doctor_id, timestamp)
        return hmac.compare_digest(signature, expected_signature)
    
    def hash_file(self, file_content: bytes) -> str:
        """
        Generate SHA-256 hash of file content for integrity verification.
        """
        return hashlib.sha256(file_content).hexdigest()
    
    def generate_message_id(self) -> str:
        """Generate a unique message ID."""
        return f"msg_{secrets.token_hex(16)}"
    
    def generate_consultation_id(self) -> str:
        """Generate a unique consultation ID."""
        return f"cons_{secrets.token_hex(16)}"


# Singleton instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Get the encryption service singleton."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service


# Security utilities
def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal attacks.
    """
    # Remove any path components
    filename = os.path.basename(filename)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['..', '/', '\\', '\0', '\n', '\r']
    for char in dangerous_chars:
        filename = filename.replace(char, '')
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255 - len(ext)] + ext
    
    return filename


def validate_file_type(mime_type: str, allowed_types: list) -> bool:
    """
    Validate that a file type is allowed.
    """
    return mime_type in allowed_types


ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

ALLOWED_ATTACHMENT_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_DOCUMENT_TYPES

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_attachment(
    content: bytes,
    filename: str,
    mime_type: str
) -> Tuple[bool, str]:
    """
    Validate an attachment for security.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file size
    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB"
    
    # Check MIME type
    if mime_type not in ALLOWED_ATTACHMENT_TYPES:
        return False, f"File type '{mime_type}' not allowed"
    
    # Sanitize filename
    safe_filename = sanitize_filename(filename)
    if not safe_filename:
        return False, "Invalid filename"
    
    # Check file signature (magic bytes) matches claimed MIME type
    if not _verify_file_signature(content, mime_type):
        return False, "File content does not match claimed type"
    
    return True, ""


def _verify_file_signature(content: bytes, mime_type: str) -> bool:
    """
    Verify file magic bytes match the claimed MIME type.
    Prevents disguised malicious files.
    """
    if len(content) < 8:
        return False
    
    signatures = {
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89PNG\r\n\x1a\n'],
        'image/gif': [b'GIF87a', b'GIF89a'],
        'image/webp': [b'RIFF'],  # WebP starts with RIFF
        'application/pdf': [b'%PDF'],
    }
    
    if mime_type not in signatures:
        return True  # Allow if we don't have a signature to check
    
    for sig in signatures[mime_type]:
        if content[:len(sig)] == sig:
            return True
    
    return False
