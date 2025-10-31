import React, { useState, useEffect } from 'react';
import { appointmentAPI, inventoryAPI, wardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    lowStockItems: 0,
    availableBeds: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      const [appointments, inventory, wards] = await Promise.all([
        appointmentAPI.getAllAppointments(),
        inventoryAPI.getLowStock(),
        wardAPI.getAllWards(),
      ]);

      const today = new Date().toDateString();
      const todayAppts = appointments.data.filter(a =>
        new Date(a.appointmentDate).toDateString() === today
      );

      const availableBeds = wards.data.reduce((sum, w) => sum + w.availableBeds, 0);

      setStats({
        todayAppointments: todayAppts.length,
        lowStockItems: inventory.data.length,
        availableBeds,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching staff ', error);
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
        <p className="text-gray-600 mt-2">Staff Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Today's Appointments" value={stats.todayAppointments} color="bg-blue-500" />
        <StatCard title="Low Stock Items" value={stats.lowStockItems} color="bg-red-500" />
        <StatCard title="Available Beds" value={stats.availableBeds} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionCard
          title="Manage Appointments"
          description="View and update patient appointments"
          link="/staff/appointments"
          icon="📅"
        />
        <QuickActionCard
          title="Inventory Management"
          description="Check and update medicine inventory"
          link="/staff/inventory"
          icon="💊"
        />
        <QuickActionCard
          title="Ward Management"
          description="Manage patient ward allocations"
          link="/staff/wards"
          icon="🏥"
        />
        <QuickActionCard
          title="Patient Records"
          description="Access patient information"
          link="/staff/patients"
          icon="📋"
        />
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

const QuickActionCard = ({ title, description, link, icon }) => (
  <a
    href={link}
    className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow cursor-pointer"
  >
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </a>
);

export default StaffDashboard;
