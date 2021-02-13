module.exports = {
    log: function() {
        const time_stamp = `${new Date}`;
        console.log(time_stamp, ...arguments);
    }
}