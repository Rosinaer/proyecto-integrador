import nodemailer from 'nodemailer';
import axios from 'axios';

const useAlternativeMailer = process.env.ALTERNATIVE_MAILER === 'true';
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

const nombreRemitente = (from) => {
  const match = typeof from === 'string' && from.match(/"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : 'Espacio Senda';
};
 
const brevoTransporter = {  
  async sendMail({ from, to, subject, html }) {
    try {
      await axios.post(
        brevoApiUrl,
        {
          sender: { name: nombreRemitente(from), email: process.env.EMAIL_USER },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      return { accepted: [to] };
    } catch (error) {
      const detalle = error.response?.data?.message || error.message;
      throw new Error(`Brevo: ${detalle}`);
    }
  },
};

const nodemailerTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const transporter = useAlternativeMailer ? brevoTransporter : nodemailerTransporter;

console.log(`Mailer configurado para usar: ${useAlternativeMailer ? 'Brevo' : 'Nodemailer'}`);

export default transporter;