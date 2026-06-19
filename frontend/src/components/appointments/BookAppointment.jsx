import React, { useState } from 'react'
import { Calendar, Clock, User, FileText } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { toast } from 'react-toastify'

const BookAppointment = ({ onSubmit, onCancel, doctors, patients }) => {
  const { darkMode } = useTheme()
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    type: '',
    reason: '',
    notes: ''
  })

  const [availableSlots, setAvailableSlots] = useState([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ])

  const appointmentTypes = [
    'Consultation',
    'Follow-up',
    'Check-up',
    'Surgery',
    'Emergency',
    'Vaccination'
  ]

  const inp = `w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.patientId || !formData.doctorId || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields')
      return
    }
    onSubmit(formData)
    toast.success('Appointment booked successfully')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Book New Appointment
        </h2>
        <p className="text-gray-500 mt-1">Schedule an appointment for a patient</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div>
          <label className={lbl}>
            <User className="w-4 h-4 inline mr-2" />
            Patient *
          </label>
          <select
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            className={inp}
            required
          >
            <option value="">Select Patient</option>
            {patients && patients.map((patient) => (
              <option key={patient._id} value={patient._id}>
                {patient.name} - {patient.patientId}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor Selection */}
        <div>
          <label className={lbl}>
            <User className="w-4 h-4 inline mr-2" />
            Doctor *
          </label>
          <select
            name="doctorId"
            value={formData.doctorId}
            onChange={handleChange}
            className={inp}
            required
          >
            <option value="">Select Doctor</option>
            {doctors && doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name} - {doctor.specialization}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div>
          <label className={lbl}>
            <Calendar className="w-4 h-4 inline mr-2" />
            Date *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={inp}
            required
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className={lbl}>
            <Clock className="w-4 h-4 inline mr-2" />
            Time *
          </label>
          <select
            name="time"
            value={formData.time}
            onChange={handleChange}
            className={inp}
            required
          >
            <option value="">Select Time</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        {/* Appointment Type */}
        <div className="md:col-span-2">
          <label className={lbl}>
            <FileText className="w-4 h-4 inline mr-2" />
            Appointment Type *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={inp}
            required
          >
            <option value="">Select Type</option>
            {appointmentTypes.map((type) => (
              <option key={type} value={type.toLowerCase()}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div className="md:col-span-2">
          <label className={lbl}>
            Reason for Visit
          </label>
          <input
            type="text"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            className={inp}
            placeholder="Brief description of the visit reason"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className={lbl}>
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className={inp}
            rows="3"
            placeholder="Any additional information..."
          />
        </div>
      </div>

      {/* Available Time Slots Display */}
      {formData.date && formData.doctorId && (
        <div>
          <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Available Time Slots
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  formData.time === slot
                    ? 'bg-[#2E86DE] text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className={`px-6 py-2 rounded-lg border ${
            darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
          } transition`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
        >
          Book Appointment
        </button>
      </div>
    </div>
  )
}

export default BookAppointment