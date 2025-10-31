import React from 'react';

const Loader = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
      {/* Gradient spinner */}
      <div
        className={`relative ${sizeClasses[size]} animate-spin rounded-full`}
      >
        <div className="absolute inset-0 border-4 border-transparent border-t-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
      </div>

      {text && (
        <p className="mt-5 text-slate-600 dark:text-gray-300 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
