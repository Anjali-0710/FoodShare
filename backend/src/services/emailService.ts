import nodemailer from 'nodemailer';

// Configure SMTP transport configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"FoodShare AI" <no-reply@foodshareai.com>';

/**
 * Gets a Nodemailer Transporter.
 * If credentials are not supplied, creates a fallback test transporter using Ethereal Email.
 */
const getTransporter = async () => {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // Use SSL/TLS for port 465
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  // Fallback testing SMTP account (Ethereal Email)
  console.info('[FoodShare Email] SMTP configurations missing in .env. Creating Ethereal testing account...');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Sends a premium 6-digit OTP verification email to the user.
 * @param toEmail Recipient email address
 * @param otpCode 6-digit OTP code
 */
export const sendVerificationEmail = async (toEmail: string, otpCode: string): Promise<boolean> => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: SMTP_FROM,
      to: toEmail,
      subject: 'Verify Your Email Address - FoodShare AI',
      text: `Welcome to FoodShare AI! Your 6-digit email verification code is: ${otpCode}. This code is valid for 5 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #F8FAFC;
              color: #1E293B;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #FFFFFF;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              border: 1px solid #E2E8F0;
            }
            .header {
              background-color: #2E7D32;
              padding: 32px;
              text-align: center;
            }
            .header h1 {
              color: #FFFFFF;
              font-size: 24px;
              margin: 0;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px;
              text-align: center;
            }
            .content p {
              font-size: 15px;
              line-height: 24px;
              color: #475569;
              margin-top: 0;
            }
            .otp-box {
              background-color: #F0FDF4;
              border: 2px dashed #2E7D32;
              color: #2E7D32;
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 6px;
              padding: 18px;
              margin: 30px auto;
              width: 200px;
              border-radius: 12px;
              text-align: center;
            }
            .warning-text {
              font-size: 12px;
              color: #94A3B8;
              margin-top: 24px;
            }
            .footer {
              background-color: #F8FAFC;
              padding: 24px;
              text-align: center;
              border-top: 1px solid #E2E8F0;
              font-size: 12px;
              color: #64748B;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FoodShare AI</h1>
            </div>
            <div class="content">
              <p>Welcome to FoodShare AI! To complete your registration and log in, please enter the 6-digit verification code below:</p>
              <div class="otp-box">${otpCode}</div>
              <p>This code is secure and will expire in <strong>5 minutes</strong>.</p>
              <p class="warning-text">If you did not request this, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
              FoodShare AI &copy; 2026 · Connect. Share. Reduce Waste.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.info(`[FoodShare Email] Verification email successfully sent to: ${toEmail}. Message ID: ${info.messageId}`);

    // If using Ethereal Email, log the testing mailbox preview URL
    if (nodemailer.getTestMessageUrl(info)) {
      console.info(`[FoodShare Email] Test mailbox preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return true;
  } catch (error) {
    console.error(`[FoodShare Email] Failed to send verification email to: ${toEmail}`, error);
    return false;
  }
};
