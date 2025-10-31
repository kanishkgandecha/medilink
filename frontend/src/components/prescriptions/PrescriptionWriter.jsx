import React, { useState } from 'react';
import api from '../../services/api';

const PrescriptionWriter = () => {
  const [patientId, setPatientId] = useState('');
  const [medication, setMedication] = useState('');
  const [message, setMessage] = useState('');

  const handlePrescribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        patientId, 
        medications: [{ medicationName: medication, dosage: "1 tab", frequency: "once daily" }]
      });
      setMessage('Prescription created!');
      setPatientId('');
      setMedication('');
    } catch (err) {
      setMessage('Failed to create prescription');
    }
  };

  return (
    <form className="bg-white p-4 rounded shadow" onSubmit={handlePrescribe}>
      <h2 className="text-xl font-semibold mb-2">Write Prescription</h2>
      <input placeholder="Patient ID" value={patientId} onChange={e => setPatientId(e.target.value)} className="mb-2 block border p-2 w-full" required />
      <input placeholder="Medication" value={medication} onChange={e => setMedication(e.target.value)} className="mb-2 block border p-2 w-full" required />
      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">Prescribe</button>
      {message && <p className="text-green-600 mt-2">{message}</p>}
    </form>
  );
};

export default PrescriptionWriter;
