const last_tweets = new Map();

function last_tweet_id(user_name) {
    return Promise.resolve(last_tweets.get(user_name));
}

function set_last_tweet_id(user_name, last_tweet_id) {
    last_tweets.set(user_name, last_tweet_id);
    return Promise.resolve(last_tweet_id);
}

module.exports = {
    last_tweet_id,
    set_last_tweet_id
}