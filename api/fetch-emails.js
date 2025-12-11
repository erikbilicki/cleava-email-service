const Imap = require('imap-simple');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, limit = 5 } = req.body;
  
  let connection;
  
  try {
    connection = await Imap.connect({
      imap: {
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 5000,
        connTimeout: 5000
      }
    });
    
    await connection.openBox('INBOX');
    
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      struct: false
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    // Get only the most recent emails
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
    
    return res.status(200).json({ 
      success: true, 
      count: emails.length,
      emails 
    });
    
  } catch (error) {
    if (connection) try { await connection.end(); } catch(e) {}
    return res.status(200).json({ success: false, error: error.message });
  }
};
