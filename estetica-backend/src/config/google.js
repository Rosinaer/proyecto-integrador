import { google } from 'googleapis';


const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;

  
export const DEFAULT_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const CALENDAR_TZ = process.env.GOOGLE_CALENDAR_TZ || 'America/Argentina/Buenos_Aires';


export const googleHabilitado = Boolean(CLIENT_EMAIL && PRIVATE_KEY);

let calendar = null;
if (googleHabilitado) {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  calendar = google.calendar({ version: 'v3', auth });
} else {
  console.warn(
    '⚠️  Google Calendar deshabilitado: faltan GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY. La sincronización quedará en PENDING.'
  );
}

export default calendar;
