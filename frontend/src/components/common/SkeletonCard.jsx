import React from 'react'
import { useTheme } from '../../context/ThemeContext'

const Skel = ({ className }) => (
  <div className={`skeleton rounded-lg ${className}`} />
)

export const SkeletonStatCard = () => {
  const { darkMode } = useTheme()
  return (
    <div className={`border rounded-2xl p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skel className="h-3 w-24" />
          <Skel className="h-8 w-14" />
          <Skel className="h-3 w-28" />
        </div>
        <Skel className="w-12 h-12 !rounded-xl" />
      </div>
    </div>
  )
}

export const SkeletonRow = ({ lines = 3 }) => {
  const { darkMode } = useTheme()
  return (
    <div className={`border rounded-2xl p-6 space-y-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <Skel className="h-5 w-36" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <Skel className="w-10 h-10 !rounded-full" />
            <div className="space-y-2">
              <Skel className="h-3.5 w-28" />
              <Skel className="h-3 w-20" />
            </div>
          </div>
          <Skel className="h-6 w-16 !rounded-full" />
        </div>
      ))}
    </div>
  )
}

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  const { darkMode } = useTheme()
  return (
    <div className={`border rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <Skel className="h-9 w-56 !rounded-xl" />
        <div className="ml-auto">
          <Skel className="h-9 w-28 !rounded-xl" />
        </div>
      </div>
      {/* Header */}
      <div className={`flex gap-4 px-5 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50/80'}`}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skel key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-4 px-5 py-4 border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skel key={j} className={`h-4 flex-1 ${j === 0 ? 'max-w-[120px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skel className="h-7 w-52" />
      <Skel className="h-4 w-72" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SkeletonRow lines={4} />
      <SkeletonRow lines={4} />
    </div>
  </div>
)

export default SkeletonDashboard
