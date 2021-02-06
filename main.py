#!/usr/bin/env python3

import tweepy

CONSUMER_KEY = 'key'
CONSUMER_SECRET = 'secret'

KEY = 'key'
SECRET = 'secret'

def create_api(consumer_key, consumer_secret, key, secret):
    auth = tweepy.OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
    auth.set_access_token(KEY, SECRET)
    api = tweepy.API(auth)
    return api

if __name__ == '__main__':
    api = create_api(CONSUMER_KEY, CONSUMER_SECRET, KEY, SECRET)

    user = api.verify_credentials()
    if user: 
        print('twitter auth OK')
    else:
        print('twitter auth FAILIED')


    