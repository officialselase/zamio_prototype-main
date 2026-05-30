"""
Encryption service for secure royalty file storage
"""
import os
import hashlib
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
import base64

logger = logging.getLogger(__name__)


class RoyaltyFileEncryption:
    """Service for encrypting and decrypting royalty data files"""
    
    @classmethod
    def _get_encryption_key(cls) -> bytes:
        """Generate or retrieve encryption key from settings"""
        # In production, this should come from environment variables or secure key management
        secret_key = getattr(settings, 'ROYALTY_ENCRYPTION_KEY', 'default-royalty-key-change-in-production')
        
        # Derive a key from the secret
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'royalty_salt_2024',  # In production, use a random salt per file
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        return key
    
    @classmethod
    def encrypt_file(cls, input_path: str, output_path: str) -> bool:
        """
        Encrypt a file using Fernet encryption
        
        Args:
            input_path: Path to the file to encrypt
            output_path: Path where encrypted file will be saved
            
        Returns:
            bool: True if encryption successful
        """
        try:
            key = cls._get_encryption_key()
            fernet = Fernet(key)
            
            with open(input_path, 'rb') as input_file:
                file_data = input_file.read()
            
            encrypted_data = fernet.encrypt(file_data)
            
            with open(output_path, 'wb') as output_file:
                output_file.write(encrypted_data)
            
            # Set restrictive permissions
            os.chmod(output_path, 0o600)
            
            logger.info(f"Successfully encrypted file: {input_path} -> {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"File encryption failed: {str(e)}")
            return False
    
    @classmethod
    def decrypt_file(cls, input_path: str, output_path: str) -> bool:
        """
        Decrypt a file using Fernet encryption
        
        Args:
            input_path: Path to the encrypted file
            output_path: Path where decrypted file will be saved
            
        Returns:
            bool: True if decryption successful
        """
        try:
            key = cls._get_encryption_key()
            fernet = Fernet(key)
            
            with open(input_path, 'rb') as input_file:
                encrypted_data = input_file.read()
            
            decrypted_data = fernet.decrypt(encrypted_data)
            
            with open(output_path, 'wb') as output_file:
                output_file.write(decrypted_data)
            
            # Set restrictive permissions
            os.chmod(output_path, 0o600)
            
            logger.info(f"Successfully decrypted file: {input_path} -> {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"File decryption failed: {str(e)}")
            return False
    
    @classmethod
    def verify_file_integrity(cls, file_path: str, expected_hash: str) -> bool:
        """
        Verify file integrity using SHA-256 hash
        
        Args:
            file_path: Path to the file to verify
            expected_hash: Expected SHA-256 hash
            
        Returns:
            bool: True if integrity check passes
        """
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            calculated_hash = hashlib.sha256(file_content).hexdigest()
            return calculated_hash == expected_hash
            
        except Exception as e:
            logger.error(f"File integrity verification failed: {str(e)}")
            return False