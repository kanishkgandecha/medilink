import React, { useState, useEffect } from 'react';
import { appointmentAPI, patientAPI, prescriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    todayTotal: 0,
    completed: 0,
    pending: 0,
    totalPatients: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      const { data } = await appointmentAPI.getAllAppointments({ 
        doctorId: user.profileRef 
      });

      const today = new Date().toDateString();
      const todayAppts = data.filter(a => 
        new Date(a.appointmentDate).toDateString() === today
      );

      setAppointments(todayAppts);
      setStats({
        todayTotal: todayAppts.length,
        completed: todayAppts.filter(a => a.status === 'completed').length,
        pending: todayAppts.filter(a => a.status === 'scheduled').length,
        totalPatients: new Set(data.map(a => a.patientId)).size
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctor ', error);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      await appointmentAPI.updateAppointment(appointmentId, { status: newStatus });
      fetchDoctorData();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, Dr. {user.lastName}
        </h1>
        <p className="text-gray-600 mt-2">Here's your schedule for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Today's Appointments" value={stats.todayTotal} color="bg-blue-500" />
        <StatCard title="Completed" value={stats.completed} color="bg-green-500" />
        <StatCard title="Pending" value={stats.pending} color="bg-yellow-500" />
        <StatCard title="Total Patients" value={stats.totalPatients} color="bg-purple-500" />
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Today's Appointments</h2>
        
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment._id}
                appointment={appointment}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <p className="text-gray-500 text-sm font-medium">{title}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    <div className={`${color} h-1 rounded-full mt-4`}></div>
  </div>
);

const AppointmentCard = ({ appointment, onStatusUpdate }) => {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">
            {appointment.patientId?.userId?.firstName} {appointment.patientId?.userId?.lastName}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            {appointment.timeSlot.startTime} - {appointment.timeSlot.endTime}
          </p>
          <p className="text-gray-700 mt-2"><strong>Reason:</strong> {appointment.reason}</p>
          {appointment.symptoms && (
            <p className="text-gray-600 text-sm mt-1">
              <strong>Symptoms:</strong> {appointment.symptoms.join(', ')}
            </p>
          )}
        </div>
        <div className="ml-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status]}`}>
            {appointment.status}
          </span>
        </div>
      </div>

      {appointment.status === 'scheduled' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onStatusUpdate(appointment._id, 'in-progress')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Start Consultation
          </button>
          <button
            onClick={() => onStatusUpdate(appointment._id, 'completed')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
