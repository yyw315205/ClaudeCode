import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lean CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def gen_id() -> str:
    return str(uuid.uuid4())


# ─────────────────────────── COMPANIES ────────────────────────────────────────

@app.get("/api/companies", response_model=List[schemas.CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return db.query(models.Company).all()


@app.post("/api/companies", response_model=schemas.CompanyResponse, status_code=201)
def create_company(payload: schemas.CompanyCreate, db: Session = Depends(get_db)):
    obj = models.Company(id=gen_id(), **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(company_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    return obj


@app.put("/api/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(company_id: str, payload: schemas.CompanyUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/companies/{company_id}", status_code=204)
def delete_company(company_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(obj)
    db.commit()


# ─────────────────────────── CONTACTS ─────────────────────────────────────────

@app.get("/api/contacts", response_model=List[schemas.ContactResponse])
def list_contacts(db: Session = Depends(get_db)):
    return db.query(models.Contact).all()


@app.post("/api/contacts", response_model=schemas.ContactResponse, status_code=201)
def create_contact(payload: schemas.ContactCreate, db: Session = Depends(get_db)):
    obj = models.Contact(id=gen_id(), **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/contacts/{contact_id}", response_model=schemas.ContactResponse)
def get_contact(contact_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    return obj


@app.put("/api/contacts/{contact_id}", response_model=schemas.ContactResponse)
def update_contact(contact_id: str, payload: schemas.ContactUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(obj)
    db.commit()


# ─────────────────────────── PROPERTIES ───────────────────────────────────────

@app.get("/api/properties", response_model=List[schemas.PropertyResponse])
def list_properties(entity_type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Property)
    if entity_type:
        q = q.filter(models.Property.entity_type == entity_type)
    return q.all()


@app.post("/api/properties", response_model=schemas.PropertyResponse, status_code=201)
def create_property(payload: schemas.PropertyCreate, db: Session = Depends(get_db)):
    obj = models.Property(id=gen_id(), **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.put("/api/properties/{prop_id}", response_model=schemas.PropertyResponse)
def update_property(prop_id: str, payload: schemas.PropertyUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Property).filter(models.Property.id == prop_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/properties/{prop_id}", status_code=204)
def delete_property(prop_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Property).filter(models.Property.id == prop_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(obj)
    db.commit()


# ─────────────────────────── PIPELINES ────────────────────────────────────────

@app.get("/api/pipelines", response_model=List[schemas.PipelineResponse])
def list_pipelines(db: Session = Depends(get_db)):
    return db.query(models.Pipeline).all()


@app.post("/api/pipelines", response_model=schemas.PipelineResponse, status_code=201)
def create_pipeline(payload: schemas.PipelineCreate, db: Session = Depends(get_db)):
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
def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return obj


@app.put("/api/pipelines/{pipeline_id}", response_model=schemas.PipelineResponse)
def update_pipeline(pipeline_id: str, payload: schemas.PipelineUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/pipelines/{pipeline_id}", status_code=204)
def delete_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    db.delete(obj)
    db.commit()


# ─────────────────────────── STAGES ───────────────────────────────────────────

@app.post("/api/pipelines/{pipeline_id}/stages", response_model=schemas.PipelineStageResponse, status_code=201)
def add_stage(pipeline_id: str, payload: schemas.PipelineStageCreate, db: Session = Depends(get_db)):
    pipeline = db.query(models.Pipeline).filter(models.Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    # Set order to end of list
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
def update_stage(stage_id: str, payload: schemas.PipelineStageUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == stage_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Stage not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/stages/{stage_id}", status_code=204)
def delete_stage(stage_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == stage_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Stage not found")
    db.delete(obj)
    db.commit()


@app.post("/api/stages/reorder")
def reorder_stages(stage_orders: List[dict], db: Session = Depends(get_db)):
    """Accepts list of {id, order} objects to bulk-update stage order."""
    for item in stage_orders:
        obj = db.query(models.PipelineStage).filter(models.PipelineStage.id == item["id"]).first()
        if obj:
            obj.order = item["order"]
    db.commit()
    return {"ok": True}


# ─────────────────────────── DEALS ────────────────────────────────────────────

@app.get("/api/deals", response_model=List[schemas.DealResponse])
def list_deals(
    pipeline_id: Optional[str] = None,
    stage_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Deal)
    if pipeline_id:
        q = q.filter(models.Deal.pipeline_id == pipeline_id)
    if stage_id:
        q = q.filter(models.Deal.stage_id == stage_id)
    return q.all()


@app.post("/api/deals", response_model=schemas.DealResponse, status_code=201)
def create_deal(payload: schemas.DealCreate, db: Session = Depends(get_db)):
    obj = models.Deal(id=gen_id(), **payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/deals/{deal_id}", response_model=schemas.DealResponse)
def get_deal(deal_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    return obj


@app.put("/api/deals/{deal_id}", response_model=schemas.DealResponse)
def update_deal(deal_id: str, payload: schemas.DealUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/deals/{deal_id}", status_code=204)
def delete_deal(deal_id: str, db: Session = Depends(get_db)):
    obj = db.query(models.Deal).filter(models.Deal.id == deal_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Deal not found")
    db.delete(obj)
    db.commit()
