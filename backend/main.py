import base64
import binascii
import hashlib
import hmac
import json as _json
import secrets
import time as _time
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer


# ── Minimal HS256 JWT (no external crypto dependency) ─────────────────────────
class JWTError(Exception):
    pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _jwt_encode(payload: dict, secret: str) -> str:
    header = _b64url_encode(_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url_encode(_json.dumps(payload).encode())
    signing_input = f"{header}.{body}"
    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def _jwt_decode(token: str, secret: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise JWTError("Invalid token format")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    try:
        actual = _b64url_decode(sig_b64)
    except Exception:
        raise JWTError("Invalid token encoding")
    if not hmac.compare_digest(expected, actual):
        raise JWTError("Invalid signature")
    try:
        payload = _json.loads(_b64url_decode(payload_b64))
    except Exception:
        raise JWTError("Invalid payload")
    if "exp" in payload and payload["exp"] < _time.time():
        raise JWTError("Token expired")
    return payload
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

# ── JWT config ─────────────────────────────────────────────────────────────────
# In production, set this via an environment variable.
SECRET_KEY = "lean-crm-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── DB migrations (add new columns to existing SQLite DB) ─────────────────────
def run_migrations():
    migrations = [
        "ALTER TABLE deals ADD COLUMN status VARCHAR DEFAULT 'open'",
        "ALTER TABLE deals ADD COLUMN close_date VARCHAR",
        "ALTER TABLE deals ADD COLUMN created_by VARCHAR",
        "ALTER TABLE contacts ADD COLUMN created_by VARCHAR",
        "ALTER TABLE companies ADD COLUMN created_by VARCHAR",
        "ALTER TABLE properties ADD COLUMN section VARCHAR DEFAULT 'details'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Column already exists — safe to ignore


# ── App startup ────────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="Lean CRM API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def gen_id() -> str:
    return str(uuid.uuid4())


# ── Auth helpers ───────────────────────────────────────────────────────────────
_PBKDF2_ITERS = 260_000


def hash_password(plain: str) -> str:
    """PBKDF2-HMAC-SHA256 — stdlib only, no passlib/bcrypt needed."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), _PBKDF2_ITERS)
    return f"pbkdf2:sha256:{_PBKDF2_ITERS}:{salt}:{binascii.hexlify(dk).decode()}"


def verify_password(plain: str, stored: str) -> bool:
    try:
        _, alg, iters, salt, stored_hex = stored.split(":")
        dk = hashlib.pbkdf2_hmac(alg, plain.encode(), salt.encode(), int(iters))
        return hmac.compare_digest(binascii.hexlify(dk).decode(), stored_hex)
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode["exp"] = expire.timestamp()
    return _jwt_encode(to_encode, SECRET_KEY)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = _jwt_decode(token, SECRET_KEY)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise credentials_exc
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def can_mutate(record_created_by: Optional[str], current_user: models.User):
    """Raises 403 if a member tries to modify a record they don't own."""
    if current_user.role == "admin":
        return
    if record_created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only modify your own records")


# ── Seed default admin on first run ───────────────────────────────────────────
def seed_admin(db: Session):
    if db.query(models.User).count() == 0:
        admin = models.User(
            id=gen_id(),
            username="admin",
            hashed_password=hash_password("admin"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()


with next(get_db()) as db:
    seed_admin(db)


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ── User management (admin only) ──────────────────────────────────────────────

@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.post("/api/users", response_model=schemas.UserResponse, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = models.User(
        id=gen_id(),
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: str,
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.username is not None:
        existing = db.query(models.User).filter(models.User.username == payload.username).first()
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = payload.username
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  COMPANIES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/companies", response_model=List[schemas.CompanyResponse])
def list_companies(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Company).all()


@app.post("/api/companies", response_model=schemas.CompanyResponse, status_code=201)
def create_company(
    payload: schemas.CompanyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = models.Company(id=gen_id(), created_by=current_user.id, **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(
    company_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    return obj


@app.put("/api/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(
    company_id: str,
    payload: schemas.CompanyUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    can_mutate(obj.created_by, current_user)
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/companies/{company_id}", status_code=204)
def delete_company(
    company_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    can_mutate(obj.created_by, current_user)
    db.delete(obj)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  CONTACTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/contacts", response_model=List[schemas.ContactResponse])
def list_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Contact).all()


@app.post("/api/contacts", response_model=schemas.ContactResponse, status_code=201)
def create_contact(
    payload: schemas.ContactCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = models.Contact(id=gen_id(), created_by=current_user.id, **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/contacts/{contact_id}", response_model=schemas.ContactResponse)
def get_contact(
    contact_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    return obj


@app.put("/api/contacts/{contact_id}", response_model=schemas.ContactResponse)
def update_contact(
    contact_id: str,
    payload: schemas.ContactUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    can_mutate(obj.created_by, current_user)
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    can_mutate(obj.created_by, current_user)
    db.delete(obj)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  PROPERTIES  (admin only for write)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/properties", response_model=List[schemas.PropertyResponse])
def list_properties(
    entity_type: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Property)
    if entity_type:
        q = q.filter(models.Property.entity_type == entity_type)
    return q.all()


@app.post("/api/properties", response_model=schemas.PropertyResponse, status_code=201)
def create_property(
    payload: schemas.PropertyCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = models.Property(id=gen_id(), **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.put("/api/properties/{prop_id}", response_model=schemas.PropertyResponse)
def update_property(
    prop_id: str,
    payload: schemas.PropertyUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Property).filter(models.Property.id == prop_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/properties/{prop_id}", status_code=204)
def delete_property(
    prop_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Property).filter(models.Property.id == prop_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(obj)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  PIPELINES  (create/delete admin only; read all)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/pipelines", response_model=List[schemas.PipelineResponse])
def list_pipelines(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Pipeline).all()


@app.post("/api/pipelines", response_model=schemas.PipelineResponse, status_code=201)
def create_pipeline(
    payload: schemas.PipelineCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pipeline_id = gen_id()
    db_pipeline = models.Pipeline(id=pipeline_id, name=payload.name)
    db.add(db_pipeline)
    db.flush()
    for i, stage in enumerate(payload.stages or []):
        db_stage = models.PipelineStage(
            id=gen_id(),
            pipeline_id=pipeline_id,
            name=stage.name,
            order=i,
            color=stage.color,
        )
        db.add(db_stage)
    db.commit()
    db.refresh(db_pipeline)
    return db_pipeline


@app.get("/api/pipelines/{pipeline_id}", response_model=schemas.PipelineResponse)
def get_pipeline(
    pipeline_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return obj


@app.put("/api/pipelines/{pipeline_id}", response_model=schemas.PipelineResponse)
def update_pipeline(
    pipeline_id: str,
    payload: schemas.PipelineUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/pipelines/{pipeline_id}", status_code=204)
def delete_pipeline(
    pipeline_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    db.delete(obj)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  STAGES  (admin only for write)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/pipelines/{pipeline_id}/stages", response_model=schemas.PipelineStageResponse, status_code=201)
def add_stage(
    pipeline_id: str,
    payload: schemas.PipelineStageCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pipeline = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    max_order = max((s.order for s in pipeline.stages), default=-1)
    obj = models.PipelineStage(
        id=gen_id(),
        pipeline_id=pipeline_id,
        name=payload.name,
        order=max_order + 1,
        color=payload.color,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.put("/api/stages/{stage_id}", response_model=schemas.PipelineStageResponse)
def update_stage(
    stage_id: str,
    payload: schemas.PipelineStageUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == stage_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Stage not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/stages/{stage_id}", status_code=204)
def delete_stage(
    stage_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == stage_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Stage not found")
    db.delete(obj)
    db.commit()


@app.post("/api/stages/reorder")
def reorder_stages(
    stage_orders: List[dict],
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    for item in stage_orders:
        obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == item["id"]).first()
        if obj:
            obj.order = item["order"]
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
#  DEALS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/deals", response_model=List[schemas.DealResponse])
def list_deals(
    pipeline_id: Optional[str] = None,
    stage_id: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Deal)
    if pipeline_id:
        q = q.filter(models.Deal.pipeline_id == pipeline_id)
    if stage_id:
        q = q.filter(models.Deal.stage_id == stage_id)
    return q.all()


@app.post("/api/deals", response_model=schemas.DealResponse, status_code=201)
def create_deal(
    payload: schemas.DealCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = models.Deal(id=gen_id(), created_by=current_user.id, **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/deals/{deal_id}", response_model=schemas.DealResponse)
def get_deal(
    deal_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    return obj


@app.put("/api/deals/{deal_id}", response_model=schemas.DealResponse)
def update_deal(
    deal_id: str,
    payload: schemas.DealUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    can_mutate(obj.created_by, current_user)
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/deals/{deal_id}", status_code=204)
def delete_deal(
    deal_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    can_mutate(obj.created_by, current_user)
    db.delete(obj)
    db.commit()
