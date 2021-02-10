const telegraf = require('telegraf');
const fs = require('fs');

const auth = (
    () => {
        let result = {
            token: "",
            private_group_id: 0,
            admin_chat_id: 0
        }

        const auth_file = 'telegram_auth.json';
        if (fs.existsSync(auth_file)) { 
            result = JSON.parse(fs.readFileSync(auth_file));
        }
        return result;
    }
)();

const bot = new telegraf.Telegraf(auth.token);

bot.on('message', async (ctx) => {
    // ignore all chats except owner
    if(ctx.message.chat.id !== auth.admin_chat_id)
        return;
        
    const result = await ctx.telegram.sendMessage(ctx.message.chat.id, `online`);
    console.log(`msg from chat_id = ${ctx.message.chat.id}`);
})

bot.on('group_chat_created', (ctx) => {
    ctx.telegram.sendMessage(ctx.message.chat.id, `thank you`);
})

async function test() {
    const result = await bot.telegram.sendMessage(auth.private_group_id, 'test msg');
    console.log(`msg sent to chat_id = ${chat.id}`);
}

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))