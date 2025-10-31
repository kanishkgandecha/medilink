import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    api.get('/patients').then(res => setPatients(res.data.data)).catch(() => setPatients([]));
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">My Patients</h2>
      <ul>
        {patients.map(p => (
          <li key={p._id} className="border-b py-2">{p.userId?.firstName} {p.userId?.lastName}</li>
        ))}
      </ul>
    </div>
  );
};

export default DoctorPatients;
