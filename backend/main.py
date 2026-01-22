from fastapi import FastAPI, HTTPException, Depends
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from fhir.resources.observation import Observation
from pydantic import ValidationError
from database import get_db, init_db
from models import Patients
from datetime import datetime, timezone
import uuid
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("Database tables created/verified")
    yield()
    print("Application shutting down")

app = FastAPI(title="Nidan Vitals API", lifespan=lifespan)

@app.get("/")
def main():
    return {"message": "Hello World"}

@app.post("/api/fhir/observation")
def create_observation(payload: dict, db: Session = Depends(get_db)):
    try:
        observation = Observation(**payload)

        observation_id = observation.id or str(uuid.uuid4())

        patient_id = observation.subject.reference.split("/")[-1] if observation.subject else "Unknown"

        try:
            resource_dict = observation.model_dump(mode='json')
        except AttributeError:
            resource_dict = json.loads(observation.model_dump_json())

        db_patient = Patients(
            id=observation_id,
            patient_id=patient_id,
            resource=resource_dict,
            created_at=datetime.now(timezone.utc)
        )

        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)

        return {
            "status": "accepted",
            "id": observation_id,
            "patientId": patient_id,
            "resourceType": observation.get_resource_type()
        }

    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid FHIR format: {e.errors()}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/fhir/observation/{patient_id}")
def get_patient(patient_id: str):
    return {"message": f"Patient {patient_id} endpoint - GET method coming soon"}

