import React, { useState, useEffect } from 'react';
import { appointmentAPI, prescriptionAPI, iotAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      const [apptsRes, presRes] = await Promise.all([
        appointmentAPI.getMyAppointments(),
        prescriptionAPI.getPatientPrescriptions(user.profileRef)
      ]);

      setAppointments(apptsRes.data.slice(0, 5));
      setPrescriptions(presRes.data.filter(p => p.status === 'active'));

      // Fetch IoT readings if patient has device
      try {
        const readingTypes = ['heartRate', 'bloodPressure', 'temperature', 'oxygenLevel'];
        const readings = {};
        
        for (const type of readingTypes) {
          const { data } = await iotAPI.getLatestReading(user.profileRef, type);
          if (data) readings[type] = data;
        }
        
        setLatestReadings(readings);
      } catch (error) {
        console.log('No IoT data available');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching patient ', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">Here's your health overview</p>
      </div>

      {/* IoT Vital Signs */}
      {Object.keys(latestReadings).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Latest Vital Signs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestReadings.heartRate && (
              <VitalCard
                title="Heart Rate"
                value={`${latestReadings.heartRate.value} bpm`}
                isNormal={!latestReadings.heartRate.isAbnormal}
              />
            )}
            {latestReadings.bloodPressure && (
              <VitalCard
                title="Blood Pressure"
                value={`${latestReadings.bloodPressure.value.systolic}/${latestReadings.bloodPressure.value.diastolic}`}
                isNormal={!latestReadings.bloodPressure.isAbnormal}
              />
            )}
            {latestReadings.temperature && (
              <VitalCard
                title="Temperature"
                value={`${latestReadings.temperature.value}°C`}
                isNormal={!latestReadings.temperature.isAbnormal}
              />
            )}
            {latestReadings.oxygenLevel && (
              <VitalCard
                title="Oxygen Level"
                value={`${latestReadings.oxygenLevel.value}%`}
                isNormal={!latestReadings.oxygenLevel.isAbnormal}
              />
            )}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">📅 Upcoming Appointments</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Book New
          </button>
        </div>
        
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <AppointmentRow key={apt._id} appointment={apt} />
            ))}
          </div>
        )}
      </div>

      {/* Active Prescriptions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">💊 Active Prescriptions</h2>
        
        {prescriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active prescriptions</p>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <PrescriptionCard key={prescription._id} prescription={prescription} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const VitalCard = ({ title, value, isNormal }) => (
  <div className={`p-4 rounded-lg ${isNormal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
    <p className="text-sm text-gray-600 font-medium">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    <p className={`text-xs mt-2 ${isNormal ? 'text-green-600' : 'text-red-600'}`}>
      {isNormal ? '✓ Normal' : '⚠ Abnormal'}
    </p>
  </div>
);

const AppointmentRow = ({ appointment }) => (
  <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
    <div>
      <p className="font-semibold text-gray-900">
        Dr. {appointment.doctorId?.userId?.lastName}
      </p>
      <p className="text-sm text-gray-600">
        {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.timeSlot.startTime}
      </p>
    </div>
    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
      {appointment.status}
    </span>
  </div>
);

const PrescriptionCard = ({ prescription }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="font-semibold text-gray-900">
          Dr. {prescription.doctorId?.userId?.lastName}
        </p>
        <p className="text-sm text-gray-600">
          {new Date(prescription.createdAt).toLocaleDateString()}
        </p>
      </div>
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
        Active
      </span>
    </div>
    <p className="text-gray-700 mb-2"><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
    <div className="mt-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Medications:</p>
      <ul className="space-y-1">
        {prescription.medications.map((med, index) => (
          <li key={index} className="text-sm text-gray-600">
            • {med.medicationName} - {med.dosage} ({med.frequency})
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default PatientDashboard;
