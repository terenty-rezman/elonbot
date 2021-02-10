const puppeteer = require('puppeteer');
const telegram = require('./telegram');

let browser = null;

async function scrap_tweets(browser, user_screen_name) {
    const target_url = `https://twitter.com/${user_screen_name}`;
    const paused_requests = [];
    let paused = false;
    let abort_next = false;
    let tweets = [];
    let user_rest_id = undefined;

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
    }

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', request => {
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

        request.continue();
    });

    page.on('requestfinished', async (request) => {
        const response = await request.response();
        const url = request.url();

        // extract user_rest_id and resume requests
        if (url.includes('UserByScreenName')) {
            const response_body = await response.buffer();
            const json_str = response_body.toString('utf8');

            user_rest_id = JSON.parse(json_str).data?.user?.rest_id;
            if (!user_rest_id) {
                console.log(`warning: nonexistent twitter account:`, user_screen_name);
                telegram.notify_admin(`nonexistent account: ${user_screen_name}`);
            }

            resume_requests();
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

    console.log("visiting url: ", target_url);
    await page.goto(target_url, { waitUntil: 'networkidle0' });

    await page.close();
    return tweets;
}

module.exports.startup = async function () {
    if (browser)
        throw("error: twitter_scrapper already initialized !! ");

    browser = await puppeteer.launch({
        headless: true,
        /* allows nonsecure HTTP protocol and ignore any HTTPS-related errors */
        ignoreHTTPSErrors: true
    });

    return browser;
}

module.exports.shutdown = async function () {
    return browser.close();
}

module.exports.scrap_tweets = async function (user_screen_name) {
    if(!browser)
        throw("error: twitter_scrapper should be initialized with startup() before use !!")
        
    try {
        return await scrap_tweets(browser, user_screen_name);
    }
    catch (err) {
        throw (err);
    }
}