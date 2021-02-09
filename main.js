const fs = require('fs').promises;
const url = require('url');

const puppeteer = require('puppeteer');
const latinize = require('latinize');

const keywords = require("./keywords");

async function start_browser() {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            /* allows nonsecure HTTP protocol and ignore any HTTPS-related errors */
            ignoreHTTPSErrors: true 
        });
        return browser;
    }
    catch (err) {
        console.log("could not create browser:", err);
    }
}

async function scrap_tweets(user_screen_name) {
    const target_url = `https://twitter.com/${user_screen_name}`;
    const browser = await start_browser();
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

            if(url.includes(`${user_rest_id}.json`))
                req.continue();
            else
                req.abort(); // optimization: drop everything but tweets requests
        });
    }

    if(!browser) {
        console.log("no browser instance -> stop");
        return;
    }
    console.log("browser instance ok");

    try {
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', request => {
            const url = new URL(request.url());
            const url_path = url.pathname;

            if(abort_next) { // optimization
                request.abort();
                return;
            }

            if(paused) {
                paused_requests.push(request);
                return;
            }

            // pause subsequent requests after this req
            if(url_path.includes('UserByScreenName'))
                paused = true;

            request.continue();
        });

        page.on('requestfinished', async (request) => {
            const response = await request.response();
            const url = request.url();

            // extract user_rest_id and resume requests
            if(url.includes('UserByScreenName')) {
                const response_body = await response.buffer();
                const json_str = response_body.toString('utf8');

                user_rest_id = JSON.parse(json_str).data.user.rest_id;
                resume_requests();
            }

            // extract tweets
            if(user_rest_id && url.includes(`${user_rest_id}.json`)) {
                const response_body = await response.buffer();
                const json_str = response_body.toString('utf8');

                tweets = JSON.parse(json_str).globalObjects.tweets;
                // from obj to array
                tweets = Object.entries(tweets);
            }
        });

        page.on('requestfailed', request => {
            const url = request.url();

            if(url.includes('UserByScreenName'))
                resume_requests();
        });

        console.log("visiting url: ", target_url);
        await page.goto(target_url, { waitUntil: 'networkidle0' });
    }
    catch(err) {
        console.log("some error:", err);
    }

    await browser.close();
    return tweets;
}

function filter_tweets_keywords(tweets, keywords) {
    return tweets.filter(([id, tweet]) => {
        const text = tweet.full_text;
        const latinized = latinize(text);
        const lowered = latinized.toLowerCase();

        for(let keyword of keywords) {
            if (lowered.includes(keyword))
                return true;
        }

        return false;
    })
}

async function main() {
    const user_name = "elonmusk";
    
    let start = new Date();
    const tweets = await scrap_tweets(user_name);
    console.log("scrap time", new Date() - start, "ms");

    const sorted_tweets = tweets.sort(([id_a, tweet_a], [id_b, tweet_b]) => id_b.localeCompare(id_a));
    const interest_tweets = filter_tweets_keywords(sorted_tweets, keywords);

    await fs.writeFile("tweets.json", JSON.stringify(interest_tweets), "utf8");

    console.log("saved to 'tweets.json'");
    console.log("done");
}

main();