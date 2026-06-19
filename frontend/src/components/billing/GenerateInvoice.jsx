import React, { useState } from 'react'
import { Plus, Trash2, User, Calendar } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { toast } from 'react-toastify'

const GenerateInvoice = ({ patients, onGenerate, onCancel }) => {
  const { darkMode } = useTheme()
  const [formData, setFormData] = useState({
    patientId: '',
    date: new Date().toISOString().split('T')[0],
    services: [],
    notes: ''
  })

  const inp = `w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`
  const inpSm = `w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const [newService, setNewService] = useState({
    description: '',
    quantity: 1,
    rate: 0
  })

  const serviceTemplates = [
    { name: 'Consultation', rate: 100 },
    { name: 'Blood Test', rate: 50 },
    { name: 'X-Ray', rate: 150 },
    { name: 'ECG', rate: 75 },
    { name: 'Ultrasound', rate: 200 },
    { name: 'MRI Scan', rate: 500 },
    { name: 'CT Scan', rate: 400 },
    { name: 'Room Charges (Per Day)', rate: 200 },
    { name: 'Surgery', rate: 2000 },
    { name: 'Medicines', rate: 0 }
  ]

  const addService = () => {
    if (!newService.description || newService.rate <= 0) {
      toast.error('Please enter service details')
      return
    }

    setFormData({
      ...formData,
      services: [...formData.services, { ...newService, amount: newService.quantity * newService.rate }]
    })

    setNewService({ description: '', quantity: 1, rate: 0 })
  }

  const removeService = (index) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index)
    })
  }

  const getTotalAmount = () => {
    return formData.services.reduce((total, service) => total + service.amount, 0)
  }

  const handleGenerate = () => {
    if (!formData.patientId) {
      toast.error('Please select a patient')
      return
    }
    if (formData.services.length === 0) {
      toast.error('Please add at least one service')
      return
    }

    const invoiceData = {
      ...formData,
      totalAmount: getTotalAmount(),
      tax: 0,
      finalAmount: getTotalAmount()
    }

    onGenerate(invoiceData)
    toast.success('Invoice generated successfully')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Generate Invoice
        </h2>
        <p className="text-gray-500 mt-1">Create a new billing invoice</p>
      </div>

      {/* Patient Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>
            <User className="w-4 h-4 inline mr-2" />
            Select Patient *
          </label>
          <select
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            className={inp}
          >
            <option value="">Select Patient</option>
            {patients && patients.map((patient) => (
              <option key={patient._id} value={patient._id}>
                {patient.name} - {patient.patientId}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={lbl}>
            <Calendar className="w-4 h-4 inline mr-2" />
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={inp}
          />
        </div>
      </div>

      {/* Add Service */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Add Service/Item
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="block text-xs text-gray-500 mb-1">Service Description</label>
            <select
              value={newService.description}
              onChange={(e) => {
                const template = serviceTemplates.find(t => t.name === e.target.value)
                setNewService({
                  ...newService,
                  description: e.target.value,
                  rate: template ? template.rate : 0
                })
              }}
              className={inpSm}
            >
              <option value="">Select or enter service</option>
              {serviceTemplates.map((template) => (
                <option key={template.name} value={template.name}>{template.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={newService.quantity}
              onChange={(e) => setNewService({ ...newService, quantity: parseInt(e.target.value) || 1 })}
              className={inpSm}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Rate ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newService.rate}
              onChange={(e) => setNewService({ ...newService, rate: parseFloat(e.target.value) || 0 })}
              className={inpSm}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={addService}
              className="w-full py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-sm flex items-center justify-center space-x-1 shadow-[0_2px_8px_rgba(46,134,222,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Services/Items ({formData.services.length})
        </h3>
        {formData.services.length === 0 ? (
          <div className={`p-8 text-center rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className="text-gray-500">No services added yet</p>
          </div>
        ) : (
          <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {formData.services.map((service, index) => (
                  <tr key={index} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm">{service.description}</td>
                    <td className="px-4 py-3 text-sm text-center">{service.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">${service.rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">${service.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total */}
      {formData.services.length > 0 && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Subtotal:</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              ${getTotalAmount().toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Tax (0%):</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              $0.00
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">
              ${getTotalAmount().toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={lbl}>
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={inp}
          rows="3"
          placeholder="Any additional notes or comments..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className={`px-6 py-2 rounded-lg border ${
            darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
          } transition`}
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
        >
          Generate Invoice
        </button>
      </div>
    </div>
  )
}

export default GenerateInvoice