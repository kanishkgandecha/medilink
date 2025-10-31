import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const PatientProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user && user.role === 'patient') {
      api.get('/users/profile').then(res => setProfile(res.data.data)).catch(() => setProfile(null));
    }
  }, [user]);

  if (!user || user.role !== 'patient') return null;

  return (
    <div className="bg-white p-6 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2">My Profile</h2>
      {profile && (
        <div>
          <div>Name: {profile.firstName} {profile.lastName}</div>
          <div>Email: {profile.email}</div>
          <div>Phone: {profile.phoneNumber}</div>
          <div>Status: {profile.status}</div>
        </div>
      )}
      {!profile && <div>Loading...</div>}
    </div>
  );
};

export default PatientProfile;
