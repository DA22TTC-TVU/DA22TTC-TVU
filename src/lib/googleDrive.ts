import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
    keyFile: '/drive.json', // Thay đường dẫn credentials của bạn
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

export const drive = google.drive({ version: 'v3', auth }); 