import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, AlertTriangle, Package, TrendingDown, Filter, PackagePlus, PackageMinus, X, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import CardPagination, { paginateData, CARDS_PER_PAGE } from '../components/common/CardPagination'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import StatCard from '../components/common/StatCard'
import PageLayout from '../components/common/PageLayout'
import api from '../services/api'
import { toast } from 'react-toastify'

const getStockStatus = (medicine) => {
  if (medicine.stockQuantity === 0) return 'Out of Stock'
  if (medicine.stockQuantity <= medicine.reorderLevel * 0.3) return 'Critical'
  if (medicine.stockQuantity <= medicine.reorderLevel) return 'Low Stock'
  return 'In Stock'
}

const getExpiryStatus = (expiryDateRaw) => {
  if (!expiryDateRaw) return 'unknown'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneMonthLater = new Date(today)
  oneMonthLater.setDate(today.getDate() + 30)
  const expiryDate = new Date(expiryDateRaw)
  expiryDate.setHours(0, 0, 0, 0)
  if (expiryDate < today) return 'expired'
  if (expiryDate <= oneMonthLater) return 'soon'
  return 'ok'
}

const STOCK_BADGE = {
  'In Stock':    'bg-green-100 text-green-700',
  'Low Stock':   'bg-yellow-100 text-yellow-700',
  'Critical':    'bg-red-100 text-red-700',
  'Out of Stock':'bg-gray-100 text-gray-600'
}

const MedicineCard = ({ med, onStockUpdate, onEdit, onDelete, darkMode }) => {
  const stockStatus  = getStockStatus(med)
  const expiryStatus = getExpiryStatus(med.expiryDate)
  const stockPct     = med.reorderLevel > 0 ? Math.min(100, Math.round((med.stockQuantity / (med.reorderLevel * 2)) * 100)) : 100
  const dateStr      = med.expiryDate
    ? new Date(med.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const barColor = stockStatus === 'In Stock'    ? 'bg-emerald-500'
                 : stockStatus === 'Low Stock'   ? 'bg-yellow-500'
                 : stockStatus === 'Critical'    ? 'bg-red-500'
                 : 'bg-gray-400'

  const card = darkMode
    ? 'bg-gray-800/90 border-gray-700/60 hover:border-[#2E86DE]/40'
    : 'bg-white/85 border-gray-100 hover:border-[#2E86DE]/20 hover:shadow-[0_4px_16px_rgba(46,134,222,0.10)]'

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 ${card}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-tight truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{med.name}</p>
          <p className="text-xs text-gray-400 truncate">{med.genericName}</p>
          {med.medicineId && <p className="text-[11px] font-mono text-gray-400 mt-0.5">{med.medicineId}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${STOCK_BADGE[stockStatus] || 'bg-gray-100 text-gray-600'}`}>
          {stockStatus}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {med.category && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
            {med.category}
          </span>
        )}
        {med.dosageForm && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {med.dosageForm}
          </span>
        )}
        {med.prescriptionRequired && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">Rx</span>
        )}
        {expiryStatus === 'expired' && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Expired</span>
        )}
        {expiryStatus === 'soon' && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">Expiring Soon</span>
        )}
      </div>

      {/* Stock bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Stock Level</span>
          <span className={`text-xs font-bold tabular-nums ${darkMode ? 'text-white' : 'text-gray-800'}`}>{med.stockQuantity} units</span>
        </div>
        <div className={`h-1.5 rounded-full w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${stockPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">Reorder at {med.reorderLevel} units</p>
      </div>

      {/* Info row */}
      <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Unit Price</p>
          <p className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{med.unitPrice?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Expiry</p>
          <p className={`text-xs font-semibold mt-0.5 ${
            expiryStatus === 'expired' ? 'text-red-500' : expiryStatus === 'soon' ? 'text-orange-500' : darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>{dateStr}</p>
        </div>
        {med.manufacturer && (
          <div className="col-span-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Manufacturer</p>
            <p className={`text-xs font-semibold mt-0.5 truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{med.manufacturer}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onStockUpdate(med)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.25)] transition-all duration-150"
        >
          <PackagePlus className="w-3.5 h-3.5" /> Stock
        </button>
        <button
          onClick={() => onEdit(med)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold bg-[#2E86DE] text-white hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.25)] transition-all duration-150"
        >
          <Edit className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={() => onDelete(med._id)}
          className={`p-1.5 rounded-xl border transition-all duration-150 ${darkMode ? 'border-red-800/60 text-red-400 hover:bg-red-900/30' : 'border-red-100 text-red-500 hover:bg-red-50'}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const Pharmacy = () => {
  const { darkMode } = useTheme()
  const [medicines, setMedicines]         = useState([])
  const [loading, setLoading]             = useState(false)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [stats, setStats]                 = useState({ totalMedicines: 0, lowStock: 0, expiringSoon: 0, outOfStock: 0 })
  const [search, setSearch]               = useState('')
  const [stockFilter, setStockFilter]     = useState('all')
  const [page, setPage]                   = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formData, setFormData]           = useState({
    name: '', genericName: '', manufacturer: '', category: '', dosageForm: 'Tablet',
    strength: '', unitPrice: '', stockQuantity: '', reorderLevel: '', expiryDate: '',
    batchNumber: '', prescriptionRequired: true, storageConditions: '',
    supplier: { name: '', contact: '', email: '' }
  })
  const [stockData, setStockData] = useState({ quantity: '', operation: 'add', batchNumber: '', expiryDate: '' })

  useEffect(() => { fetchMedicines(); fetchStats() }, [])

  const fetchMedicines = async () => {
    setLoading(true)
    try {
      const res = await api.get('/medicines')
      setMedicines(res.data || [])
    } catch {
      toast.error('Failed to fetch medicines')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/medicines/stats')
      setStats(res.data || {})
    } catch {}
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.genericName || !formData.manufacturer ||
        !formData.category || !formData.unitPrice || !formData.expiryDate) {
      toast.error('Please fill in all required fields'); return
    }
    const payload = {
      ...formData,
      unitPrice:     parseFloat(formData.unitPrice),
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      reorderLevel:  parseInt(formData.reorderLevel) || 50
    }
    try {
      if (selectedMedicine) {
        await api.put(`/medicines/${selectedMedicine._id}`, payload)
        toast.success('Medicine updated successfully')
      } else {
        await api.post('/medicines', payload)
        toast.success('Medicine added successfully')
      }
      setShowAddModal(false)
      resetForm()
      fetchMedicines()
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleStockUpdate = async () => {
    if (!stockData.quantity || stockData.quantity <= 0) { toast.error('Please enter a valid quantity'); return }
    const payload = { quantity: parseInt(stockData.quantity), operation: stockData.operation }
    if (stockData.operation === 'add') {
      if (stockData.batchNumber) payload.batchNumber = stockData.batchNumber
      if (stockData.expiryDate)  payload.expiryDate  = stockData.expiryDate
    }
    try {
      await api.put(`/medicines/${selectedMedicine._id}/stock`, payload)
      toast.success('Stock updated successfully')
      setShowStockModal(false)
      setStockData({ quantity: '', operation: 'add', batchNumber: '', expiryDate: '' })
      fetchMedicines()
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/medicines/${id}`)
      toast.success('Medicine deleted successfully')
      fetchMedicines()
      fetchStats()
    } catch {
      toast.error('Failed to delete medicine')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', genericName: '', manufacturer: '', category: '', dosageForm: 'Tablet',
      strength: '', unitPrice: '', stockQuantity: '', reorderLevel: '', expiryDate: '',
      batchNumber: '', prescriptionRequired: true, storageConditions: '',
      supplier: { name: '', contact: '', email: '' }
    })
    setSelectedMedicine(null)
  }

  const openEdit = (med) => {
    setSelectedMedicine(med)
    setFormData({
      name:                 med.name,
      genericName:          med.genericName,
      manufacturer:         med.manufacturer,
      category:             med.category,
      dosageForm:           med.dosageForm || 'Tablet',
      strength:             med.strength || '',
      unitPrice:            med.unitPrice,
      stockQuantity:        med.stockQuantity,
      reorderLevel:         med.reorderLevel,
      expiryDate:           med.expiryDate ? new Date(med.expiryDate).toISOString().split('T')[0] : '',
      batchNumber:          med.batchNumber || '',
      prescriptionRequired: med.prescriptionRequired !== undefined ? med.prescriptionRequired : true,
      storageConditions:    med.storageConditions || '',
      supplier:             med.supplier || { name: '', contact: '', email: '' }
    })
    setShowAddModal(true)
  }

  const openStockModal = (med) => {
    setSelectedMedicine(med)
    setStockData({ quantity: '', operation: 'add', batchNumber: med.batchNumber || '', expiryDate: med.expiryDate ? new Date(med.expiryDate).toISOString().split('T')[0] : '' })
    setShowStockModal(true)
  }

  const setFilterAndReset = (val) => { setStockFilter(val); setPage(1) }

  const urgentCount = useMemo(() => ({
    expired:  medicines.filter(m => getExpiryStatus(m.expiryDate) === 'expired').length,
    outStock: medicines.filter(m => getStockStatus(m) === 'Out of Stock').length,
    critical: medicines.filter(m => getStockStatus(m) === 'Critical').length,
  }), [medicines])

  const filteredMedicines = useMemo(() => {
    let list = medicines
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.medicineId?.toLowerCase().includes(q)
      )
    }
    if (stockFilter !== 'all') {
      list = list.filter(med => {
        const ss = getStockStatus(med)
        const es = getExpiryStatus(med.expiryDate)
        if (stockFilter === 'in-stock')  return ss === 'In Stock'
        if (stockFilter === 'low-stock') return ss === 'Low Stock'
        if (stockFilter === 'critical')  return ss === 'Critical'
        if (stockFilter === 'out-stock') return ss === 'Out of Stock'
        if (stockFilter === 'expiring')  return es === 'soon'
        if (stockFilter === 'expired')   return es === 'expired'
        return true
      })
    }
    return list
  }, [medicines, search, stockFilter])

  const pageMeds = paginateData(filteredMedicines, page)

  const inp = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE] transition-all ${
    darkMode ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
  }`
  const lbl = `block text-xs font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`

  const leftPanel = (
    <div className="space-y-3">
      <StatCard title="Total Medicines" value={stats.totalMedicines || 0} icon={Package}       iconBg="bg-blue-50 text-[#2E86DE]"
        onClick={() => setFilterAndReset('all')} />
      <StatCard title="Low Stock"       value={stats.lowStock || 0}       icon={TrendingDown}  iconBg="bg-amber-50 text-amber-600"
        onClick={() => setFilterAndReset(stockFilter === 'low-stock' ? 'all' : 'low-stock')} />
      <StatCard title="Expiring Soon"   value={stats.expiringSoon || 0}   icon={AlertTriangle} iconBg="bg-orange-50 text-orange-600"
        onClick={() => setFilterAndReset(stockFilter === 'expiring' ? 'all' : 'expiring')} />
      <StatCard title="Out of Stock"    value={stats.outOfStock || 0}     icon={PackageMinus}  iconBg="bg-red-50 text-red-600"
        onClick={() => setFilterAndReset(stockFilter === 'out-stock' ? 'all' : 'out-stock')} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pharmacy Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage medicines and inventory</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E86DE] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6db5] shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Medicine
        </button>
      </div>

      <PageLayout leftPanel={leftPanel}>

      {/* Alert banner */}
      {(urgentCount.expired > 0 || urgentCount.outStock > 0 || urgentCount.critical > 0) && (
        <div className={`flex flex-wrap gap-2 p-3 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800/60' : 'bg-red-50 border-red-200'}`}>
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span className={`text-sm font-semibold flex-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Action required:</span>
          {urgentCount.expired > 0 && (
            <button onClick={() => setFilterAndReset('expired')} className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold hover:bg-red-200 transition">
              {urgentCount.expired} expired
            </button>
          )}
          {urgentCount.outStock > 0 && (
            <button onClick={() => setFilterAndReset('out-stock')} className="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 transition">
              {urgentCount.outStock} out of stock
            </button>
          )}
          {urgentCount.critical > 0 && (
            <button onClick={() => setFilterAndReset('critical')} className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-semibold hover:bg-orange-200 transition">
              {urgentCount.critical} critical stock
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className={`flex flex-wrap gap-2 items-center p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-sm'}`}>
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm min-w-[160px]
          ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search medicines…"
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-400"
          />
        </div>
        {[
          { key: 'all',       label: 'All' },
          { key: 'in-stock',  label: 'In Stock' },
          { key: 'low-stock', label: 'Low Stock' },
          { key: 'critical',  label: 'Critical' },
          { key: 'out-stock', label: 'Out of Stock' },
          { key: 'expiring',  label: 'Expiring Soon' },
          { key: 'expired',   label: 'Expired' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterAndReset(key)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
              stockFilter === key
                ? 'bg-[#2E86DE] text-white shadow-sm'
                : darkMode
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
            {key !== 'all' && (() => {
              const count = {
                'in-stock':  medicines.filter(m => getStockStatus(m) === 'In Stock').length,
                'low-stock': medicines.filter(m => getStockStatus(m) === 'Low Stock').length,
                'critical':  medicines.filter(m => getStockStatus(m) === 'Critical').length,
                'out-stock': medicines.filter(m => getStockStatus(m) === 'Out of Stock').length,
                'expiring':  medicines.filter(m => getExpiryStatus(m.expiryDate) === 'soon').length,
                'expired':   medicines.filter(m => getExpiryStatus(m.expiryDate) === 'expired').length,
              }[key]
              return count > 0 ? <span className="ml-1 opacity-70">({count})</span> : null
            })()}
          </button>
        ))}
        {(search || stockFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterAndReset('all') }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className={`ml-auto text-xs tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {filteredMedicines.length} of {medicines.length}
        </span>
      </div>

      {/* Card Grid */}
      {filteredMedicines.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100'}`}>
          <Package className="w-12 h-12 text-gray-300 mb-3" />
          <p className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No medicines found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pageMeds.map(med => (
            <MedicineCard
              key={med._id}
              med={med}
              onStockUpdate={openStockModal}
              onEdit={openEdit}
              onDelete={id => setConfirmDelete(id)}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}

      <CardPagination
        total={filteredMedicines.length}
        page={page}
        onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      />

      </PageLayout>

      {/* Add/Edit Medicine Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'} size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Medicine Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inp} placeholder="Paracetamol 500mg" />
            </div>
            <div>
              <label className={lbl}>Generic Name *</label>
              <input type="text" value={formData.genericName} onChange={e => setFormData({ ...formData, genericName: e.target.value })} className={inp} placeholder="Acetaminophen" />
            </div>
            <div>
              <label className={lbl}>Manufacturer *</label>
              <input type="text" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} className={inp} placeholder="PharmaCorp" />
            </div>
            <div>
              <label className={lbl}>Category *</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inp}>
                <option value="">Select Category</option>
                {['Analgesic','Antibiotic','Anti-inflammatory','Antidiabetic','Antihypertensive','Antihistamine','Cardiovascular','Gastrointestinal','Respiratory','Neurological','Dermatological','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Dosage Form</label>
              <select value={formData.dosageForm} onChange={e => setFormData({ ...formData, dosageForm: e.target.value })} className={inp}>
                {['Tablet','Capsule','Syrup','Injection','Cream','Ointment','Drops','Inhaler','Other'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Strength</label>
              <input type="text" value={formData.strength} onChange={e => setFormData({ ...formData, strength: e.target.value })} className={inp} placeholder="500mg" />
            </div>
            <div>
              <label className={lbl}>Unit Price (₹) *</label>
              <input type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} className={inp} placeholder="5.50" />
            </div>
            <div>
              <label className={lbl}>Stock Quantity</label>
              <input type="number" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} className={inp} placeholder="500" />
            </div>
            <div>
              <label className={lbl}>Reorder Level</label>
              <input type="number" value={formData.reorderLevel} onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })} className={inp} placeholder="100" />
            </div>
            <div>
              <label className={lbl}>Expiry Date *</label>
              <input type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className={inp} />
            </div>
            <div>
              <label className={lbl}>Batch Number</label>
              <input type="text" value={formData.batchNumber} onChange={e => setFormData({ ...formData, batchNumber: e.target.value })} className={inp} placeholder="BATCH001" />
            </div>
            <div>
              <label className={lbl}>Storage Conditions</label>
              <input type="text" value={formData.storageConditions} onChange={e => setFormData({ ...formData, storageConditions: e.target.value })} className={inp} placeholder="Store in cool, dry place" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="prescriptionRequired" checked={formData.prescriptionRequired} onChange={e => setFormData({ ...formData, prescriptionRequired: e.target.checked })} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <label htmlFor="prescriptionRequired" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Prescription Required</label>
          </div>

          <div className={`border-t pt-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Supplier Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Supplier Name</label>
                <input type="text" value={formData.supplier.name} onChange={e => setFormData({ ...formData, supplier: { ...formData.supplier, name: e.target.value } })} className={inp} placeholder="Supplier Name" />
              </div>
              <div>
                <label className={lbl}>Contact Number</label>
                <input type="tel" value={formData.supplier.contact} onChange={e => setFormData({ ...formData, supplier: { ...formData.supplier, contact: e.target.value } })} className={inp} placeholder="Contact Number" />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={formData.supplier.email} onChange={e => setFormData({ ...formData, supplier: { ...formData.supplier, email: e.target.value } })} className={inp} placeholder="supplier@example.com" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => setShowAddModal(false)} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200">
            {selectedMedicine ? 'Update' : 'Add'} Medicine
          </button>
        </div>
      </Modal>

      {/* Stock Update Modal */}
      <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title={`Update Stock — ${selectedMedicine?.name || ''}`} size="lg">
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current Stock</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedMedicine?.stockQuantity || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Reorder Level</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedMedicine?.reorderLevel || 0}</p>
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>Operation *</label>
            <select value={stockData.operation} onChange={e => setStockData({ ...stockData, operation: e.target.value })} className={inp}>
              <option value="add">Add Stock</option>
              <option value="reduce">Reduce Stock</option>
              <option value="set">Set Stock</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Quantity *</label>
            <input type="number" min="1" value={stockData.quantity} onChange={e => setStockData({ ...stockData, quantity: e.target.value })} className={inp} placeholder="Enter quantity" />
          </div>
          {stockData.operation === 'add' && (
            <>
              <div>
                <label className={lbl}>Batch Number</label>
                <input type="text" value={stockData.batchNumber} onChange={e => setStockData({ ...stockData, batchNumber: e.target.value })} className={inp} placeholder="BATCH001" />
              </div>
              <div>
                <label className={lbl}>Expiry Date</label>
                <input type="date" value={stockData.expiryDate} onChange={e => setStockData({ ...stockData, expiryDate: e.target.value })} className={inp} />
              </div>
            </>
          )}
          {stockData.quantity && (
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
              <p className="text-sm font-medium mb-1">New Stock Level:</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {stockData.operation === 'add'
                  ? (selectedMedicine?.stockQuantity || 0) + parseInt(stockData.quantity || 0)
                  : stockData.operation === 'reduce'
                  ? Math.max(0, (selectedMedicine?.stockQuantity || 0) - parseInt(stockData.quantity || 0))
                  : parseInt(stockData.quantity || 0)
                }
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => setShowStockModal(false)} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={handleStockUpdate} className="px-5 py-2.5 bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(46,134,222,0.35)] transition-all duration-200">Update Stock</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Medicine"
        message="This will permanently remove this medicine from the inventory."
        confirmLabel="Delete"
      />
    </div>
  )
}

export default Pharmacy
