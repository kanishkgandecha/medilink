const logger = require('./logger');

let nodemailer;
let transporter = null;

// Try to load nodemailer, but don't fail if it's not available
try {
  nodemailer = require('nodemailer');
  
  // Create transporter only if email credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter
    transporter.verify(function (error, success) {
      if (error) {
        logger.error(`Email transporter verification failed: ${error.message}`);
      } else {
        logger.info('Email server is ready to send messages');
      }
    });
  } else {
    logger.warn('Email credentials not provided. Email functionality will be disabled.');
  }
} catch (error) {
  logger.warn('Nodemailer not available. Email functionality will be disabled.');
}

// Send email function
exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // If no transporter, just log and return
    if (!transporter) {
      logger.info(`[EMAIL DISABLED] Would send email to ${to}: ${subject}`);
      return { messageId: 'email-disabled', info: 'Email service not configured' };
    }

    const mailOptions = {
      from: `Hospital Management System <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email sending error: ${error.message}`);
    // Don't throw error, just log it
    return { error: error.message };
  }
};

module.exports = exports;
