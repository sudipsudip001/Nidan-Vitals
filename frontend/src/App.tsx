import { useState } from 'react'
import './App.css'

function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const data = [
    { id: 1, name: 'Jane Cooper', bmi: 23, bp: 35, status: 'Normal' },
    { id: 2, name: 'Cody Fisher', bmi: 33, bp: 92, status: 'Obese' },
    { id: 3, name: 'John Cena', bmi: 12, bp: 121, status: 'Normal' },
    { id: 4, name: 'The Undertaker', bmi: 26, bp: 88, status: 'Overweight' },
    { id: 5, name: 'Batista', bmi: 26, bp: 88, status: 'Obese' },
  ];

  const filteredData = data.filter((person) => 
    person.status.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  return (
    <>
      <div>
        <h1>Nidan Vitals</h1>
      </div>
      <div className="overflow-x-auto">
      <form className="max-w-md mx-auto">   
          <label className="block mb-2.5 text-sm font-medium text-heading sr-only ">Search</label>
          <div className="relative">
              <input type="search" id="search" className="block w-full p-3 ps-9 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body" placeholder="Search" required />
              <button type="button" className="absolute end-1.5 bottom-1.5 text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-xs px-3 py-1.5 focus:outline-none">Search</button>
          </div>
      </form>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className='bg-gray-100 border-b'>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Patient ID</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Name</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>BMI</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>BP</th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Status</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {data.map((person) => (
              <tr key={person.id} className='hover:bg-gray-50 transition-colors'>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{person.id}</td>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{person.name}</td>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{person.bmi}</td>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{person.bp}</td>
                <td className='px-6 py-4 whitespace-nowrap text-sm'>
                  <span className="px-2 py-1 rounded-full text-xs" style={person.status === 'Normal' ? { color: '#16ff01' } : person.status === 'Overweight' ? { color: 'rgb(255, 145, 0)'} : { color: '#ff0505' }}>
                    {person.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-6">
        {/* 2. Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by status..."
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{person.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={person.status === 'Normal' ? { color: '#16ff01' } : person.status === 'Overweight' ? { color: 'rgb(255, 145, 0)'} : { color: '#ff0505' }}>
                        {person.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-500">
                    No results found for "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default App