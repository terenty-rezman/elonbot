const puppeteer = require('puppeteer');
const telegram = require('./telegram');
const stats = require('./stats');
const { sleep } = require('./helper');
const log = require('./log');
const useProxy = require('puppeteer-page-proxy');
const proxy = require('./proxy');

let browser = null;

// tweeter page makes 2 requests (that are interesting for us) to download tweets:
// 1st one - request to UserByScreenName - to request user id provided with user screen name
// and 2nd one - request to {user id}.json - actual request to download most recent 20 tweets
// so below we intercept the 1st request first to find out user_id while pausing all subsequent requests
// in order to receive responce with user id first and to be able to resolve the second request interception url path {user id}.json
// and then we intercept request to {user id}.json to intercept tweets list in json format
// all the subsequent request are dropped as being unnecessary
async function scrap_tweets(browser, user_screen_name) {
    const target_url = `https://twitter.com/${user_screen_name}`;
    const paused_requests = [];
    let paused = false;
    let abort_next = false;
    let tweets = [];
    let user_rest_id = undefined;

    const proxy_str = await proxy.next_ip();

    const resume_requests = () => {
        paused = false;
        abort_next = true;

        paused_requests.forEach(req => {
            const url = req.url();

            if (user_rest_id && url.includes(`${user_rest_id}.json`))
                req.continue();
            else
                req.abort(); // optimization: drop everything but tweets requests
        });

        paused_requests.splice(0, paused_requests.length);
    }

    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', async (request) => {
        const url = new URL(request.url());
        const url_path = url.pathname;

        if (abort_next) { // optimization
            request.abort();
            return;
        }

        if (paused) {
            paused_requests.push(request);
            return;
        }

        // pause subsequent requests after this req
        if (url_path.includes('UserByScreenName'))
            paused = true;

        await useProxy(request, {
            proxy: proxy_str,
            timeout: 5000
        });

        console.log('proxied req ok')
        //request.continue();
    });

    page.on('requestfinished', async (request) => {
        const response = await request.response();
        const url = request.url();

        // extract user_rest_id and resume requests
        if (url.includes('UserByScreenName')) {
            const response_body = await response.buffer();
            const json_str = response_body.toString('utf8');

            try {
                user_rest_id = JSON.parse(json_str).data?.user?.rest_id;

                if (!user_rest_id) {
                    stats.failed_scrap_count++;
                    log.log(`warning: nonexistent twitter account:`, user_screen_name);
                    //telegram.notify_admin(`nonexistent account: ${user_screen_name}`);
                }

                resume_requests();
            }
            catch (err) {
                log.log(`JSON response str: "${json_str}"\n`, err);
            }
        }

        // extract tweets
        if (user_rest_id && url.includes(`${user_rest_id}.json`)) {
            const response_body = await response.buffer();
            const json_str = response_body.toString('utf8');

            tweets = JSON.parse(json_str).globalObjects.tweets;
            // from obj to array
            tweets = Object.entries(tweets);
        }
    });

    page.on('requestfailed', request => {
        const url = request.url();

        if (url.includes('UserByScreenName'))
            resume_requests();
    });

    // log.log("visiting url: ", target_url);
    try {
        await page.goto(target_url, { waitUntil: 'networkidle0' });
    }
    catch (err) {
        log.log(err);
    }
    finally {
        await page.close();
        return tweets;
    }
}

async function startup() {
    if (browser)
        throw ("error: twitter_scrapper already initialized !! ");

    browser = await puppeteer.launch({
        headless: true,
        /* allows nonsecure HTTP protocol and ignore any HTTPS-related errors */
        ignoreHTTPSErrors: true
    });

    return browser;
}

function shutdown() {
    return browser.close();
}

module.exports = {
    startup,
    shutdown,

    restart_browser: async function () {
        await shutdown();
        browser = null;
        await sleep(5000); // give some time for chrome to clean up memory just in case
        return startup();
    },

    scrap_tweets: async function (user_screen_name) {
        if (!browser)
            throw ("error: twitter_scrapper should be initialized with startup() before use !!")

        return await scrap_tweets(browser, user_screen_name);
    }
}

