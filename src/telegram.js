const telegraf = require('telegraf');
const fs = require('fs');
const stats = require('./stats');
const log = require('./log');

const auth = (
    () => {
        let result = {
            token: "",
            private_group_id: 0,
            admin_chat_id: 0
        }

        const auth_file = './auth/telegram_auth.json';
        if (fs.existsSync(auth_file))
            result = JSON.parse(fs.readFileSync(auth_file));
        else
            log.log('warning: telegram auth file not found:', auth_file);

        return result;
    }
)();

let bot = new telegraf.Telegraf(auth.token);

// monkeypatch handleUpdates with my own [could break with new Telegraf version]
const original_handleUpdates = bot.handleUpdates;

// process only last message per chat
const my_handleUpdates = function(updates) {
    // store id only for most recent update per chat
    // updates comes sorted from older to newer
    const most_recent_updates = new Map();

    updates.forEach(update => {
        const chat_id = update?.message?.chat?.id; // sometimes updates have no message?
        const update_id = update.update_id;
        if(chat_id && update_id)
            most_recent_updates.set(update.message.chat.id, update.update_id);
    });

    const most_recent_ids = new Set(most_recent_updates.values());

    const one_update_per_chat = updates.filter(update => most_recent_ids.has(update.update_id));

    return original_handleUpdates.call(bot, one_update_per_chat);
}

bot.handleUpdates = my_handleUpdates;

function is_admin(chat_id) {
    return chat_id === auth.admin_chat_id;
}

bot.on('message', async (ctx) => {
    // ignore all chats except owner
    if (is_admin(ctx.message.chat.id) === false) {
        ctx.telegram.sendMessage(ctx.message.chat.id, `online`);
        return;
    }

    const command = ctx.message.text.toLowerCase();

    switch (command) {
        case 'stat':
        case 'stats':
        case 'info':
            ctx.telegram.sendMessage(ctx.message.chat.id, await stats.report(), { parse_mode: 'HTML' });
            break;
        default:
            ctx.telegram.sendMessage(ctx.message.chat.id, `online`);
    }

    log.log(`msg from chat_id = ${ctx.message.chat.id}`);
})

module.exports.startup = function () {
    return bot.launch({allowedUpdates: 'message'});
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