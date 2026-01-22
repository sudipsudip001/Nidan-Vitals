from fastapi import FastAPI, HTTPException, Depends, Query
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from fhir.resources.observation import Observation
from pydantic import ValidationError
from database import get_db, init_db
from models import Patients
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("Database tables created/verified")
    yield()
    print("Application shutting down")

app = FastAPI(title="Nidan Vitals API", lifespan=lifespan)

def calculate_bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "underweight"
    elif 18.5 <= bmi < 25:
        return "normal"
    elif 25 <= bmi < 30:
        return "overweight"
    else:
        return "obese"

def extract_vitals_from_fhir(resource: dict) -> dict:
    vitals = {
        "height": None,
        "weight": None,
        "bmi": None,
        "systolic_bp": None,
        "diastolic_bp": None
    }

    components = resource.get("component", [])

    for component in components:
        code = component.get("code", {}).get("coding", [{}])[0].get("code", "")
        value = component.get("valueQuantity", {}).get("value")
        
        if code == "8302-2":  # Body height
            vitals["height"] = value
        elif code == "29463-7":  # Body weight
            vitals["weight"] = value
        elif code == "39156-5":  # BMI
            vitals["bmi"] = value
        elif code == "8480-6":  # Systolic BP
            vitals["systolic_bp"] = value
        elif code == "8462-4":  # Diastolic BP
            vitals["diastolic_bp"] = value

    return vitals


@app.get("/")
def main():
    return {"message": "Hello World"}

@app.post("/api/fhir/observation")
def create_observation(payload: dict, db: Session = Depends(get_db)):
    try:
        observation = Observation(**payload)
 
        observation_id = observation.id or str(uuid.uuid4())

        patient_id = observation.subject.reference.split("/")[-1] if observation.subject else "Unknown"

        existing = db.query(Patients).filter(Patients.patient_id == patient_id).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Patient {patient_id} already has an observation record."
            )

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


@app.get("/api/fhir/observation")
def get_observations(
    patientId: Optional[str] = Query(None, description="Search by Patiend ID"),
    status: Optional[str] = Query("all", description="Filter by BMI category: all, normal, overweight, obese, underweight"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Patients)
        if patientId:
            query = query.filter(Patients.patient_id == patientId)

        records = query.all()

        if not records:
            return []
        
        filtered_observations = []

        for record in records:
            resource = record.resource

            vitals = extract_vitals_from_fhir(resource)
            bmi = vitals.get("bmi")

            if bmi:
                bmi_category = calculate_bmi_category(bmi)
                if status.lower() == "all" or status.lower() == bmi_category:
                    filtered_observations.append(resource)
            else:
                if status.lower() == "all":
                    filtered_observations.append(resource)
        return filtered_observations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving observations: {str(e)}")

@app.get("/api/fhir/observation/{patient_id}")
def get_patient_observations(patient_id: str, db: Session = Depends(get_db)):
    try:
        records = db.query(Patients).filter(Patients.patient_id == patient_id).all()

        if not records:
            raise HTTPException(status_code=404, detail=f"No observations found for patient {patient_id}")
        
        observations = [record.resource for record in records]
        return observations
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving patient observations: {str(e)}")

