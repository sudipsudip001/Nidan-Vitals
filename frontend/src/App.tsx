import { useState, useEffect } from 'react'
import './App.css'

interface PatientData {
  id: string;
  bmi: number;
  bp: number;
  status: string;
}

interface FormData {
  patientId: string;
  height: string;
  weight: string;
  systolicBP: string;
  diastolicBP: string;
  effectiveDateTime: string;
}

type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    patientId: '',
    height: '',
    weight: '',
    systolicBP: '',
    diastolicBP: '',
    effectiveDateTime: new Date().toISOString().slice(0, 16)
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/fhir/observation');
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const observations = await response.json();

        const parsedData: PatientData[] = observations.map((resource: any) => {
          const patientId = resource.subject?.reference?.split('/')[1] || "Unknown";
          
          let bmi = 0;
          let bp = 0;

          if (resource.component) {
            resource.component.forEach((comp: any) => {
              const code = comp.code.coding[0].code;
              if (code === '39156-5') { // BMI
                bmi = comp.valueQuantity.value;
              } else if (code === '8480-6') { // Systolic BP
                bp = comp.valueQuantity.value;
              }
            });
          }

          let status = 'Normal';
          if (bmi >= 30 || bp >= 140) {
            status = 'Obese';
          } else if (bmi >= 25) {
            status = 'Overweight';
          }

          return { id: patientId, bmi, bp, status };
        });

        setData(parsedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter((person) => 
    person.id.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Calculate BMI in real-time
  const calculateBMI = (): number | null => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
    }
    return null;
  };

  // Get BMI category
  const getBMICategory = (bmi: number | null): BMICategory | null => {
    if (bmi === null) return null;
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  // Get color for BMI category
  const getBMIColor = (category: BMICategory | null): string => {
    if (category === null) return '#6b7280';
    if (category === 'Obese') return '#ff0505';
    if (category === 'Overweight') return 'rgb(255, 145, 0)';
    if (category === 'Normal') return '#16ff01';
    return '#6b7280'; // Underweight
  };

  // Check for alerts
  const hasRedAlert = (): boolean => {
    const bmi = calculateBMI();
    const systolic = parseFloat(formData.systolicBP);
    const diastolic = parseFloat(formData.diastolicBP);
    return (bmi !== null && bmi >= 30) || systolic >= 140 || diastolic >= 90;
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);
  const hasAlert = hasRedAlert();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const height = parseFloat(formData.height);
      const weight = parseFloat(formData.weight);
      const systolicBP = parseFloat(formData.systolicBP);
      const diastolicBP = parseFloat(formData.diastolicBP);

      if (!formData.patientId || !height || !weight || !systolicBP || !diastolicBP) {
        throw new Error('Please fill in all required fields');
      }

      const heightInMeters = height / 100;
      const calculatedBMI = weight / (heightInMeters * heightInMeters);

      // Format datetime to ISO string
      const dateTime = new Date(formData.effectiveDateTime).toISOString();

      const observationData = {
        resourceType: "Observation",
        status: "final",
        category: [{
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }]
        }],
        code: {
          coding: [{
            system: "http://loinc.org",
            code: "85353-1",
            display: "Vital signs, weight, height, and BMI panel"
          }],
          text: "Vital Signs Panel"
        },
        subject: { reference: `Patient/${formData.patientId}` },
        effectiveDateTime: dateTime,
        component: [
          {
            code: { 
              coding: [{ 
                system: "http://loinc.org", 
                code: "8302-2", 
                display: "Body height" 
              }] 
            },
            valueQuantity: { 
              value: height, 
              unit: "cm", 
              system: "http://unitsofmeasure.org", 
              code: "cm" 
            }
          },
          {
            code: { 
              coding: [{ 
                system: "http://loinc.org", 
                code: "29463-7", 
                display: "Body weight" 
              }] 
            },
            valueQuantity: { 
              value: weight, 
              unit: "kg", 
              system: "http://unitsofmeasure.org", 
              code: "kg" 
            }
          },
          {
            code: { 
              coding: [{ 
                system: "http://loinc.org", 
                code: "39156-5", 
                display: "Body mass index" 
              }] 
            },
            valueQuantity: { 
              value: parseFloat(calculatedBMI.toFixed(1)), 
              unit: "kg/m2", 
              system: "http://unitsofmeasure.org", 
              code: "kg/m2" 
            }
          },
          {
            code: { 
              coding: [{ 
                system: "http://loinc.org", 
                code: "8480-6", 
                display: "Systolic blood pressure" 
              }] 
            },
            valueQuantity: { 
              value: systolicBP, 
              unit: "mmHg", 
              system: "http://unitsofmeasure.org", 
              code: "mm[Hg]" 
            }
          },
          {
            code: { 
              coding: [{ 
                system: "http://loinc.org", 
                code: "8462-4", 
                display: "Diastolic blood pressure" 
              }] 
            },
            valueQuantity: { 
              value: diastolicBP, 
              unit: "mmHg", 
              system: "http://unitsofmeasure.org", 
              code: "mm[Hg]" 
            }
          }
        ]
      };

      const response = await fetch('http://127.0.0.1:8000/api/fhir/observation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(observationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit observation' }));
        throw new Error(errorData.message || 'Failed to submit observation');
      }

      setSubmitSuccess(true);
      // Reset form
      setFormData({
        patientId: '',
        height: '',
        weight: '',
        systolicBP: '',
        diastolicBP: '',
        effectiveDateTime: new Date().toISOString().slice(0, 16)
      });
      
      // Refresh data
      const fetchData = async () => {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/fhir/observation');
          if (response.ok) {
            const observations = await response.json();
            const parsedData: PatientData[] = observations.map((resource: any) => {
              const patientId = resource.subject?.reference?.split('/')[1] || "Unknown";
              let bmi = 0;
              let bp = 0;
              if (resource.component) {
                resource.component.forEach((comp: any) => {
                  const code = comp.code.coding[0].code;
                  if (code === '39156-5') {
                    bmi = comp.valueQuantity.value;
                  } else if (code === '8480-6') {
                    bp = comp.valueQuantity.value;
                  }
                });
              }
              let status = 'Normal';
              if (bmi >= 30 || bp >= 140) {
                status = 'Obese';
              } else if (bmi >= 25) {
                status = 'Overweight';
              }
              return { id: patientId, bmi, bp, status };
            });
            setData(parsedData);
          }
        } catch (err) {
          // Silently fail refresh
        }
      };
      fetchData();

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  if (loading) return <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '2rem', color: '#1f2937' }}>Loading...</div>;
  if (error) return <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '2rem', color: '#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '2rem' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#1f2937' }}>Nidan Vitals</h1>
        <br />
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => setShowForm(false)}
            className={`px-4 py-2 rounded-md font-medium ${
              !showForm
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            View Records
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={`px-4 py-2 rounded-md font-medium ${
              showForm
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Add New Record
          </button>
        </div>
      </div>
      <br />
      {showForm ? (
        <div className="max-w-3xl mx-auto">
          <div 
            className="bg-white rounded-xl shadow-xl p-8" 
            style={{ 
              backgroundColor: '#ffffff', 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#1f2937' }}>Add Vital Signs Observation</h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Enter patient vital signs data. All fields marked with * are required.</p>
            </div>
            
            {hasAlert && (
              <div 
                className="mb-6 p-4 rounded-lg border-l-4" 
                style={{
                  backgroundColor: '#fef2f2',
                  borderLeftColor: '#ef4444',
                  border: '1px solid #fecaca',
                  borderRadius: '8px'
                }}
              >
                <p style={{ color: '#dc2626', fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>
                  ⚠️ Alert: Critical Values Detected
                </p>
                <p style={{ color: '#991b1b', fontSize: '13px' }}>
                  {bmi !== null && bmi >= 30 && 'BMI ≥ 30 (Obese) • '}
                  {parseFloat(formData.systolicBP) >= 140 && 'Systolic BP ≥ 140 • '}
                  {parseFloat(formData.diastolicBP) >= 90 && 'Diastolic BP ≥ 90'}
                </p>
              </div>
            )}

            {submitSuccess && (
              <div 
                className="mb-6 p-4 rounded-lg border-l-4" 
                style={{
                  backgroundColor: '#f0fdf4',
                  borderLeftColor: '#22c55e',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px'
                }}
              >
                <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '15px' }}>
                  ✓ Observation submitted successfully!
                </p>
              </div>
            )}

            {submitError && (
              <div 
                className="mb-6 p-4 rounded-lg border-l-4" 
                style={{
                  backgroundColor: '#fef2f2',
                  borderLeftColor: '#ef4444',
                  border: '1px solid #fecaca',
                  borderRadius: '8px'
                }}
              >
                <p style={{ color: '#dc2626', fontWeight: '600', fontSize: '15px' }}>
                  Error: {submitError}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Patient Information Section */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Patient Information
                </h3>
                <div>
                  <label 
                    htmlFor="patientId" 
                    style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '0.5rem'
                    }}
                  >
                    Patient ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="patientId"
                    value={formData.patientId}
                    onChange={(e) => handleInputChange('patientId', e.target.value)}
                    placeholder="e.g., P-101"
                    style={{ 
                      width: '100%',
                      padding: '0.75rem 1rem', 
                      border: '2px solid #d1d5db', 
                      borderRadius: '8px',
                      backgroundColor: '#ffffff', 
                      color: '#1f2937',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>

              {/* Physical Measurements Section */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Physical Measurements
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label 
                      htmlFor="height" 
                      style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151', 
                        marginBottom: '0.5rem'
                      }}
                    >
                      Height (cm) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="height"
                      step="0.1"
                      min="0"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="e.g., 170"
                      style={{ 
                        width: '100%',
                        padding: '0.75rem 1rem', 
                        border: '2px solid #d1d5db', 
                        borderRadius: '8px',
                        backgroundColor: '#ffffff', 
                        color: '#1f2937',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="weight" 
                      style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151', 
                        marginBottom: '0.5rem'
                      }}
                    >
                      Weight (kg) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="weight"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="e.g., 70"
                      style={{ 
                        width: '100%',
                        padding: '0.75rem 1rem', 
                        border: '2px solid #d1d5db', 
                        borderRadius: '8px',
                        backgroundColor: '#ffffff', 
                        color: '#1f2937',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Real-time BMI Display */}
              {(formData.height || formData.weight) && bmi !== null && (
                <div 
                  style={{
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: `3px solid ${getBMIColor(bmiCategory)}`,
                    backgroundColor: `${getBMIColor(bmiCategory)}15`,
                    boxShadow: `0 4px 6px -1px ${getBMIColor(bmiCategory)}30`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Body Mass Index (Real-time Calculation)
                      </p>
                      <p style={{ fontSize: '32px', fontWeight: '700', color: getBMIColor(bmiCategory), margin: 0 }}>
                        {bmi} <span style={{ fontSize: '18px', fontWeight: '500' }}>kg/m²</span>
                      </p>
                    </div>
                    {bmiCategory && (
                      <div>
                        <span 
                          style={{ 
                            padding: '0.5rem 1.25rem',
                            borderRadius: '9999px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: getBMIColor(bmiCategory),
                            backgroundColor: `${getBMIColor(bmiCategory)}25`,
                            border: `2px solid ${getBMIColor(bmiCategory)}`
                          }}
                        >
                          {bmiCategory}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Blood Pressure Section */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Blood Pressure
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label 
                      htmlFor="systolicBP" 
                      style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151', 
                        marginBottom: '0.5rem'
                      }}
                    >
                      Systolic BP (mmHg) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="systolicBP"
                      step="1"
                      min="0"
                      value={formData.systolicBP}
                      onChange={(e) => handleInputChange('systolicBP', e.target.value)}
                      placeholder="e.g., 120"
                      style={{ 
                        width: '100%',
                        padding: '0.75rem 1rem', 
                        border: parseFloat(formData.systolicBP) >= 140 ? '2px solid #ef4444' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: parseFloat(formData.systolicBP) >= 140 ? '#fef2f2' : '#ffffff',
                        color: '#1f2937',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(formData.systolicBP);
                        e.currentTarget.style.borderColor = val >= 140 ? '#ef4444' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                    {parseFloat(formData.systolicBP) >= 140 && (
                      <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '0.5rem', fontWeight: '500' }}>
                        ⚠️ Hypertension alert
                      </p>
                    )}
                  </div>

                  <div>
                    <label 
                      htmlFor="diastolicBP" 
                      style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151', 
                        marginBottom: '0.5rem'
                      }}
                    >
                      Diastolic BP (mmHg) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="diastolicBP"
                      step="1"
                      min="0"
                      value={formData.diastolicBP}
                      onChange={(e) => handleInputChange('diastolicBP', e.target.value)}
                      placeholder="e.g., 80"
                      style={{ 
                        width: '100%',
                        padding: '0.75rem 1rem', 
                        border: parseFloat(formData.diastolicBP) >= 90 ? '2px solid #ef4444' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: parseFloat(formData.diastolicBP) >= 90 ? '#fef2f2' : '#ffffff',
                        color: '#1f2937',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(formData.diastolicBP);
                        e.currentTarget.style.borderColor = val >= 90 ? '#ef4444' : '#d1d5db';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                    {parseFloat(formData.diastolicBP) >= 90 && (
                      <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '0.5rem', fontWeight: '500' }}>
                        ⚠️ Hypertension alert
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Time Section */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Observation Details
                </h3>
                <div>
                  <label 
                    htmlFor="effectiveDateTime" 
                    style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '0.5rem'
                    }}
                  >
                    Date & Time <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="effectiveDateTime"
                    value={formData.effectiveDateTime}
                    onChange={(e) => handleInputChange('effectiveDateTime', e.target.value)}
                    style={{ 
                      width: '100%',
                      padding: '0.75rem 1rem', 
                      border: '2px solid #d1d5db', 
                      borderRadius: '8px',
                      backgroundColor: '#ffffff', 
                      color: '#1f2937',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.875rem 1.5rem',
                    backgroundColor: submitting ? '#9ca3af' : '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: submitting ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Observation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      patientId: '',
                      height: '',
                      weight: '',
                      systolicBP: '',
                      diastolicBP: '',
                      effectiveDateTime: new Date().toISOString().slice(0, 16)
                    });
                    setSubmitError(null);
                    setSubmitSuccess(false);
                  }}
                  style={{
                    padding: '0.875rem 1.5rem',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    border: '2px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <form className="max-w-md mx-auto mb-6">
            <div className="relative">
              <input 
                type="search" 
                id="search" 
                className="block w-full p-3 ps-9 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body" 
                placeholder="Search by Patient ID" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#d1d5db',
                  color: '#1f2937'
                }}
                required 
              />
              <button 
                type="button" 
                className="absolute end-1.5 bottom-1.5 text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-xs px-3 py-1.5 focus:outline-none"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff'
                }}
              >
                Search
              </button>
            </div>
          </form>
          <br />
          <table style={{ 
            width: '100%', 
            borderCollapse: 'separate', 
            borderSpacing: '0',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                <th style={{ 
                  padding: '16px 32px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  borderRight: '2px solid #d1d5db',
                  minWidth: '150px'
                }}>Patient ID</th>
                <th style={{ 
                  padding: '16px 32px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  borderRight: '2px solid #d1d5db',
                  minWidth: '120px'
                }}>BMI</th>
                <th style={{ 
                  padding: '16px 32px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  borderRight: '2px solid #d1d5db',
                  minWidth: '120px'
                }}>BP</th>
                <th style={{ 
                  padding: '16px 32px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  minWidth: '120px'
                }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((person) => (
                  <tr 
                    key={person.id} 
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ 
                      padding: '20px 32px', 
                      whiteSpace: 'nowrap', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#111827',
                      borderRight: '2px solid #e5e7eb'
                    }}>{person.id}</td>
                    <td style={{ 
                      padding: '20px 32px', 
                      whiteSpace: 'nowrap', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#111827',
                      borderRight: '2px solid #e5e7eb'
                    }}>{person.bmi}</td>
                    <td style={{ 
                      padding: '20px 32px', 
                      whiteSpace: 'nowrap', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#111827',
                      borderRight: '2px solid #e5e7eb'
                    }}>{person.bp}</td>
                    <td style={{ 
                      padding: '20px 32px', 
                      whiteSpace: 'nowrap', 
                      fontSize: '14px'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        color: person.status === 'Obese' ? '#ff0505' : 
                               person.status === 'Overweight' ? 'rgb(255, 145, 0)' : 
                               '#16ff01'
                      }}>
                        {person.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ 
                    padding: '40px 32px', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    No patient found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App