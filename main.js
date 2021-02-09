const fs = require("fs").promises;
const watchlist = require("./watchlist");
const latinize = require("latinize");
const twitter = require("./twitter_scrapper");

// time measure decorator
function measure_time(f) {
    return async function () {
        let start = new Date();
        const result = await f.apply(this, arguments);
        console.log(`'${f.name}()' executed for`, new Date() - start, "ms");
        return result;
    }
}

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

async function tweets_to_file(twitter_user_name) {
    const tweets = await twitter.scrap_tweets(twitter_user_name);
    const sorted_tweets = tweets.sort(([id_a, tweet_a], [id_b, tweet_b]) => id_b.localeCompare(id_a));
    const interest_tweets = filter_tweets_keywords(sorted_tweets, watchlist.keywords);

    // save tweets of interest to file
    await fs.mkdir("./tweets", { recursive: true });
    await fs.writeFile(`./tweets/${twitter_user_name}_tweets.json`, JSON.stringify(interest_tweets), "utf8");

    console.log(`saved to '${twitter_user_name}_tweets.json'`);
}

// measure tweets scrap time
tweets_to_file = measure_time(tweets_to_file);

async function main() {
    const user_names = watchlist.users;

    try {
        await twitter.startup();
    }
    catch (err) {
        console.log(err);
        return;
    }

    const results = await Promise.allSettled(user_names.map(name => tweets_to_file(name)));

    // report errors if any
    const failed = results.filter(promise => promise.status === "rejected");
    failed.forEach(element => {
        console.log("error:", element.reason);
    });

    await twitter.shutdown();

    console.log("done");
}

// handle the unhandled
process.on('unhandledRejection', function (err) {
    console.log(err);
});

main();