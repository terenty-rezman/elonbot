const puppeteer = require('puppeteer');
const fs = require('fs').promises;

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

async function main() {
    const target_url = "https://twitter.com/elonmusk";
    const target_user_id = "44196397";

    const tweets = await scrap_tweets(target_url, target_user_id);

    await fs.writeFile("tweets.json", JSON.stringify(tweets), "utf8");
    console.log("saved to 'tweets.json'");
    console.log("done");
}

main();