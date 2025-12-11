const express = require('express');
const Imap = require('imap-simple');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/fetch-emails', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { email, password, limit = 10 } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  let connection;
  
  try {
    connection = await Imap.connect({
      imap: {
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        connTimeout: 10000,
        tlsOptions: { 
          rejectUnauthorized: false,
          servername: 'imap.gmail.com'
        }
      }
    });
    
    await connection.openBox('INBOX');
    
    const messages = await connection.search(['ALL'], {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: false
    });
    
    const recent = messages.slice(-limit).reverse();
    
    const emails = recent.map(msg => {
      const header = msg.parts.find(p => p.which.includes('HEADER'))?.body || {};
      return {
        id: msg.attributes.uid,
        from: header.from?.[0] || '',
        to: header.to?.[0] || '',
        subject: header.subject?.[0] || '(no subject)',
        date: header.date?.[0] || ''
      };
    });
    
    await connection.end();
    
    return res.json({ success: true, count: emails.length, emails });
    
  } catch (error) {
    if (connection) try { await connection.end(); } catch(e) {}
    return res.json({ success: false, error: error.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { email, password, to, subject, body } = req.body;
  
  if (!email || !password || !to || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password }
    });
    
    const result = await transporter.sendMail({
      from: email,
      to,
      subject,
      text: body || ''
    });
    
    return res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    return res.json({ success: false, error: error.message });
  }
});

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
