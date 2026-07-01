"""
Phase 2 crypto unit tests:
  - round-trip encrypt/decrypt
  - tamper detection (auth tag check)
  - wrong passphrase produces wrong key (decrypt fails)
  - envelope key wrap/unwrap round-trip
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.crypto import (
    generate_salt,
    derive_master_key,
    encrypt,
    decrypt,
    generate_data_key,
    wrap_data_key,
    unwrap_data_key,
    encrypt_secret,
    decrypt_secret,
)
from cryptography.exceptions import InvalidTag


def test_roundtrip():
    salt = generate_salt()
    key = derive_master_key("correct-passphrase", salt)
    plaintext = "my secret value"
    enc = encrypt(plaintext, key)
    assert decrypt(enc["ciphertext"], enc["iv"], enc["tag"], key) == plaintext


def test_tamper_detection():
    salt = generate_salt()
    key = derive_master_key("correct-passphrase", salt)
    enc = encrypt("important secret", key)

    import base64
    ct = bytearray(base64.b64decode(enc["ciphertext"]))
    ct[0] ^= 0xFF  # flip bits
    enc["ciphertext"] = base64.b64encode(bytes(ct)).decode()

    with pytest.raises(InvalidTag):
        decrypt(enc["ciphertext"], enc["iv"], enc["tag"], key)


def test_wrong_passphrase():
    salt = generate_salt()
    correct_key = derive_master_key("correct-passphrase", salt)
    wrong_key   = derive_master_key("wrong-passphrase", salt)

    enc = encrypt("secret", correct_key)
    with pytest.raises(InvalidTag):
        decrypt(enc["ciphertext"], enc["iv"], enc["tag"], wrong_key)


def test_envelope_roundtrip():
    salt = generate_salt()
    master_key = derive_master_key("my-master-passphrase", salt)
    data_key = generate_data_key()

    wrapped = wrap_data_key(data_key, master_key)
    recovered = unwrap_data_key(wrapped, master_key)
    assert recovered == data_key


def test_secret_encrypt_decrypt():
    data_key = generate_data_key()
    plaintext = "DATABASE_PASSWORD=super-secret-123"
    enc = encrypt_secret(plaintext, data_key)
    assert decrypt_secret(enc["value_enc"], enc["iv"], enc["tag"], data_key) == plaintext


def test_each_encrypt_unique_iv():
    key = derive_master_key("pass", generate_salt())
    enc1 = encrypt("same", key)
    enc2 = encrypt("same", key)
    assert enc1["iv"] != enc2["iv"]
    assert enc1["ciphertext"] != enc2["ciphertext"]
