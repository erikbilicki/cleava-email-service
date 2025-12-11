const Imap = require('imap-simple');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  
  try {
    const connection = await Imap.connect({
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
    
    await connection.end();
    return res.status(200).json({ success: true, message: 'Connected!' });
    
  } catch (error) {
    return res.status(200).json({ success: false, error: error.message });
  }
};
