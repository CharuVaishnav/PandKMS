import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


def generate_salt() -> bytes:
    return os.urandom(32)


def derive_master_key(passphrase: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600_000)
    return kdf.derive(passphrase.encode())


def _b64e(b: bytes) -> str:
    return base64.b64encode(b).decode()


def _b64d(s: str) -> bytes:
    return base64.b64decode(s)


def encrypt(plaintext: str, key: bytes) -> dict:
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ct_with_tag = aesgcm.encrypt(iv, plaintext.encode(), None)
    ct = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return {"ciphertext": _b64e(ct), "iv": _b64e(iv), "tag": _b64e(tag)}


def decrypt(ciphertext: str, iv: str, tag: str, key: bytes) -> str:
    aesgcm = AESGCM(key)
    ct_with_tag = _b64d(ciphertext) + _b64d(tag)
    plaintext = aesgcm.decrypt(_b64d(iv), ct_with_tag, None)
    return plaintext.decode()


def generate_data_key() -> bytes:
    return os.urandom(32)


def wrap_data_key(data_key: bytes, master_key: bytes) -> dict:
    return encrypt(base64.b64encode(data_key).decode(), master_key)


def unwrap_data_key(wrapped: dict, master_key: bytes) -> bytes:
    b64 = decrypt(wrapped["ciphertext"], wrapped["iv"], wrapped["tag"], master_key)
    return base64.b64decode(b64)


def encrypt_secret(plaintext: str, data_key: bytes) -> dict:
    result = encrypt(plaintext, data_key)
    return {"value_enc": result["ciphertext"], "iv": result["iv"], "tag": result["tag"]}


def decrypt_secret(value_enc: str, iv: str, tag: str, data_key: bytes) -> str:
    return decrypt(value_enc, iv, tag, data_key)
