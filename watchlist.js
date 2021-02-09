const fs = require('fs');

const watchlist = (
    () => {
        const content = fs.readFileSync('watchlist.json', 'utf8');
        const wlist = JSON.parse(content);

        return {
            users: wlist.users.map(item => item.toLowerCase()),
            keywords: wlist.keywords.map(item => item.toLowerCase())
        };
    }
)();

module.exports = watchlist;