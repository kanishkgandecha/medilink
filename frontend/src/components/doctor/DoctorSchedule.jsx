import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const DoctorSchedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (user?.profileRef) {
      api.get(`/doctors/${user.profileRef}/schedule?date=${new Date().toISOString().substring(0,10)}`)
        .then(res => setSchedule(res.data.data || []))
        .catch(() => setSchedule([]));
    }
  }, [user]);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Today's Appointments</h2>
      <ul>
        {schedule.length === 0 && <li>No appointments today</li>}
        {schedule.map((appt, i) => (
          <li key={i} className="py-2 border-b">
            Patient: {appt.patientId?.userId?.firstName} {appt.patientId?.userId?.lastName} — {appt.timeSlot?.startTime}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DoctorSchedule;
