// Password-reset email; delegates to the single transport in services/emailService.
const { sendRawEmail } = require('../services/emailService');

const sendEmail = async ({ email, subject, message, html }) => sendRawEmail({ to: email, subject, text: message, html });

module.exports = sendEmail;
