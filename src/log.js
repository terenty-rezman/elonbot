module.exports = {
    log: function() {
        const time_stamp = `${new Date().toLocaleString('ru')}`;
        console.log(time_stamp, ...arguments);
    }
}
