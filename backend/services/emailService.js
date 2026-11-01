const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { logSafeError } = require('../utils/redact');

// Single email transport for the whole backend (password reset and
// appointment notifications). Configure either SMTP (EMAIL_HOST, EMAIL_PORT,
// EMAIL_SECURE, EMAIL_USER, EMAIL_PASS) or a nodemailer well-known service
// (EMAIL_SERVICE + EMAIL_USER + EMAIL_PASS). With neither, email is disabled:
// notifications are skipped and password-reset emails are reported as failed.
let transporter = null;
let transporterKey = null;

const transportOptions = () => {
  const auth = process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    : undefined;
  if (process.env.EMAIL_HOST) {
    const port = Number(process.env.EMAIL_PORT) || 587;
    return { host: process.env.EMAIL_HOST, port, secure: process.env.EMAIL_SECURE === 'true' || port === 465, ...(auth ? { auth } : {}) };
  }
  if (auth) return { service: process.env.EMAIL_SERVICE || 'gmail', auth };
  return null;
};

const isEmailConfigured = () => transportOptions() !== null;

const getTransporter = () => {
  const options = transportOptions();
  const key = JSON.stringify(options && { ...options, auth: options.auth ? options.auth.user : undefined });
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport(options);
    transporterKey = key;
  }
  return transporter;
};

const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'MediLink Hospital';
const senderAddress = () => process.env.EMAIL_FROM || `"${HOSPITAL_NAME}" <${process.env.EMAIL_USER || 'no-reply@localhost'}>`;

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
      // Recipient addresses are PII and are not logged.
      logger.info('email_mock_delivery_skipped', { reason: 'email_not_configured' });
      return { success: true, mock: true };
    }

    await getTransporter().sendMail({
      from: senderAddress(),
      to,
      subject,
      html
    });
    return { success: true };
  } catch (err) {
    logSafeError(logger, 'email_delivery_failed', err);
    return { success: false, reason: 'delivery_failed' };
  }
};

// Plain email used by the password-reset flow. Throws when email is not
// configured or delivery fails, so the caller can revoke the reset token.
const sendRawEmail = async ({ to, subject, text, html }) => {
  if (!isEmailConfigured()) {
    throw Object.assign(new Error('Email delivery is not configured'), { code: 'EMAIL_NOT_CONFIGURED' });
  }
  await getTransporter().sendMail({ from: senderAddress(), to, subject, text, html });
};

module.exports = { sendEmail, sendRawEmail, isEmailConfigured };
