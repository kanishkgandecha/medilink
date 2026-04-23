import api from './api'

export const getAllPatients = async (params) => {
  try {
    return await api.get('/patients', { params })
  } catch (error) {
    console.error('Error fetching patients:', error)
    throw error
  }
}

export const getBillingStats = async (params) => {
  try {
    return await api.get('/billing/stats', { params })
  } catch (error) {
    console.error('Error fetching billing stats:', error)
    throw error
  }
}

export const getAllBills = async (params) => {
  try {
    return await api.get('/billing', { params })
  } catch (error) {
    console.error('Error fetching bills:', error)
    throw error
  }
}

export const getBillById = async (id) => {
  try {
    return await api.get(`/billing/${id}`)
  } catch (error) {
    console.error('Error fetching bill:', error)
    throw error
  }
}

export const createBill = async (data) => {
  try {
    return await api.post('/billing', data)
  } catch (error) {
    console.error('Error creating bill:', error.response?.data || error.message)
    throw error
  }
}

// Patient self-pay: pays full outstanding balance
export const patientPayBill = async (id, paymentMethod) => {
  try {
    return await api.post(`/billing/${id}/pay`, { paymentMethod })
  } catch (error) {
    console.error('Error paying bill:', error.response?.data || error.message)
    throw error
  }
}

export const recordPayment = async (id, data) => {
  try {
    return await api.post(`/billing/${id}/payment`, data)
  } catch (error) {
    console.error('Error recording payment:', error)
    throw error
  }
}

export const processInsuranceClaim = async (id, data) => {
  try {
    return await api.post(`/billing/${id}/insurance`, data)
  } catch (error) {
    console.error('Error processing insurance claim:', error)
    throw error
  }
}

export const updateInsuranceClaim = async (id, data) => {
  try {
    return await api.put(`/billing/${id}/insurance`, data)
  } catch (error) {
    console.error('Error updating insurance claim:', error)
    throw error
  }
}

export const deleteBill = async (id) => {
  try {
    return await api.delete(`/billing/${id}`)
  } catch (error) {
    console.error('Error deleting bill:', error)
    throw error
  }
}
