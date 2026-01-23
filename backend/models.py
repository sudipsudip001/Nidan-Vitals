from sqlalchemy import Column, TIMESTAMP, JSON, TEXT
from database import Base
from sqlalchemy.sql import func

class Patients(Base):
    __tablename__ = "patients_db"

    id = Column(TEXT, primary_key=True)
    patient_id = Column(TEXT, index=True)
    resource = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

