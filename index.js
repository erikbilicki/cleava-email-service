const express = require('express');
const fetchEmails = require('./api/fetch-emails');
const sendEmail = require('./api/send-email');

const app = express();
app.use(express.json());

// Wrap Vercel-style handlers for Express
const wrapHandler = (handler) => async (req, res) => {
  await handler(req, res);
};

app.all('/api/fetch-emails', wrapHandler(fetchEmails));
app.all('/api/send-email', wrapHandler(sendEmail));

app.get('/', (req, res) => {
  res.json({ status: 'ok', endpoints: ['/api/fetch-emails', '/api/send-email'] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
