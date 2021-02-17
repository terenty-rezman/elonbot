const cheerio = require("cheerio");
const axios = require("axios");
const log = require("./log");
const helper = require("./helper");

const RE_IP_PORT = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/;

let proxy_list = [];
let proxy_list_iterator = make_cycle_iterator(proxy_list);

const proxy_update_interval = 15 * 60 * 1000;
let proxy_last_update = new Date();

// cycle forever through list
function* make_cycle_iterator(list) {
    let i = 0;
    while (true) {
        yield list[i];
        i++;
        if (list.length)
            i = i % list.length;
    }
}

async function get_proxy_list() {
    let result_list = [];

    try {
        const response = await axios.get("https://free-proxy-list.net/");
        const $ = cheerio.load(response.data);

        const proxy_list_text = $("textarea.form-control").text();
        const proxy_list_array_raw = proxy_list_text.split("\n");

        // regex to math ip:port as 'xxx.xxx.xxx.xxx:xxx'

        const filtered_proxy_array = proxy_list_array_raw.filter(entry => entry.match(RE_IP_PORT));

        result_list = filtered_proxy_array;
    }
    catch (err) {
        log.log("failed to get proxy list", err);
    }
    finally {
        return result_list;
    }
}

async function is_alive_proxy(proxy_str, timeout) {
    let result = false;

    try {
        const [_, ip, port] = proxy_str.match(RE_IP_PORT);
        const res = await axios.get('https://api.ipify.org?format=json', {
            timeout,
            proxy: {
                protocol: 'https',
                host: ip,
                port: port,
            }
        });
        console.log(res.data);
        result = true;
    }
    catch(err){
        console.log(err); 
    }
    finally {
        return result;
    }
}

async function next_alive_poxy(proxy_list_iterator, per_proxy_timeout, total_timeout) {
    const elapsed = helper.start_timer();

    for (let proxy of proxy_list_iterator) {
        if (await is_alive_proxy(proxy, per_proxy_timeout))
            return `http://${proxy}`;

        if (elapsed() > total_timeout)
            break;
    }

    return false;
}

module.exports = {
    next_ip: async function () {
        let proxy_expired = false;
        if (new Date() - proxy_last_update > proxy_update_interval)
            proxy_expired = true;

        if (proxy_list.length === 0 || proxy_expired) {
            const new_proxy_list = await get_proxy_list();

            if (new_proxy_list.length) {
                proxy_list = new_proxy_list;
                proxy_list_iterator = make_cycle_iterator(proxy_list);
                proxy_last_update = new Date();
            }
        }

        return await next_alive_poxy(proxy_list_iterator, 5000, 50 * 5000);
    }
}