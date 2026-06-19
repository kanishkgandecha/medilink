const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  } else {
    // Ethereal mock transport for dev/testing — no real emails sent
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'mock@ethereal.email', pass: 'mock' }
    });
  }
  return transporter;
};

const isEmailConfigured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'MediLink Hospital';

const templates = {
  appointmentBooked: ({ patientName, doctorName, department, date, time, appointmentId, type }) => ({
    subject: `Appointment Confirmed — ${HOSPITAL_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:#2E86DE;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">${HOSPITAL_NAME}</h1>
          <p style="color:#bde0ff;margin:4px 0 0;font-size:13px">Appointment Confirmation</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#1e293b">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#475569;line-height:1.6">Your appointment has been successfully booked. Here are the details:</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:140px">Appointment ID</td><td style="padding:8px 0;font-weight:600;color:#1e293b;font-family:monospace">${appointmentId}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Doctor</td><td style="padding:8px 0;font-weight:600;color:#1e293b">Dr. ${doctorName}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Department</td><td style="padding:8px 0;color:#1e293b">${department || 'General'}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Type</td><td style="padding:8px 0;color:#1e293b">${type}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Date</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${date}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Time</td><td style="padding:8px 0;font-weight:600;color:#2E86DE">${time}</td></tr>
            </table>
          </div>
          <p style="color:#64748b;font-size:13px">Please arrive 10 minutes before your scheduled time. Bring any relevant medical records.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">This is an automated message from ${HOSPITAL_NAME}. Please do not reply to this email.</p>
        </div>
      </div>`
  }),

  appointmentConfirmed: ({ patientName, doctorName, date, time, appointmentId }) => ({
    subject: `Appointment Confirmed by Doctor — ${HOSPITAL_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:#10b981;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">${HOSPITAL_NAME}</h1>
          <p style="color:#d1fae5;margin:4px 0 0;font-size:13px">Appointment Confirmed</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#1e293b">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#475569;line-height:1.6">Great news — Dr. <strong>${doctorName}</strong> has confirmed your appointment.</p>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px;margin:20px 0">
            <p style="margin:0;font-weight:600;color:#065f46">${date} at ${time}</p>
            <p style="margin:4px 0 0;color:#047857;font-size:13px">Appointment ID: ${appointmentId}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">This is an automated message from ${HOSPITAL_NAME}.</p>
        </div>
      </div>`
  }),

  appointmentRescheduled: ({ patientName, doctorName, newDate, newTime, appointmentId }) => ({
    subject: `Appointment Rescheduled — ${HOSPITAL_NAME}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden">
        <div style="background:#f59e0b;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">${HOSPITAL_NAME}</h1>
          <p style="color:#fef3c7;margin:4px 0 0;font-size:13px">Appointment Rescheduled</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#1e293b">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#475569;line-height:1.6">Your appointment with Dr. <strong>${doctorName}</strong> has been rescheduled to a new time.</p>
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin:20px 0">
            <p style="margin:0;font-weight:600;color:#92400e">New Date: ${newDate}</p>
            <p style="margin:4px 0 0;font-weight:600;color:#92400e">New Time: ${newTime}</p>
            <p style="margin:4px 0 0;color:#b45309;font-size:13px">Appointment ID: ${appointmentId}</p>
          </div>
          <p style="color:#64748b;font-size:13px">If this change doesn't work for you, please contact us to reschedule again.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">This is an automated message from ${HOSPITAL_NAME}.</p>
        </div>
      </div>`
  })
};

const sendEmail = async (to, templateName, data) => {
  if (!to) return { success: false, reason: 'no_email' };

  const template = templates[templateName];
  if (!template) return { success: false, reason: 'unknown_template' };

  const { subject, html } = template(data);

  try {
    if (!isEmailConfigured()) {
      console.log(`[Email MOCK] To: ${to} | Subject: ${subject}`);
      return { success: true, mock: true };
    }

    await getTransporter().sendMail({
      from: `"${HOSPITAL_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return { success: true };
  } catch (err) {
    console.error('[Email Error]', err.message);
    return { success: false, reason: err.message };
  }
};

module.exports = { sendEmail, isEmailConfigured };
