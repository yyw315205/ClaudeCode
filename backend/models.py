import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="member")  # 'admin' | 'member'
    is_active = Column(Boolean, default=True)


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    industry = Column(String)
    website = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(String)
    custom_fields = Column(JSON, default={})
    created_by = Column(String, ForeignKey("users.id"), nullable=True)

    contacts = relationship("Contact", back_populates="company")
    deals = relationship("Deal", back_populates="company")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    title = Column(String)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    custom_fields = Column(JSON, default={})
    created_by = Column(String, ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")


class Property(Base):
    __tablename__ = "properties"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    field_key = Column(String, nullable=False)
    field_type = Column(String, nullable=False)  # text, number, email, phone, url, date, select
    entity_type = Column(String, nullable=False)  # contact, company, deal
    required = Column(Boolean, default=False)
    options = Column(JSON, default=[])
    section = Column(String, default="details")  # 'summary' | 'details'


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)

    stages = relationship(
        "PipelineStage",
        back_populates="pipeline",
        order_by="PipelineStage.order",
        cascade="all, delete-orphan",
    )
    deals = relationship("Deal", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    pipeline_id = Column(String, ForeignKey("pipelines.id"), nullable=False)
    color = Column(String, default="#3B82F6")

    pipeline = relationship("Pipeline", back_populates="stages")
    deals = relationship("Deal", back_populates="stage")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    value = Column(Float, default=0)
    pipeline_id = Column(String, ForeignKey("pipelines.id"), nullable=False)
    stage_id = Column(String, ForeignKey("pipeline_stages.id"), nullable=False)
    contact_id = Column(String, ForeignKey("contacts.id"), nullable=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    custom_fields = Column(JSON, default={})
    status = Column(String, default="open")  # 'open' | 'won' | 'lost'
    close_date = Column(String, nullable=True)  # ISO date string
    created_by = Column(String, ForeignKey("users.id"), nullable=True)

    pipeline = relationship("Pipeline", back_populates="deals")
    stage = relationship("PipelineStage", back_populates="deals")
    contact = relationship("Contact", back_populates="deals")
    company = relationship("Company", back_populates="deals")
