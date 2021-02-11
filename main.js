const watchlist = require("./watchlist");
const latinize = require("latinize");
const twitter = require("./twitter_scrapper");
const telegram = require("./telegram");
const db = require("./db");
const { measure_time, sleep, sleep_random, start_timer } = require("./helper");

function filter_tweets_keywords(tweets, keywords) {
    return tweets.filter(([id, tweet]) => {
        const text = tweet.full_text;
        const latinized = latinize(text);
        const lowered = latinized.toLowerCase();

        for (let keyword of keywords) {
            if (lowered.includes(keyword))
                return true;
        }

        return false;
    })
}

async function tweets_to_telegram(twitter_user_name) {
    const tweets = await twitter.scrap_tweets(twitter_user_name);
    // sort so older tweets go first
    const sorted_tweets = tweets.sort(([id_a, tweet_a], [id_b, tweet_b]) => -id_b.localeCompare(id_a));

    const db_last_tweet_id = await db.last_tweet_id(twitter_user_name);

    if (!db_last_tweet_id) { // we don't have id stored -> its our first run
        // store last tweet id in db and dont send anything to telegram
        // we'll be monitoring new tweets from now
        const last_tweet_id = sorted_tweets.pop();
        if (last_tweet_id)
            db.set_last_tweet_id(twitter_user_name, last_tweet_id);
    }
    else { // we have last tweet id stored -> so we process only new tweets with id > stored_id
        const new_tweets = sorted_tweets.filter(([id, tweet]) => id.localeCompare(db_last_tweet_id) > 0);
        const interest_tweets = filter_tweets_keywords(new_tweets, watchlist.keywords);

        let last_sent_id = undefined;
        // send tweets of interest to telegram 
        for (let [id, tweet] of interest_tweets) {
            const link = `https://twitter.com/${twitter_user_name}/status/${id}`;
            const msg = `<a>${link}</a>`;

            const result = await telegram.send_message(msg);
            last_sent_id = id;
        }

        const last_tweet_id = last_sent_id || new_tweets.pop();
        if (last_tweet_id)
            db.set_last_tweet_id(twitter_user_name, last_tweet_id);
    }
}

// measure tweets scrap time
//tweets_to_telegram = measure_time(tweets_to_telegram);

async function bot_loop() {
    const user_names = watchlist.users;
    const repeat_interval = 60 * 1000; // ms

    while (true) { // cycle forever
        try {
            const elapsed = start_timer();

            for (let user of user_names) {
                try {
                    await tweets_to_telegram(user);
                }
                catch (err) {
                    console.log(err);
                }
                await sleep_random(500, 4000); // counter twitter anti bot protecton
            }

            // sleep for some time
            await sleep(repeat_interval - elapsed());
        }
        catch (err) {
            console.log(err);
        }
    }
}

async function main() {
    console.log(`${new Date()} starting elonbot...`);

    try {
        await twitter.startup();
        await telegram.startup();
        console.log(`online`);

        await bot_loop();
    }
    catch (err) {
        console.log(err);
    }
    finally {
        await telegram.shutdown();
        await twitter.shutdown();
    }
}

function cleanup() {
    telegram.shutdown();
    twitter.shutdown();
}

// handle the unhandled
process.on('unhandledRejection', function (err) {
    console.log(err);
});

// Enable graceful stop
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

main();