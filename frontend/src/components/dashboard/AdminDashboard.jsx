import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// SVG Icons
const IconWrapper = ({ children, gradient }) => (
  <div className={`w-14 h-14 bg-linear-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
    {children}
  </div>
);

const UsersIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const DoctorIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const PatientIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const CalendarIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const AlertIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const BedIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const DeviceIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const ChartIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const ArrowRightIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 245,
    totalDoctors: 45,
    totalPatients: 180,
    totalAppointments: 523,
    todayAppointments: 28,
    lowStockItems: 7,
    availableBeds: 42,
    activeDevices: 156
  });
  const [loading, setLoading] = useState(false);

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: UsersIcon, gradient: "from-blue-500 to-cyan-500" },
    { title: "Doctors", value: stats.totalDoctors, icon: DoctorIcon, gradient: "from-emerald-500 to-teal-500" },
    { title: "Patients", value: stats.totalPatients, icon: PatientIcon, gradient: "from-purple-500 to-pink-500" },
    { title: "Today's Appointments", value: stats.todayAppointments, icon: CalendarIcon, gradient: "from-orange-500 to-amber-500" },
    { title: "Low Stock Items", value: stats.lowStockItems, icon: AlertIcon, gradient: "from-red-500 to-rose-500" },
    { title: "Available Beds", value: stats.availableBeds, icon: BedIcon, gradient: "from-teal-500 to-cyan-500" },
    { title: "Active IoT Devices", value: stats.activeDevices, icon: DeviceIcon, gradient: "from-indigo-500 to-purple-500" },
    { title: "Total Appointments", value: stats.totalAppointments, icon: ChartIcon, gradient: "from-pink-500 to-rose-500" },
  ];

  const quickActions = [
    { title: "User Management", desc: "Create and manage users, doctors, and staff", link: "/admin/users", icon: UsersIcon, gradient: "from-blue-500 to-cyan-500" },
    { title: "Inventory Control", desc: "Monitor and update medicine inventory", link: "/admin/inventory", icon: AlertIcon, gradient: "from-emerald-500 to-teal-500" },
    { title: "Ward Management", desc: "Allocate and manage hospital wards", link: "/admin/wards", icon: BedIcon, gradient: "from-purple-500 to-pink-500" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-700">
      <motion.div 
        initial={{ opacity: 0, y: 40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="p-8 max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-12 flex items-center gap-4">
          <div className="w-14 h-14 bg-linear-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ChartIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-gray-400 mt-1">Welcome back! Here's your hospital overview.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 dark:text-gray-400">{stat.title}</p>
                  <p className="text-4xl font-bold bbg-linear-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">{stat.value}</p>
                </div>
                <IconWrapper gradient={stat.gradient}>
                  <stat.icon className="w-6 h-6 text-white" />
                </IconWrapper>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-200 mb-6 flex items-center gap-3">
            Quick Actions
            <div className="h-1 w-20 bg-linear-to-br from-teal-500 to-cyan-500 rounded-full"></div>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {quickActions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl text-left transition-all"
              >
                <div className={`absolute inset-0 bg-linear-to-br ${action.gradient} opacity-0 hover:opacity-10 transition-opacity duration-500`}></div>
                <div className="relative">
                  <IconWrapper gradient={action.gradient}>
                    <action.icon className="w-7 h-7 text-white" />
                  </IconWrapper>
                  <h3 className="mt-5 text-xl font-bold text-slate-800 dark:text-gray-200">{action.title}</h3>
                  <p className="text-slate-600 dark:text-gray-400 my-3">{action.desc}</p>
                  <div className="flex items-center gap-2 text-teal-600 font-semibold">
                    <span>Access Now</span>
                    <ArrowRightIcon className="w-5 h-5" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-200 mb-6 flex items-center gap-3">
            Recent Activity
            <div className="h-1 w-20 bg-linear-to-br from-purple-500 to-pink-500 rounded-full"></div>
          </h2>
          <div className="space-y-4">
            {[
              { text: "New patient registered: John Doe", time: "2 minutes ago", color: "from-blue-500 to-cyan-500" },
              { text: "Dr. Smith completed 5 appointments", time: "15 minutes ago", color: "from-emerald-500 to-teal-500" },
              { text: "Low stock alert: Paracetamol", time: "1 hour ago", color: "from-red-500 to-rose-500" },
              { text: "New appointment scheduled", time: "2 hours ago", color: "from-purple-500 to-pink-500" }
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition">
                <div className={`w-2 h-2 bg-linear-to-br ${activity.color} rounded-full`}></div>
                <div>
                  <p className="text-slate-700 dark:text-gray-300 font-medium">{activity.text}</p>
                  <p className="text-slate-500 dark:text-gray-400 text-sm">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
