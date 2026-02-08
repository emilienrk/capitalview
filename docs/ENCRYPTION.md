# 🔐 Security and Encryption - CapitalView

## Overview

The CapitalView encryption system protects sensitive data (account numbers, amounts, private notes) via a **Zero-Knowledge** model: data is encrypted client-side with a key derived from the user's password. The server can neither read nor decrypt this data.

## Architecture

### Cryptographic Components

| Algorithm | Usage | Justification |
|------------|-------|---------------|
| **Argon2id** | Auth password hashing | Resistant to GPU/ASIC attacks, memory protection |
| **HKDF-SHA256** | Subkey derivation | NIST standard, context separation |
| **AES-256-GCM** | Data encryption | Authenticated (AEAD), industry standard |
| **HMAC-SHA256** | Blind indexing | Search without revealing data |

### Encryption Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                              USER                               │
│  Password + Salt (DB) → [Argon2id] → Master Key (32 bytes)      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         [HKDF context="data"]         [HKDF context="index"]
                │                             │
                ▼                             ▼
      Data Encryption Key              Blind Indexing Key
      (AES-GCM encryption)             (HMAC for search)
                │                             │
                ▼                             ▼
      Encrypted Data (DB)            Searchable Indexes (DB)
```

## Implementation

### 1. Password Hashing (Authentication)

```python
from services.encryption import hash_password

# On registration
hashed_password = hash_password("my_password")
# → Stored in DB for authentication
```

**Argon2id Parameters**:
- `opslimit`: `INTERACTIVE` (4 iterations)
- `memlimit`: `INTERACTIVE` (64 MiB)
- Format: PHC (Argon2id)

### 2. User Salt Generation

```python
from services.encryption import init_salt

# At account creation
user_salt = init_salt()
# → Stored in DB (unique per user)
```

### 3. Master Key Derivation

```python
from services.encryption import get_masterkey

# At login (client-side or secure backend)
master_key = get_masterkey(password="my_password", salt=user_salt)
# → Master Key (Base64): never stored, recreated at each session
```

**Security**:
- The Master Key is regenerated from the password + salt
- **Never stored** in database or long-term session
- Remains in memory only during the active session

### 4. Data Encryption

```python
from services.encryption import encrypt_data

# Encryption of sensitive data
account_number = "FR76 1234 5678 9012 3456 7890 123"
encrypted = encrypt_data(data_string=account_number, masterkey=master_key)
# → Stored in DB: "oXm9k3L... (Base64)"
```

**Stored Format**: `nonce (12 bytes) + ciphertext + auth_tag`

### 5. Decryption

```python
from services.encryption import decrypt_data

# Retrieval from DB
plaintext = decrypt_data(encrypted_data=encrypted, masterkey=master_key)
# → "FR76 1234 5678 9012 3456 7890 123"
```

### 6. Blind Indexing (Encrypted Search)

```python
from services.encryption import hash_index

# Generating an index for a UUID
uuid = "550e8400-e29b-41d4-a716-446655440000"
blind_index = hash_index(uuid=uuid, masterkey=master_key)
# → Stored in DB for search: "hG7xP2... (Base64)"
```

**Use Case**:
- Search for a bank account without decrypting all accounts
- Check crypto existence without exposing the wallet
- Performant: index lookup instead of brute-force decryption

## Data Model

### Table `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,  -- Argon2id (authentication)
    salt VARCHAR NOT NULL,            -- Unique salt (Base64)
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### Table with encrypted data (example: `bank_accounts`)

```sql
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    account_number_encrypted TEXT NOT NULL,  -- AES-GCM Encrypted
    account_number_index VARCHAR NOT NULL,   -- Blind index HMAC
    balance_encrypted TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    INDEX idx_account_search (user_id, account_number_index)
);
```

## Key Management

### Lifecycle

```
1. Registration
   ↓
   Salt generation → DB Storage
   Password hashing → DB Storage
   
2. Login
   ↓
   DB Salt retrieval
   Master Key derivation (in memory)
   
3. Active Session
   ↓
   Master Key in memory (frontend/secure backend)
   Encryption/decryption on demand
   
4. Logout
   ↓
   Master Key removal from memory
```

### Key Rotation

**Password Change**:
1. Decrypt all data with old Master Key
2. Generate a new salt
3. Derive new Master Key
4. Re-encrypt all data
5. Update authentication hash

**Code**:
```python
# Rotation pseudo-code
old_master_key = get_masterkey(old_password, old_salt)
new_salt = init_salt()
new_master_key = get_masterkey(new_password, new_salt)

for account in user.accounts:
    plaintext = decrypt_data(account.encrypted_data, old_master_key)
    account.encrypted_data = encrypt_data(plaintext, new_master_key)
    account.blind_index = hash_index(account.uuid, new_master_key)

user.salt = new_salt
user.password_hash = hash_password(new_password)
```

## Advanced Security

### Protection Against Attacks

| Attack | Protection |
|---------|-----------|
| **Rainbow tables** | Unique salt per user + Argon2id |
| **Brute-force GPU** | Argon2id with high memory cost |
| **Timing attacks** | Constant time comparison (built-in PyNaCl/Cryptography) |
| **Replay attacks** | Unique nonce per encryption (AES-GCM) |
| **Tampering** | GCM authentication tag (AEAD) |

### Recommendations

#### ✅ Do
- Use HTTPS/TLS for all communications
- Store Master Key in short-term memory only
- Clear sensitive buffers after use
- Implement rate-limiting on login attempts
- Log access to sensitive data (audit trail)

#### ❌ Don't
- Store Master Key in DB or localStorage
- Transmit Master Key via URL/GET params
- Reuse nonces (AES-GCM)
- Expose plaintext data in logs
- Share salt between users

## Compliance

### GDPR
- ✅ Personal data encryption
- ✅ Right to be forgotten: salt deletion = unrecoverable data
- ✅ Portability: export of decrypted data

### Standards
- **NIST SP 800-132**: PBKDF (Argon2id compliant)
- **NIST SP 800-108**: Key derivation (HKDF)
- **FIPS 197**: AES-256
- **RFC 5869**: HKDF

## Limitations and Considerations

### Performance
- **Argon2id**: ~100ms per derivation (adjustable based on hardware)
- **Encryption/Decryption**: ~microsecond per operation
- **Blind indexing**: O(1) for search

### Residual Risks
1. **Weak password**: Enforce strict policy (12+ characters)
2. **Session compromise**: Automatic timeout after inactivity
3. **Side-channel attacks**: Use secure hardware in production

## References

- [PyNaCl Documentation](https://pynacl.readthedocs.io/)
- [Cryptography.io](https://cryptography.io/)
- [Argon2 RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106)
- [HKDF RFC 5869](https://datatracker.ietf.org/doc/html/rfc5869)
- [AES-GCM NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final)