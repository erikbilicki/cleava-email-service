const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');

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
  // const apiKey = req.headers.authorization?.replace('Bearer ', '');
  // if (apiKey !== process.env.API_KEY) {
  //  return res.status(401).json({ error: 'Unauthorized' });
 // }
  
  const { email, password, host, port, folder, limit, since } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const config = {
    imap: {
      user: email,
      password: password,
      host: host || 'imap.gmail.com',
      port: port || 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }
    }
  };
  
  let connection;
  
  try {
    connection = await Imap.connect(config);
    await connection.openBox(folder || 'INBOX');
    
    // Build search criteria
    let searchCriteria = ['ALL'];
    if (since) {
      searchCriteria = [['SINCE', new Date(since)]];
    }
    
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
      struct: true
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    // Sort by date descending and limit
    const sortedMessages = messages
      .sort((a, b) => {
        const dateA = new Date(a.attributes.date);
        const dateB = new Date(b.attributes.date);
        return dateB - dateA;
      })
      .slice(0, limit || 50);
    
    const emails = [];
    
    for (const message of sortedMessages) {
      try {
        const all = message.parts.find(p => p.which === '');
        const parsed = await simpleParser(all.body);
        
        emails.push({
          id: message.attributes.uid,
          messageId: parsed.messageId,
          from: parsed.from?.value?.[0] || {},
          to: parsed.to?.value || [],
          subject: parsed.subject || '(no subject)',
          date: parsed.date || message.attributes.date,
          snippet: parsed.text?.substring(0, 200) || '',
          body: parsed.text || '',
          htmlBody: parsed.html || null,
          flags: message.attributes.flags || [],
          labels: message.attributes['x-gm-labels'] || []
        });
      } catch (parseError) {
        console.error('Error parsing message:', parseError.message);
      }
    }
    
    await connection.end();
    
    return res.status(200).json({
      success: true,
      count: emails.length,
      emails: emails
    });
    
  } catch (error) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    
    console.error('IMAP error:', error.message);
    
    // Provide helpful error messages
    let userMessage = error.message;
    if (error.message.includes('Invalid credentials')) {
      userMessage = 'Invalid email or app password. Make sure you\'re using an App Password, not your regular password.';
    } else if (error.message.includes('AUTHENTICATIONFAILED')) {
      userMessage = 'Authentication failed. Please check your App Password.';
    }
    
    return res.status(500).json({
      success: false,
      error: userMessage
    });
  }
};
