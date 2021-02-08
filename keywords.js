const fs = require('fs');

const keywords = {
    list: (() => {
        const content = fs.readFileSync('keywords.json', 'utf8');
        const list = JSON.parse(content);
        const lowered_list = list.map(item => item.toLowerCase());
        return lowered_list;
    })()
}

module.exports = keywords;