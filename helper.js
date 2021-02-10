
function rand_int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; // max not included
}

// time measure decorator
function measure_time(f) {
    return async function () {
        const start = new Date();
        const result = await f.apply(this, arguments);
        console.log(`'${f.name}()' executed for`, new Date() - start, "ms");
        return result;
    }
}

function sleep(ms) {
    if (ms <= 0)
        return Promise.resolve();

    return new Promise(resolve => setTimeout(resolve, ms));
}

function sleep_random(min_ms, max_ms) {
    return sleep(rand_int(min_ms, max_ms));
}

function start_timer() {
    const start = Date.now();
    return function () {
        return Date.now() - start;
    }
}

module.exports = {rand_int, measure_time, sleep, sleep_random, start_timer};