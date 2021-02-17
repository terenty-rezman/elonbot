const cheerio = require("cheerio");
const axios = require("axios");
const log = require("./log");
const helper = require("./helper");

let proxy_list = [];
let proxy_list_iterator = make_cycle_iterator(proxy_list);

const proxy_update_interval = 15 * 60 * 1000;
let proxy_last_update = new Date();

// cycle forever through list
function* make_cycle_iterator(list) {
    let i = 0;
    while(true) {
        yield list[i];
        i++;
        if(list.length)
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
        const re_ip_port = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/;
        const filtered_proxy_array = proxy_list_array_raw.filter(entry => entry.match(re_ip_port));

        result_list = filtered_proxy_array;
    }
    catch(err) {
        log.log("failed to get proxy list", err);
    }
    finally {
        return result_list;
    }
}

module.exports = {
    next_ip: async function() {
        let proxy_expired = false;
        if(new Date() - proxy_last_update > proxy_update_interval)
            proxy_expired = true;

        if(proxy_list.length === 0 || proxy_expired) {
            const new_proxy_list = await get_proxy_list();

            if(new_proxy_list.length) {
                proxy_list = new_proxy_list;
                proxy_list_iterator = make_cycle_iterator(proxy_list);
                proxy_last_update = new Date();
            }       
        }

        return proxy_list_iterator.next().value || '';
    }
}