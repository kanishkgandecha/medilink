import React, { useState } from 'react'
import { Calendar, Clock, Users, MapPin } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const DoctorSchedule = ({ doctorId, schedule }) => {
  const { darkMode } = useTheme()
  const [selectedDay, setSelectedDay] = useState('monday')

  const weekDays = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' }
  ]

  const mockSchedule = {
    monday: {
      available: true,
      slots: [
        { time: '09:00 AM - 12:00 PM', location: 'OPD Room 1', patients: 12 },
        { time: '02:00 PM - 05:00 PM', location: 'OPD Room 1', patients: 10 }
      ]
    },
    tuesday: {
      available: true,
      slots: [
        { time: '09:00 AM - 01:00 PM', location: 'OPD Room 2', patients: 15 }
      ]
    },
    wednesday: {
      available: true,
      slots: [
        { time: '09:00 AM - 12:00 PM', location: 'OPD Room 1', patients: 11 },
        { time: '03:00 PM - 06:00 PM', location: 'Surgery Theater', patients: 3 }
      ]
    },
    thursday: {
      available: true,
      slots: [
        { time: '10:00 AM - 02:00 PM', location: 'OPD Room 1', patients: 14 }
      ]
    },
    friday: {
      available: true,
      slots: [
        { time: '09:00 AM - 12:00 PM', location: 'OPD Room 1', patients: 13 }
      ]
    },
    saturday: {
      available: true,
      slots: [
        { time: '09:00 AM - 01:00 PM', location: 'OPD Room 2', patients: 8 }
      ]
    },
    sunday: {
      available: false,
      slots: []
    }
  }

  const currentSchedule = schedule || mockSchedule

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Weekly Schedule
        </h3>
        <p className="text-gray-500 mt-1">View and manage doctor's availability</p>
      </div>

      {/* Week Days Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2">
        {weekDays.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedDay === day.id
                ? 'bg-[#2E86DE] text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Schedule Details */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        {currentSchedule[selectedDay]?.available ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {weekDays.find(d => d.id === selectedDay)?.label}
              </h4>
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium">
                Available
              </span>
            </div>

            <div className="space-y-3">
              {currentSchedule[selectedDay].slots.map((slot, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {slot.time}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">{slot.patients} patients</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{slot.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No schedule available for this day</p>
            <button className="mt-4 px-4 py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200">
              Add Schedule
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <p className="text-sm text-gray-500 mb-1">Total Hours/Week</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>40h</p>
        </div>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <p className="text-sm text-gray-500 mb-1">Patients/Week</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>86</p>
        </div>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <p className="text-sm text-gray-500 mb-1">Available Days</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>6</p>
        </div>
      </div>
    </div>
  )
}

export default DoctorSchedule