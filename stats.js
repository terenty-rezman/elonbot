const { default: endent } = require("endent");

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

    report: function () {
        return  endent`
            uptime: <b>${this.uptime_str()}</b>
            scraps count: <b>${this.scrap_count}</b>
            failed scraps: <b>${this.failed_scrap_count}</b>
            unhandled excepts: <b>${this.unhandled_exceptions_count}</b>
        `;
    }
}