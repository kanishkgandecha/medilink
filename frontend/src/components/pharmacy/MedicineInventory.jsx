import React, { useState } from 'react'
import { Package, AlertTriangle, TrendingDown, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const MedicineInventory = ({ medicines, onRestock, onExpiry }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const categories = [...new Set(medicines.map(m => m.category))]
  const inp = `px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all duration-200 ${darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'}`

  const isExpiringSoon = (expiryDate) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date()
  }

  const getStatus = (medicine) => {
    if (isExpired(medicine.expiryDate)) return 'expired'
    if (isExpiringSoon(medicine.expiryDate)) return 'expiring'
    if (medicine.quantity === 0) return 'out-of-stock'
    if (medicine.quantity <= medicine.reorderLevel) return 'low-stock'
    return 'in-stock'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-stock':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'low-stock':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'out-of-stock':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'expiring':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || medicine.category === filterCategory
    const status = getStatus(medicine)
    const matchesStatus = filterStatus === 'all' || status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
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
            placeholder="Search medicines..."
            className={`w-full pl-10 pr-4 ${inp}`}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={inp}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={inp}
        >
          <option value="all">All Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Medicine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMedicines.map((medicine) => {
          const status = getStatus(medicine)
          return (
            <div
              key={medicine._id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              } hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    status === 'expired' || status === 'out-of-stock'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : status === 'expiring' || status === 'low-stock'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      status === 'expired' || status === 'out-of-stock'
                        ? 'text-red-600'
                        : status === 'expiring' || status === 'low-stock'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {medicine.name}
                    </h4>
                    <p className="text-xs text-gray-500">{medicine.genericName}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                  {status.replace('-', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Manufacturer:</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {medicine.manufacturer}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {medicine.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quantity:</span>
                  <span className={`font-semibold ${
                    medicine.quantity <= medicine.reorderLevel ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {medicine.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price:</span>
                  <span className="font-semibold text-blue-600">${medicine.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiry:</span>
                  <span className={`text-xs ${
                    isExpired(medicine.expiryDate)
                      ? 'text-red-600 font-semibold'
                      : isExpiringSoon(medicine.expiryDate)
                      ? 'text-orange-600 font-semibold'
                      : 'text-gray-600'
                  }`}>
                    {medicine.expiryDate}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                {medicine.quantity <= medicine.reorderLevel && (
                  <button
                    onClick={() => onRestock(medicine._id)}
                    className="flex-1 py-2 bg-[#2E86DE] text-white rounded-xl hover:bg-[#1a6db5] transition-all duration-200 text-sm font-medium shadow-[0_2px_8px_rgba(46,134,222,0.3)]"
                  >
                    Restock
                  </button>
                )}
                {isExpired(medicine.expiryDate) && (
                  <button
                    onClick={() => onExpiry(medicine._id)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
                {isExpiringSoon(medicine.expiryDate) && (
                  <div className="flex-1 flex items-center justify-center space-x-1 text-orange-600 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Expiring Soon</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredMedicines.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No medicines found</p>
        </div>
      )}
    </div>
  )
}

export default MedicineInventory