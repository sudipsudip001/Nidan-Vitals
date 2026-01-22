import { useState, useEffect } from 'react'
import './App.css'

interface PatientData {
  id: string;
  bmi: number;
  bp: number;
  status: string;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div>
        <h1>Nidan Vitals</h1>
      </div>
      <div className="overflow-x-auto">
        <form className="max-w-md mx-auto">
          <div className="relative">
            <input 
              type="search" 
              id="search" 
              className="block w-full p-3 ps-9 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body" 
              placeholder="Search by Patient ID" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              required 
            />
            <button type="button" className="absolute end-1.5 bottom-1.5 text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-xs px-3 py-1.5 focus:outline-none">Search</button>
          </div>
        </form>
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className='bg-gray-100 border-b'>
              <th className='px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase'>Patient ID</th>
              <th className='px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase'>BMI</th>
              <th className='px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase'>BP</th>
              <th className='px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase'>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((person) => (
                <tr key={person.id} className='hover:bg-gray-50 transition-colors'>
                  <td className='px-8 py-6 whitespace-nowrap text-sm font-medium text-gray-900'>{person.id}</td>
                  <td className='px-8 py-6 whitespace-nowrap text-sm font-medium text-gray-900'>{person.bmi}</td>
                  <td className='px-8 py-6 whitespace-nowrap text-sm font-medium text-gray-900'>{person.bp}</td>
                  <td className='px-8 py-6 whitespace-nowrap text-sm'>
                    <span className="px-2 py-1 rounded-full text-xs" style={
                      person.status === 'Obese' ? { color: '#ff0505' } : 
                      person.status === 'Overweight' ? { color: 'rgb(255, 145, 0)' } : 
                      { color: '#16ff01' }
                    }>
                      {person.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-10 text-center text-gray-500">
                  No patient found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default App