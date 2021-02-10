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

let bot = new telegraf.Telegraf(auth.token);

bot.on('message', async (ctx) => {
    // ignore all chats except owner
    if (ctx.message.chat.id !== auth.admin_chat_id) {
        ctx.telegram.sendMessage(ctx.message.chat.id, `online`);
        return;
    }

    const command = ctx.message.text.toLowerCase();

    switch (command) {
        default:
            ctx.telegram.sendMessage(ctx.message.chat.id, `online`);
    }

    console.log(`msg from chat_id = ${ctx.message.chat.id}`);
})

bot.on('group_chat_created', (ctx) => {
    ctx.telegram.sendMessage(ctx.message.chat.id, `thank you`);
})

module.exports.startup = function () {
    return bot.launch();
}

module.exports.shutdown = function (reason = 'unspecified') {
    return bot.stop(reason);
}

module.exports.send_message = async function (text) {
    return bot.telegram.sendMessage(auth.private_group_id, text, { parse_mode: 'HTML' });
}

module.exports.notify_admin = async function (text) {
    return bot.telegram.sendMessage(auth.admin_chat_id, text, { parse_mode: 'HTML' });
}