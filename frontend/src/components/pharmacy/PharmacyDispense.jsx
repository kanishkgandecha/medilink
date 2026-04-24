import React, { useState } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { toast } from 'react-toastify'

const PharmacyDispense = ({ medicines, onDispense }) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    patientId: '',
    prescriptionId: ''
  })

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.genericName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addToCart = (medicine) => {
    const existing = cart.find(item => item._id === medicine._id)
    if (existing) {
      setCart(cart.map(item =>
        item._id === medicine._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...medicine, quantity: 1 }])
    }
    toast.success(`${medicine.name} added to cart`)
  }

  const updateQuantity = (id, change) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const newQuantity = item.quantity + change
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id))
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleDispense = () => {
    if (!patientInfo.name || !patientInfo.patientId) {
      toast.error('Please enter patient information')
      return
    }
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    const dispenseData = {
      ...patientInfo,
      medicines: cart,
      totalAmount: getTotalAmount(),
      date: new Date().toISOString()
    }

    onDispense(dispenseData)
    setCart([])
    setPatientInfo({ name: '', patientId: '', prescriptionId: '' })
    toast.success('Medicines dispensed successfully')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Medicine Selection */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicines..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            } focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredMedicines.map((medicine) => (
            <div
              key={medicine._id}
              className={`p-3 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              } hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {medicine.name}
                  </h4>
                  <p className="text-xs text-gray-500">{medicine.genericName}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  ₹{medicine.unitPrice ?? medicine.price ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Stock: {medicine.quantity}</span>
                <span>{medicine.category}</span>
              </div>
              <button
                onClick={() => addToCart(medicine)}
                disabled={medicine.quantity === 0}
                className={`w-full py-1.5 rounded text-xs font-medium transition ${
                  medicine.quantity === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="space-y-4">
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Cart ({cart.length})
          </h3>

          {/* Patient Info */}
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={patientInfo.name}
              onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
              placeholder="Patient Name *"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            <input
              type="text"
              value={patientInfo.patientId}
              onChange={(e) => setPatientInfo({ ...patientInfo, patientId: e.target.value })}
              placeholder="Patient ID *"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
            <input
              type="text"
              value={patientInfo.prescriptionId}
              onChange={(e) => setPatientInfo({ ...patientInfo, prescriptionId: e.target.value })}
              placeholder="Prescription ID (Optional)"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Cart Items */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item._id}
                  className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">₹{item.unitPrice ?? item.price ?? 0} each</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                        className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                        className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      ₹{((item.unitPrice ?? item.price ?? 0) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total & Checkout */}
          {cart.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Subtotal:</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    ₹{getTotalAmount().toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Tax (0%):</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    ₹0.00
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDispense}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-medium"
              >
                Dispense Medicines
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PharmacyDispense