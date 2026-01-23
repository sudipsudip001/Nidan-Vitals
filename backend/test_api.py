import requests
import json

BASE_URL = "http://localhost:8000"

# Sample FHIR data for different BMI categories
test_patients = [
    {
        "name": "Normal BMI Patient",
        "patient_id": "P-101",
        "height": 170,
        "weight": 70,
        "bmi": 24.2,
        "systolic": 120,
        "diastolic": 80
    },
    {
        "name": "Overweight Patient",
        "patient_id": "P-102",
        "height": 175,
        "weight": 85,
        "bmi": 27.8,
        "systolic": 130,
        "diastolic": 85
    },
    {
        "name": "Obese Patient",
        "patient_id": "P-103",
        "height": 165,
        "weight": 90,
        "bmi": 33.1,
        "systolic": 145,
        "diastolic": 95
    },
    {
        "name": "Underweight Patient",
        "patient_id": "P-104",
        "height": 180,
        "weight": 58,
        "bmi": 17.9,
        "systolic": 110,
        "diastolic": 70
    }
]

def create_fhir_observation(patient_data):
    """Create FHIR observation from patient data"""
    return {
        "resourceType": "Observation",
        "status": "final",
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "vital-signs",
                "display": "Vital Signs"
            }]
        }],
        "code": {
            "coding": [{
                "system": "http://loinc.org",
                "code": "85353-1",
                "display": "Vital signs, weight, height, and BMI panel"
            }],
            "text": "Vital Signs Panel"
        },
        "subject": {"reference": f"Patient/{patient_data['patient_id']}"},
        "effectiveDateTime": "2026-01-22T10:00:00Z",
        "component": [
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8302-2", "display": "Body height"}]},
                "valueQuantity": {"value": patient_data["height"], "unit": "cm", "system": "http://unitsofmeasure.org", "code": "cm"}
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "29463-7", "display": "Body weight"}]},
                "valueQuantity": {"value": patient_data["weight"], "unit": "kg", "system": "http://unitsofmeasure.org", "code": "kg"}
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "39156-5", "display": "Body mass index"}]},
                "valueQuantity": {"value": patient_data["bmi"], "unit": "kg/m2", "system": "http://unitsofmeasure.org", "code": "kg/m2"}
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]},
                "valueQuantity": {"value": patient_data["systolic"], "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]"}
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure"}]},
                "valueQuantity": {"value": patient_data["diastolic"], "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]"}
            }
        ]
    }

def test_create_patients():
    """Create test patients"""
    print("\n=== Creating Test Patients ===")
    for patient in test_patients:
        fhir_data = create_fhir_observation(patient)
        response = requests.post(f"{BASE_URL}/api/fhir/observation", json=fhir_data)
        if response.status_code == 200:
            print(f"✓ Created {patient['name']} ({patient['patient_id']}) - BMI: {patient['bmi']}")
        else:
            print(f"✗ Failed to create {patient['name']}: {response.text}")

def test_get_all():
    """Test getting all observations"""
    print("\n=== Get All Observations ===")
    response = requests.get(f"{BASE_URL}/api/fhir/observation")
    data = response.json()
    print(f"✓ Total observations: {len(data)}")

def test_search_by_patient():
    """Test searching by patient ID"""
    print("\n=== Search by Patient ID ===")
    response = requests.get(f"{BASE_URL}/api/fhir/observation?patientId=P-101")
    data = response.json()
    print(f"✓ Found {len(data)} observation(s) for P-101")

def test_filter_by_status():
    """Test filtering by BMI category"""
    print("\n=== Filter by Status ===")
    
    statuses = ["normal", "overweight", "obese", "underweight"]
    for status in statuses:
        response = requests.get(f"{BASE_URL}/api/fhir/observation?status={status}")
        data = response.json()
        print(f"✓ {status.capitalize()}: {len(data)} patient(s)")

def test_combined_filters():
    """Test combining search and filter"""
    print("\n=== Combined Filters ===")
    response = requests.get(f"{BASE_URL}/api/fhir/observation?patientId=P-103&status=obese")
    data = response.json()
    print(f"✓ P-103 with obese status: {len(data)} result(s)")

if __name__ == "__main__":
    print("Starting API Tests...")
    test_create_patients()
    test_get_all()
    test_search_by_patient()
    test_filter_by_status()
    test_combined_filters()
    print("\n✓ All tests completed!")