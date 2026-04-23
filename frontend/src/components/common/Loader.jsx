import React from 'react'
import { Activity } from 'lucide-react'

const Loader = ({ fullScreen = false, text = 'Loading…' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 dark:border-gray-700" />
        {/* Spinning arc */}
        <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
        </div>
      </div>
      {text && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-16">
      {content}
    </div>
  )
}

export default Loader
