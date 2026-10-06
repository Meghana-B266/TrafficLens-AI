const twilio = require('twilio');
const nodemailer = require('nodemailer');

// Initialize Twilio client (only if credentials are provided)
let twilioClient = null;
const hasTwilioCreds =
  typeof process.env.TWILIO_ACCOUNT_SID === 'string' &&
  process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
  typeof process.env.TWILIO_AUTH_TOKEN === 'string' &&
  process.env.TWILIO_AUTH_TOKEN.length > 0;

if (hasTwilioCreds) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    // If initialization fails, keep it disabled to avoid crashing server
    console.warn('⚠️ Twilio initialization failed, disabling SMS notifications:', e.message);
    twilioClient = null;
  }
} else {
  if (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Invalid Twilio credentials detected. SMS will be logged only.');
  }
}

// Initialize email transporter (only if credentials are provided)
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Send SMS notification
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise} - Twilio response
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      console.log(`📱 SMS would be sent to ${phoneNumber}: ${message}`);
      return { success: true, messageId: 'mock-sms-id' };
    }

    // Format phone number (add country code if not present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully to ${phoneNumber}:`, response.sid);
    return response;
  } catch (error) {
    console.error(`❌ SMS sending failed to ${phoneNumber}:`, error.message);
    throw error;
  }
};

/**
 * Send email notification
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise} - Nodemailer response
 */
const sendEmail = async (email, subject, text, html = null) => {
  try {
    if (!emailTransporter) {
      console.log(`📧 Email would be sent to ${email}: ${subject}`);
      return { success: true, messageId: 'mock-email-id' };
    }

    const mailOptions = {
      from: `${process.env.APP_NAME} <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: text,
      html: html || text
    };

    const response = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}:`, response.messageId);
    return response;
  } catch (error) {
    console.error(`❌ Email sending failed to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Send push notification (placeholder for Firebase implementation)
 * @param {string} deviceToken - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise}
 */
const sendPushNotification = async (deviceToken, title, body, data = {}) => {
  try {
    // TODO: Implement Firebase Cloud Messaging
    console.log(`📱 Push notification would be sent to ${deviceToken}:`, { title, body, data });
    
    // Placeholder implementation
    return { success: true, messageId: 'placeholder' };
  } catch (error) {
    console.error(`❌ Push notification failed:`, error.message);
    throw error;
  }
};

/**
 * Send notification to user based on their preferences
 * @param {object} user - User object with notification preferences
 * @param {string} type - Notification type (verification, report_update, reward, etc.)
 * @param {object} data - Notification data
 * @returns {Promise}
 */
const sendNotificationToUser = async (user, type, data) => {
  const notifications = [];
  
  try {
    // Prepare notification content based on type
    let smsMessage, emailSubject, emailContent, pushTitle, pushBody;
    
    switch (type) {
      case 'verification':
        smsMessage = `Your CACHE verification code is: ${data.token}. Valid for 10 minutes.`;
        emailSubject = 'CACHE - Phone Verification';
        emailContent = `Your verification code is: ${data.token}`;
        pushTitle = 'Verification Code';
        pushBody = 'Your verification code has been sent';
        break;
        
      case 'report_submitted':
        smsMessage = `Your violation report #${data.reportId} has been submitted successfully.`;
        emailSubject = 'CACHE - Report Submitted';
        emailContent = `Your violation report has been submitted and is under review.`;
        pushTitle = 'Report Submitted';
        pushBody = 'Your violation report is under review';
        break;
        
      case 'report_verified':
        smsMessage = `Great! Your report #${data.reportId} has been verified. Challan issued for ₹${data.fineAmount}.`;
        emailSubject = 'CACHE - Report Verified';
        emailContent = `Your report has been verified and a challan has been issued.`;
        pushTitle = 'Report Verified';
        pushBody = `Challan issued for ₹${data.fineAmount}`;
        break;
        
      case 'reward_credited':
        smsMessage = `Congratulations! ₹${data.amount} reward has been credited to your account.`;
        emailSubject = 'CACHE - Reward Credited';
        emailContent = `Your reward of ₹${data.amount} has been credited to your account.`;
        pushTitle = 'Reward Credited';
        pushBody = `₹${data.amount} credited to your account`;
        break;
        
      default:
        smsMessage = data.message || 'You have a new notification from CACHE';
        emailSubject = data.subject || 'CACHE Notification';
        emailContent = data.message || 'You have a new notification';
        pushTitle = data.title || 'CACHE';
        pushBody = data.message || 'New notification';
    }
    
    // Send SMS if enabled
    if (user.notifications.sms && user.phone) {
      notifications.push(sendSMS(user.phone, smsMessage));
    }
    
    // Send email if enabled
    if (user.notifications.email && user.email) {
      notifications.push(sendEmail(user.email, emailSubject, emailContent));
    }
    
    // Send push notification if enabled
    if (user.notifications.push && data.deviceToken) {
      notifications.push(sendPushNotification(data.deviceToken, pushTitle, pushBody, data));
    }
    
    // Wait for all notifications to complete
    const results = await Promise.allSettled(notifications);
    
    console.log(`📢 Notifications sent to user ${user._id}:`, results.length);
    return results;
    
  } catch (error) {
    console.error(`❌ Failed to send notifications to user ${user._id}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendSMS,
  sendEmail,
  sendPushNotification,
  sendNotificationToUser
};
