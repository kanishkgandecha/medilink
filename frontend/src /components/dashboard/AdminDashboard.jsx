import React, { useState, useEffect } from 'react';
import { userAPI, appointmentAPI, inventoryAPI, wardAPI, iotAPI } from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    lowStockItems: 0,
    availableBeds: 0,
    activeDevices: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [users, appointments, inventory, wards, devices] = await Promise.all([
        userAPI.getAllUsers(),
        appointmentAPI.getAllAppointments(),
        inventoryAPI.getLowStock(),
        wardAPI.getAllWards(),
        iotAPI.getAllDevices()
      ]);

      const doctors = users.data.filter(u => u.role === 'doctor');
      const patients = users.data.filter(u => u.role === 'patient');
      
      const today = new Date().toDateString();
      const todayAppts = appointments.data.filter(a => 
        new Date(a.appointmentDate).toDateString() === today
      );

      const totalBeds = wards.data.reduce((sum, w) => sum + w.availableBeds, 0);

      setStats({
        totalUsers: users.data.length,
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        totalAppointments: appointments.data.length,
        todayAppointments: todayAppts.length,
        lowStockItems: inventory.data.length,
        availableBeds: totalBeds,
        activeDevices: devices.data.filter(d => d.status === 'active').length
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard ', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your hospital overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="bg-blue-500"
        />
        <StatCard
          title="Doctors"
          value={stats.totalDoctors}
          icon="👨‍⚕️"
          color="bg-green-500"
        />
        <StatCard
          title="Patients"
          value={stats.totalPatients}
          icon="🤒"
          color="bg-purple-500"
        />
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon="📅"
          color="bg-orange-500"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon="⚠️"
          color="bg-red-500"
        />
        <StatCard
          title="Available Beds"
          value={stats.availableBeds}
          icon="🛏️"
          color="bg-teal-500"
        />
        <StatCard
          title="Active IoT Devices"
          value={stats.activeDevices}
          icon="📡"
          color="bg-indigo-500"
        />
        <StatCard
          title="Total Appointments"
          value={stats.totalAppointments}
          icon="📊"
          color="bg-pink-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActionCard
          title="User Management"
          description="Create and manage users, doctors, and staff"
          link="/admin/users"
          icon="👤"
        />
        <QuickActionCard
          title="Inventory Control"
          description="Monitor and update medicine inventory"
          link="/admin/inventory"
          icon="💊"
        />
        <QuickActionCard
          title="Ward Management"
          description="Allocate and manage hospital wards"
          link="/admin/wards"
          icon="🏥"
        />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
      <div className={`${color} rounded-full p-4 text-3xl`}>
        {icon}
      </div>
    </div>
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

export default AdminDashboard;
