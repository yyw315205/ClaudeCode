from pydantic import BaseModel
from typing import Optional, List, Any, Dict


# --- Shared refs ---

class CompanyRef(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class ContactRef(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


# --- User ---

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "member"  # 'admin' | 'member'


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# --- Auth ---

class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# --- Company ---

class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = {}


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class CompanyResponse(CompanyBase):
    id: str
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


# --- Contact ---

class ContactBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    company_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = {}


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    company_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class ContactResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    company_id: Optional[str] = None
    company: Optional[CompanyRef] = None
    custom_fields: Optional[Dict[str, Any]] = {}
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


# --- Property ---

class PropertyBase(BaseModel):
    name: str
    field_key: str
    field_type: str  # text, number, email, phone, url, date, select
    entity_type: str  # contact, company, deal
    required: bool = False
    options: Optional[List[str]] = []
    section: str = "details"  # 'summary' | 'details'


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    section: Optional[str] = None


class PropertyResponse(PropertyBase):
    id: str

    class Config:
        from_attributes = True


# --- Pipeline Stage ---

class PipelineStageBase(BaseModel):
    name: str
    order: int = 0
    color: str = "#3B82F6"


class PipelineStageCreate(PipelineStageBase):
    pass


class PipelineStageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    color: Optional[str] = None


class PipelineStageResponse(PipelineStageBase):
    id: str
    pipeline_id: str

    class Config:
        from_attributes = True


# --- Deal ---

class DealBase(BaseModel):
    title: str
    value: float = 0
    pipeline_id: str
    stage_id: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = {}
    status: str = "open"  # 'open' | 'won' | 'lost'
    close_date: Optional[str] = None


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage_id: Optional[str] = None
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    close_date: Optional[str] = None


class DealResponse(BaseModel):
    id: str
    title: str
    value: float
    pipeline_id: str
    stage_id: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    contact: Optional[ContactRef] = None
    company: Optional[CompanyRef] = None
    custom_fields: Optional[Dict[str, Any]] = {}
    status: str = "open"
    close_date: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class PipelineStageWithDeals(PipelineStageResponse):
    deals: List[DealResponse] = []


# --- Pipeline ---

class PipelineBase(BaseModel):
    name: str


class PipelineCreate(PipelineBase):
    stages: Optional[List[PipelineStageCreate]] = []


class PipelineUpdate(BaseModel):
    name: Optional[str] = None


class PipelineResponse(PipelineBase):
    id: str
    stages: List[PipelineStageWithDeals] = []

    class Config:
        from_attributes = True
