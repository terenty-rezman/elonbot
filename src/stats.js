const { default: endent } = require('endent');
const axios = require('axios');
const log = require('./log');

module.exports = {
    scrap_count: 0, // scrap count for statistics
    failed_scrap_count: 0, // failed scraps
    unhandled_exceptions_count: 0,

    uptime_str: function () {
        let secs = process.uptime(); // secs

        const days = Math.floor(secs / (60 * 60 * 24));
        secs -= days * (60 * 60 * 24);

        const hours = Math.floor(secs / (60 * 60));
        secs -= hours * (60 * 60);

        const mins = Math.floor(secs / 60);
        secs -= mins * (60);

        secs = Math.floor(secs);

        return `${days} days, ${hours} hours, ${mins} mins, ${secs} seconds`;
    },

    report: async function () {
        let ip;
        try {
            const res = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            ip = res?.data?.ip;
        }
        catch(err) {
            log.log(err);
            ip = 'error';
        }

        return endent`
            ip: <b>${ip}</b>
            uptime: <b>${this.uptime_str()}</b>
            scraps count: <b>${this.scrap_count}</b>
            failed scraps: <b>${this.failed_scrap_count}</b>
            unhandled excepts: <b>${this.unhandled_exceptions_count}</b>
        `;
    }
}