module.exports = {
    log: function() {
        const time_stamp = `${new Date().toLocaleString()}`;
        console.log(time_stamp, ...arguments);
    }
}
