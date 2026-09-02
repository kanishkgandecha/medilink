import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'

const AccessDenied = () => {
  const location = useLocation()
  const requestedPath = location.state?.from?.pathname

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/60 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <ShieldX size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Your account does not have permission to open this page.
          {requestedPath ? ` Requested page: ${requestedPath}` : ''}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={16} /> Go back
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Home size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
