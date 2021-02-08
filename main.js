const puppeteer = require('puppeteer');
const fs = require('fs').promises;
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
        console.log("could not create browser: ", err);
    }
}

async function scrap_tweets(target_url, user_id) {
    const browser = await start_browser();
    let tweets = [];

    if(!browser) {
        console.log("no browser instance -> stop");
        return;
    }
    console.log("browser instance ok");

    try {
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', request => {
            request.continue();
        });

        page.on('requestfinished', async (request) => {
            const response = await request.response();

            if (request.redirectChain().length === 0) {
                const url = request.url();

                if(url.includes(`${user_id}.json`)) {
                    // body can only be access for non-redirect responses
                    const response_body = await response.buffer();
                    const json_str = response_body.toString('utf8');

                    tweets = JSON.parse(json_str).globalObjects.tweets;
                    // from obj to array
                    tweets = Object.entries(tweets);
                }
            }
        });

        console.log("visiting url: ", target_url);
        await page.goto(target_url, { waitUntil: 'networkidle0' });
    }
    catch(err) {
        console.log("some error: ", err);
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
    const target_url = "https://twitter.com/elonmusk";
    const target_user_id = "44196397";

    const tweets = await scrap_tweets(target_url, target_user_id);
    const sorted_tweets = tweets.sort(([id_a, tweet_a], [id_b, tweet_b]) => id_b.localeCompare(id_a));
    const interest_tweets = filter_tweets_keywords(sorted_tweets, keywords);

    await fs.writeFile("tweets.json", JSON.stringify(interest_tweets), "utf8");

    console.log("saved to 'tweets.json'");
    console.log("done");
}

main();