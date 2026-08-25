/**
 * Compute virtual helper fields for Appointment entity
 */
const formatAppointment = (appointment) => {
  if (!appointment) return appointment;

  const formattedDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const startTime = appointment.startTime || (appointment.timeSlot && appointment.timeSlot.startTime) || '';
  const endTime = appointment.endTime || (appointment.timeSlot && appointment.timeSlot.endTime) || '';
  const formattedTime = startTime && endTime ? `${startTime} - ${endTime}` : '';

  return {
    ...appointment,
    timeSlot: { startTime, endTime },
    formattedDate,
    formattedTime,
  };
};

/**
 * Compute virtual helper fields for Medicine entity
 */
const formatMedicine = (medicine) => {
  if (!medicine) return medicine;

  let stockStatus = 'In Stock';
  const stock = medicine.stockQuantity ?? 0;
  const reorder = medicine.reorderLevel ?? 50;

  if (stock === 0) {
    stockStatus = 'Out of Stock';
  } else if (stock <= reorder * 0.3) {
    stockStatus = 'Critical';
  } else if (stock <= reorder) {
    stockStatus = 'Low Stock';
  }

  let expiryStatus = 'Valid';
  if (medicine.expiryDate) {
    const now = new Date();
    const expiry = new Date(medicine.expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) expiryStatus = 'Expired';
    else if (diffDays <= 30) expiryStatus = 'Expiring Soon';
    else if (diffDays <= 90) expiryStatus = 'Expiring in 3 Months';
  }

  return {
    ...medicine,
    stockStatus,
    expiryStatus,
  };
};

module.exports = {
  formatAppointment,
  formatMedicine,
};
