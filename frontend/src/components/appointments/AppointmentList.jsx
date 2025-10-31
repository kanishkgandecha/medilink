import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const AppointmentList = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'patient')
      api.get('/appointments/my').then(res => setAppointments(res.data.data)).catch(() => setAppointments([]));
    else if (user.role === 'doctor')
      api.get(`/appointments?doctorId=${user.profileRef}`).then(res => setAppointments(res.data.data)).catch(() => setAppointments([]));
    else
      api.get('/appointments').then(res => setAppointments(res.data.data)).catch(() => setAppointments([]));
  }, [user]);

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-4">Appointments</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="border-b p-2">Date</th>
            <th className="border-b p-2">Patient</th>
            <th className="border-b p-2">Doctor</th>
            <th className="border-b p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map(appt => (
            <tr key={appt._id}>
              <td className="border-b p-2">{new Date(appt.appointmentDate).toLocaleDateString()}</td>
              <td className="border-b p-2">{appt.patientId?.userId?.firstName}</td>
              <td className="border-b p-2">{appt.doctorId?.userId?.lastName}</td>
              <td className="border-b p-2">{appt.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentList;
