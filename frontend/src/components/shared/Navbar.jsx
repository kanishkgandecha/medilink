import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-md border-b border-white/20 sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-2xl font-bold bg-linear-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent hover:scale-105 transition-transform"
          >
            🏥 <span>Hospital MS</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <span className="text-gray-800 font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-linear-to-r from-blue-500 to-teal-500 text-white shadow-md">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-linear-to-r from-red-500 to-rose-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-px"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-700 hover:text-blue-600 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg animate-fade-in-down">
          <div className="flex flex-col items-center space-y-4 py-4">
            <span className="text-gray-800 font-semibold">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="px-3 py-1 bg-linear-to-r from-blue-500 to-teal-500 text-white rounded-full text-sm font-semibold">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="px-5 py-2 bg-linear-to-r from-red-500 to-rose-600 text-white font-medium rounded-lg shadow hover:shadow-lg transition-all duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
