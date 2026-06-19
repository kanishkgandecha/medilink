import React, { useState } from 'react'
import { DollarSign, FileText, Download, Eye, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const BillingList = ({ bills, onViewInvoice, onDownloadInvoice }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'unpaid':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.billId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.patient.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || bill.status.toLowerCase() === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill ID or patient name..."
            className={`w-full pl-10 pr-4 ${inp}`}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={inp}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {/* Bills List */}
      <div className="space-y-3">
        {filteredBills.map((bill) => (
          <div
            key={bill._id}
            className={`p-4 rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            } hover:shadow-md transition`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {bill.billId}
                  </p>
                  <p className="text-sm text-gray-500">{bill.patient} • {bill.patientId}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                {bill.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
              <div>
                <p className="text-gray-500">Date:</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {bill.date}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total Amount:</p>
                <p className="font-semibold text-blue-600">${bill.totalAmount}</p>
              </div>
              <div>
                <p className="text-gray-500">Paid:</p>
                <p className="font-semibold text-green-600">${bill.paidAmount}</p>
              </div>
              <div>
                <p className="text-gray-500">Balance:</p>
                <p className={`font-semibold ${bill.balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  ${bill.balance}
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Services:</p>
              <div className="flex flex-wrap gap-1">
                {bill.services.slice(0, 3).map((service, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded text-xs ${
                      darkMode ? 'bg-gray-750 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {service}
                  </span>
                ))}
                {bill.services.length > 3 && (
                  <span className="text-xs text-blue-600">+{bill.services.length - 3} more</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onViewInvoice(bill)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-sm shadow-[0_2px_8px_rgba(46,134,222,0.3)]"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button
                onClick={() => onDownloadInvoice(bill)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border ${
                  darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                } transition text-sm`}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              {bill.balance > 0 && (
                <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                  Pay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No bills found</p>
        </div>
      )}
    </div>
  )
}

export default BillingList