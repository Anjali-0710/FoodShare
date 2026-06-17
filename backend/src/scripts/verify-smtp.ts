import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';
import { sendVerificationEmail } from '../services/emailService';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

async function runVerification() {
  console.log('====================================================');
  console.log('         FoodShare AI - SMTP Verification           ');
  console.log('====================================================\n');

  console.log('1. Checking Env configurations:');
  console.log(`- SMTP_HOST: ${SMTP_HOST || 'NOT CONFIGURED'}`);
  console.log(`- SMTP_PORT: ${SMTP_PORT || 'NOT CONFIGURED'}`);
  console.log(`- SMTP_USER: ${SMTP_USER || 'NOT CONFIGURED'}`);
  console.log(`- SMTP_PASS: ${SMTP_PASS ? '********' : 'NOT CONFIGURED'}`);
  console.log(`- SMTP_FROM: ${SMTP_FROM || 'NOT CONFIGURED'}\n`);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('❌ Error: SMTP configuration is incomplete in .env file.');
    console.error('Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS to enable real email delivery.');
    process.exit(1);
  }

  console.log('2. Testing Mail Transporter Connection...');
  const port = Number(SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ Success: Mail transporter connected successfully!\n');
  } catch (error) {
    console.error('❌ Error: Transporter verification failed.', error);
    process.exit(1);
  }

  // Check if a test recipient is provided
  const args = process.argv.slice(2);
  const testRecipient = args[0] || process.env.TEST_RECIPIENT;

  if (testRecipient) {
    console.log(`3. Sending Test Verification Email to: ${testRecipient}...`);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const success = await sendVerificationEmail(testRecipient, otpCode);
    if (success) {
      console.log(`✅ Success: Test email sent successfully to ${testRecipient}!`);
      console.log(`Please check the inbox of ${testRecipient} for code: ${otpCode}`);
    } else {
      console.error(`❌ Error: Failed to send test email to ${testRecipient}.`);
    }
  } else {
    console.log('3. Skipped Test Email: No recipient address provided.');
    console.log('To send a test email, run this script with a recipient address:');
    console.log('npx ts-node src/scripts/verify-smtp.ts your-email@example.com\n');
  }
}

runVerification().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
