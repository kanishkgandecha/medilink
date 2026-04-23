import React, { createContext, useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as authService from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await authService.verifyToken()
        const userData = response.user || response.data || response
        if (userData && userData.role) {
          setUser(userData)
        } else {
          localStorage.removeItem('token')
          setUser(null)
        }
      }
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials)
      if (response.token) {
        localStorage.setItem('token', response.token)
      } else {
        throw new Error('No token received from server')
      }
      const userData = response.user || response.data || response
      if (!userData || !userData.role) {
        throw new Error('Invalid user data received from server')
      }
      setUser(userData)
      toast.success(`Welcome back, ${userData.name || 'User'}!`)
      navigate('/dashboard')
      return response
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      toast.error(errorMessage)
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      if (response.success === false) {
        throw new Error(response.message || 'Registration failed')
      }
      toast.success('Registration successful! Please login.')
      if (response.token) {
        localStorage.setItem('token', response.token)
        const user = response.user || response.data
        if (user && user.role) {
          setUser(user)
          navigate('/dashboard')
          return response
        }
      }
      navigate('/login')
      return response
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed'
      toast.error(errorMessage)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.info('Logged out successfully')
    navigate('/login')
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}