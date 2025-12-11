const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verify API key
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { 
    email, 
    password, 
    host, 
    port,
    to, 
    subject, 
    body, 
    htmlBody,
    replyTo,
    inReplyTo,
    references
  } = req.body;
  
  if (!email || !password || !to || !subject) {
    return res.status(400).json({ 
      error: 'Required fields: email, password, to, subject' 
    });
  }
  
  const transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port || 587,
    secure: false,
    auth: {
      user: email,
      pass: password
    }
  });
  
  try {
    const mailOptions = {
      from: email,
      to: to,
      subject: subject,
      text: body || '',
      html: htmlBody || undefined,
      replyTo: replyTo || undefined,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    return res.status(200).json({
      success: true,
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('SMTP error:', error.message);
    
    let userMessage = error.message;
    if (error.message.includes('Invalid login')) {
      userMessage = 'Invalid email or app password.';
    }
    
    return res.status(500).json({
      success: false,
      error: userMessage
    });
  }
};
