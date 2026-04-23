import React, { useState, useEffect } from 'react'
import { Bed, Users, Activity, AlertTriangle, Plus, Edit, Trash2, UserPlus, UserMinus, BarChart3 } from 'lucide-react'
import StatCard from '../components/common/StatCard'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/common/Modal'
import api from '../services/api'
import { toast } from 'react-toastify'

const Wards = () => {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const canManage = ['Admin', 'Doctor', 'Nurse', 'Ward Manager'].includes(user?.role) ||
                    ['Admin', 'Doctor', 'Nurse', 'Ward Manager'].includes(user?.subRole)
  const [wards, setWards] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedWard, setSelectedWard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAddWardModal, setShowAddWardModal] = useState(false)
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [wardFormData, setWardFormData] = useState({
    wardNumber: '',
    wardName: '',
    wardType: 'General',
    department: '',
    floor: 1,
    totalBeds: 10,
    gender: 'Mixed',
    facilities: [],
    dailyRate: 0
  })
  const [allocateFormData, setAllocateFormData] = useState({
    patientId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    expectedDischargeDate: ''
  })
  const [releaseFormData, setReleaseFormData] = useState({
    bedNumber: ''
  })

  useEffect(() => {
    fetchWards()
    fetchPatients()
  }, [])

  const fetchWards = async () => {
    setLoading(true)
    try {
      const response = await api.get('/wards')
      setWards(response.data || [])
    } catch (error) {
      console.error('Fetch wards error:', error)
      toast.error('Failed to fetch wards')
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients')
      setPatients(response.data || response.patients || [])
    } catch (error) {
      console.error('Fetch patients error:', error)
    }
  }

  const handleCreateWard = async () => {
    try {
      if (!wardFormData.wardNumber || !wardFormData.wardName || !wardFormData.dailyRate) {
        toast.error('Please fill in all required fields')
        return
      }

      if (selectedWard) {
        await api.put(`/wards/${selectedWard._id}`, wardFormData)
        toast.success('Ward updated successfully')
      } else {
        await api.post('/wards', wardFormData)
        toast.success('Ward created successfully')
      }
      
      setShowAddWardModal(false)
      resetWardForm()
      fetchWards()
    } catch (error) {
      console.error('Ward operation error:', error)
      toast.error(error.response?.data?.message || 'Operation failed')
    }
  }

  const handleDeleteWard = async (wardId) => {
    if (window.confirm('Are you sure you want to delete this ward?')) {
      try {
        await api.delete(`/wards/${wardId}`)
        toast.success('Ward deleted successfully')
        fetchWards()
      } catch (error) {
        console.error('Delete error:', error)
        toast.error(error.response?.data?.message || 'Failed to delete ward')
      }
    }
  }

  const handleAllocateBed = async () => {
    try {
      if (!allocateFormData.patientId || !allocateFormData.admissionDate) {
        toast.error('Please fill in all required fields')
        return
      }

      await api.post(`/wards/${selectedWard._id}/allocate`, allocateFormData)
      toast.success('Bed allocated successfully')
      setShowAllocateModal(false)
      setAllocateFormData({
        patientId: '',
        admissionDate: new Date().toISOString().split('T')[0],
        expectedDischargeDate: ''
      })
      fetchWards()
    } catch (error) {
      console.error('Allocate bed error:', error)
      toast.error(error.response?.data?.message || 'Failed to allocate bed')
    }
  }

  const handleReleaseBed = async () => {
    try {
      if (!releaseFormData.bedNumber) {
        toast.error('Please select a bed to release')
        return
      }

      await api.post(`/wards/${selectedWard._id}/release`, releaseFormData)
      toast.success('Bed released successfully')
      setShowReleaseModal(false)
      setReleaseFormData({ bedNumber: '' })
      fetchWards()
    } catch (error) {
      console.error('Release bed error:', error)
      toast.error(error.response?.data?.message || 'Failed to release bed')
    }
  }

  const resetWardForm = () => {
    setWardFormData({
      wardNumber: '',
      wardName: '',
      wardType: 'General',
      department: '',
      floor: 1,
      totalBeds: 10,
      gender: 'Mixed',
      facilities: [],
      dailyRate: 0
    })
    setSelectedWard(null)
  }

  const openEditWard = (ward) => {
    setSelectedWard(ward)
    setWardFormData({
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      wardType: ward.wardType,
      department: ward.department || '',
      floor: ward.floor || 1,
      totalBeds: ward.totalBeds,
      gender: ward.gender,
      facilities: ward.facilities || [],
      dailyRate: ward.dailyRate
    })
    setShowAddWardModal(true)
  }

  const totalBeds = wards.reduce((acc, ward) => acc + ward.totalBeds, 0)
  const occupiedBeds = wards.reduce((acc, ward) => acc + (ward.totalBeds - ward.availableBeds), 0)
  const availableBeds = wards.reduce((acc, ward) => acc + ward.availableBeds, 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Ward & Bed Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Monitor ward status and bed occupancy in real-time</p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetWardForm(); setShowAddWardModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Ward
          </button>
        )}
      </div>

      {/* Ward Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Beds" value={totalBeds} icon={Bed} color="from-blue-600 to-cyan-500" />
        <StatCard title="Occupied Beds" value={occupiedBeds} icon={Users} color="from-red-500 to-rose-500" />
        <StatCard title="Available Beds" value={availableBeds} icon={Activity} color="from-emerald-600 to-teal-500" />
        <StatCard title="Occupancy Rate" value={`${occupancyRate}%`} icon={BarChart3} color="from-violet-600 to-purple-500" />
      </div>

      {/* Ward Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {wards.map((ward) => (
          <div
            key={ward._id}
            className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 hover:shadow-lg transition`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {ward.wardName}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                ward.availableBeds > 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {ward.availableBeds} Available
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {ward.wardType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Department:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {ward.department || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Floor:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {ward.floor ? `${ward.floor}${ward.floor === 1 ? 'st' : ward.floor === 2 ? 'nd' : ward.floor === 3 ? 'rd' : 'th'} Floor` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Occupancy:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {ward.totalBeds - ward.availableBeds}/{ward.totalBeds}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Rate:</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  ₹{ward.dailyRate}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all"
                  style={{ width: `${((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100}%` }}
                ></div>
              </div>
            </div>

            {canManage && (
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedWard(ward)
                    setShowAllocateModal(true)
                  }}
                  disabled={ward.availableBeds === 0}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Allocate</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedWard(ward)
                    setShowReleaseModal(true)
                  }}
                  disabled={ward.availableBeds === ward.totalBeds}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>Release</span>
                </button>
                <button
                  onClick={() => openEditWard(ward)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteWard(ward._id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bed Status Grid */}
      {wards.length > 0 && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Bed Status Overview
            </h2>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-500">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-500">Occupied</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {wards.map((ward) => (
              <div key={ward._id}>
                <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {ward.wardName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {ward.beds?.map((bed) => (
                    <div
                      key={bed._id}
                      className={`p-3 rounded-lg border text-center ${
                        bed.isOccupied
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                          : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <Bed className={`w-5 h-5 ${
                          bed.isOccupied ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>
                      <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {bed.bedNumber}
                      </p>
                      <p className={`text-xs mt-1 ${
                        bed.isOccupied ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {bed.isOccupied ? 'Occupied' : 'Available'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Ward Modal */}
      <Modal
        isOpen={showAddWardModal}
        onClose={() => {
          setShowAddWardModal(false)
          resetWardForm()
        }}
        title={selectedWard ? 'Edit Ward' : 'Add New Ward'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Ward Number *
              </label>
              <input
                type="text"
                value={wardFormData.wardNumber}
                onChange={(e) => setWardFormData({ ...wardFormData, wardNumber: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="e.g., W101"
                disabled={selectedWard}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Ward Name *
              </label>
              <input
                type="text"
                value={wardFormData.wardName}
                onChange={(e) => setWardFormData({ ...wardFormData, wardName: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="e.g., General Ward A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Ward Type *
              </label>
              <select
                value={wardFormData.wardType}
                onChange={(e) => setWardFormData({ ...wardFormData, wardType: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="General">General</option>
                <option value="ICU">ICU</option>
                <option value="NICU">NICU</option>
                <option value="Private">Private</option>
                <option value="Semi-Private">Semi-Private</option>
                <option value="Emergency">Emergency</option>
                <option value="Isolation">Isolation</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Gender
              </label>
              <select
                value={wardFormData.gender}
                onChange={(e) => setWardFormData({ ...wardFormData, gender: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Department
              </label>
              <input
                type="text"
                value={wardFormData.department}
                onChange={(e) => setWardFormData({ ...wardFormData, department: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="e.g., Cardiology"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Floor
              </label>
              <input
                type="number"
                value={wardFormData.floor}
                onChange={(e) => setWardFormData({ ...wardFormData, floor: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                min="1"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Total Beds *
              </label>
              <input
                type="number"
                value={wardFormData.totalBeds}
                onChange={(e) => setWardFormData({ ...wardFormData, totalBeds: parseInt(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                min="1"
                disabled={selectedWard}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Daily Rate (₹) *
            </label>
            <input
              type="number"
              value={wardFormData.dailyRate}
              onChange={(e) => setWardFormData({ ...wardFormData, dailyRate: parseFloat(e.target.value) })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowAddWardModal(false); resetWardForm() }}
              className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWard}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200"
            >
              {selectedWard ? 'Update' : 'Create'} Ward
            </button>
          </div>
        </div>
      </Modal>

      {/* Allocate Bed Modal */}
      <Modal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        title={`Allocate Bed - ${selectedWard?.wardName || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Patient *
            </label>
            <select
              value={allocateFormData.patientId}
              onChange={(e) => setAllocateFormData({ ...allocateFormData, patientId: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a patient...</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.patientId} - {patient.userId?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Admission Date *
            </label>
            <input
              type="date"
              value={allocateFormData.admissionDate}
              onChange={(e) => setAllocateFormData({ ...allocateFormData, admissionDate: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Expected Discharge Date
            </label>
            <input
              type="date"
              value={allocateFormData.expectedDischargeDate}
              onChange={(e) => setAllocateFormData({ ...allocateFormData, expectedDischargeDate: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowAllocateModal(false)}
              className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleAllocateBed}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-sm hover:shadow-md hover:shadow-emerald-500/25 active:scale-[0.97] transition-all duration-200"
            >
              Allocate Bed
            </button>
          </div>
        </div>
      </Modal>

      {/* Release Bed Modal */}
      <Modal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        title={`Release Bed - ${selectedWard?.wardName || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Bed to Release *
            </label>
            <select
              value={releaseFormData.bedNumber}
              onChange={(e) => setReleaseFormData({ bedNumber: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select an occupied bed...</option>
              {selectedWard?.beds?.filter(bed => bed.isOccupied).map(bed => (
                <option key={bed._id} value={bed.bedNumber}>
                  {bed.bedNumber} - {bed.patient?.patientId || 'Patient'}
                </option>
              ))}
            </select>
          </div>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border`}>
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              <strong>Note:</strong> Releasing this bed will update the patient's discharge date and make the bed available for new admissions.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowReleaseModal(false)}
              className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleReleaseBed}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 shadow-sm hover:shadow-md hover:shadow-orange-500/25 active:scale-[0.97] transition-all duration-200"
            >
              Release Bed
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Wards