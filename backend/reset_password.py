import hashlib, secrets, binascii
from database import engine
from sqlalchemy import text

def hash_password(plain):
    iters = 260000
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), iters)
    return f'pbkdf2:sha256:{iters}:{salt}:{binascii.hexlify(dk).decode()}'

new_hash = hash_password('admin')
with engine.connect() as conn:
    conn.execute(text("UPDATE users SET username='admin', hashed_password=:h WHERE role='admin'"), {'h': new_hash})
    conn.commit()
    print('Done - login with admin / admin')
