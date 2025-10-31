const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

class AIScheduler {
  // Predict appointment duration based on type and patient history
  static async predictDuration(appointmentData) {
    const { type, patientId, doctorId } = appointmentData;
    
    // Base durations by appointment type
    const baseDurations = {
      consultation: 30,
      'follow-up': 20,
      surgery: 120,
      emergency: 45
    };

    let duration = baseDurations[type] || 30;

    // Adjust based on patient history
    const pastAppointments = await Appointment.find({
      patientId,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(5);

    if (pastAppointments.length > 0) {
      const avgDuration = pastAppointments.reduce((sum, apt) => {
        const start = new Date(apt.appointmentDate);
        const end = new Date(apt.updatedAt);
        return sum + (end - start) / (1000 * 60);
      }, 0) / pastAppointments.length;

      duration = Math.round((duration + avgDuration) / 2);
    }

    return duration;
  }

  // Calculate priority score for appointment
  static async calculatePriority(appointmentData) {
    const { type, symptoms, patientId } = appointmentData;
    
    let priority = 3; // Default medium priority

    // High priority keywords
    const urgentKeywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 
                           'unconscious', 'stroke', 'heart attack'];
    
    if (type === 'emergency') {
      priority = 5;
    } else if (symptoms && symptoms.some(s => 
      urgentKeywords.some(k => s.toLowerCase().includes(k))
    )) {
      priority = 4;
    }

    // Check patient medical history
    const patient = await Patient.findById(patientId);
    if (patient && patient.medicalHistory) {
      const chronicConditions = patient.medicalHistory.filter(h => h.status === 'chronic');
      if (chronicConditions.length > 2) {
        priority = Math.min(5, priority + 1);
      }
    }

    return priority;
  }

  // Find optimal time slot for appointment
  static async findOptimalSlot(doctorId, preferredDate, duration) {
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor || !doctor.availability) {
      return null;
    }

    const date = new Date(preferredDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    const dayAvailability = doctor.availability.find(a => a.day === dayName);
    
    if (!dayAvailability) {
      return null;
    }

    // Get existing appointments for that day
    const existingAppointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      },
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    });

    // Find available slots
    for (const slot of dayAvailability.timeSlots) {
      const slotStart = this.parseTime(slot.startTime);
      const slotEnd = this.parseTime(slot.endTime);
      
      let currentTime = slotStart;
      
      while (currentTime + duration <= slotEnd) {
        const isAvailable = !existingAppointments.some(apt => {
          const aptStart = this.getTimeInMinutes(apt.timeSlot.startTime);
          const aptEnd = this.getTimeInMinutes(apt.timeSlot.endTime);
          return (currentTime < aptEnd && currentTime + duration > aptStart);
        });

        if (isAvailable) {
          return {
            startTime: this.formatTime(currentTime),
            endTime: this.formatTime(currentTime + duration)
          };
        }

        currentTime += 15; // Check every 15 minutes
      }
    }

    return null;
  }

  // Predict no-show probability using ML patterns
  static async predictNoShow(patientId, appointmentDate) {
    const patient = await Patient.findById(patientId);
    const pastAppointments = await Appointment.find({
      patientId,
      createdAt: { $lt: appointmentDate }
    });

    if (pastAppointments.length === 0) {
      return 0.15; // Default 15% for new patients
    }

    const noShowCount = pastAppointments.filter(a => a.status === 'no-show').length;
    const totalAppointments = pastAppointments.length;
    
    let probability = noShowCount / totalAppointments;

    // Adjust based on advance booking time
    const daysAdvance = (new Date(appointmentDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysAdvance > 30) {
      probability += 0.1;
    }

    // Adjust based on appointment day (weekends have higher no-show)
    const dayOfWeek = new Date(appointmentDate).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      probability += 0.05;
    }

    return Math.min(probability, 0.9);
  }

  // Optimize doctor schedule for a day
  static async optimizeSchedule(doctorId, date) {
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('patientId');

    // Sort by priority and predicted duration
    const optimized = appointments.sort((a, b) => {
      if (a.aiPriority !== b.aiPriority) {
        return b.aiPriority - a.aiPriority;
      }
      return a.aiPredictedDuration - b.aiPredictedDuration;
    });

    return optimized;
  }

  // Helper methods
  static parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static getTimeInMinutes(timeStr) {
    return this.parseTime(timeStr);
  }

  static formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

module.exports = AIScheduler;
