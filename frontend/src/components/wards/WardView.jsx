import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const WardView = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);

  useEffect(() => {
    if (user && ['admin','staff','doctor'].includes(user.role)) {
      api.get('/wards').then(res => setWards(res.data.data)).catch(() => setWards([]));
    }
  }, [user]);

  if (!user || !['admin', 'staff', 'doctor'].includes(user.role)) return null;

  return (
    <div className="bg-white p-6 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-4">Ward Allotment</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="border-b p-2">Ward Number</th>
            <th className="border-b p-2">Type</th>
            <th className="border-b p-2">Beds</th>
            <th className="border-b p-2">Available</th>
          </tr>
        </thead>
        <tbody>
          {wards.map(ward => (
            <tr key={ward._id}>
              <td className="border-b p-2">{ward.wardNumber}</td>
              <td className="border-b p-2">{ward.wardType}</td>
              <td className="border-b p-2">{ward.totalBeds}</td>
              <td className="border-b p-2">{ward.availableBeds}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WardView;
