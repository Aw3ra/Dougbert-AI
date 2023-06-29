export async function getConversation(env, tweetId, session) {
    let tweet_text = "";
    let tweet_author = "";
    let convo_entry = ""
    let conversation = [];
    try{
        while (tweetId != null) {
            const url = `https://twttrapi.p.rapidapi.com/get-tweet?tweet_id=${tweetId}`;
            const rapidApiKey = env.RAPIDAPI_KEY;
        
            const headers = {
            'twttr-session': session,
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
            };
        
            try {
                const response = await fetch(url, { headers });
                const data = await response.json();
                tweet_text = data.data.tweet_result.result.legacy.full_text;
                tweet_author = data.data.tweet_result.result.core.user_result.result.legacy.screen_name;
                convo_entry = tweet_author + ": " + tweet_text;
                conversation.push(convo_entry);
                tweetId = data.data.tweet_result.result.legacy.in_reply_to_status_id_str;
                // Wait 1 second
                await new Promise(r => setTimeout(r, 1000));
            } catch (error) {
                tweetId = null;
            }
        }
    } catch (error) {
        console.log("Error in twutter conversation: " +error);
    }
    // Return the conversation reversed
    return conversation.reverse();
}

export async function postTweet(env, content, tweetId, session) {
    // Split the content into 280 character chunks
    const chunks = await splitText(content);
    // For each chunk, post a tweet
    for (let chunk of chunks) {
        const encodedParams = new URLSearchParams();
        encodedParams.set('tweet_text', chunk);
        encodedParams.set('in_reply_to_tweet_id', tweetId);
        const url = `https://twttrapi.p.rapidapi.com/create-tweet`;
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'twttr-session': session,
                'X-RapidAPI-Key': env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
            },
            body: encodedParams
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            // If the data.data.create_tweet.tweet_result.result.rest_id exists, set tweetId to that
            if (data.data.create_tweet.tweet_result.result.rest_id) {
                tweetId = data.data.create_tweet.tweet_result.result.rest_id;
            }
            // Otherwise, set tweetId to null
            else {
                tweetId = null;
            }
        } catch (error) {
            tweetId = null
        }
    }
}

export async function likeTweet(env, tweetId, session)   {
    const url = `https://twttrapi.p.rapidapi.com/favorite-tweet`;
    const encodedParams = new URLSearchParams();
    encodedParams.set('tweet_id', tweetId);
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'twttr-session': session,
            'X-RapidAPI-Key': env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
        },
        body: encodedParams
    };
    try {
        const response = await fetch(url, options);
        const data = await response.json();
    }
    catch (error) {
        console.log("Error likeing tweet: "+error);
    }
}

export async function retweet(env, tweetId, session) {
    const url = `https://twttrapi.p.rapidapi.com/retweet-tweet`;
    const encodedParams = new URLSearchParams();
    encodedParams.set('tweet_id', tweetId);
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'twttr-session': session,
            'X-RapidAPI-Key': env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
        },
        body: encodedParams
    };
    try {
        const response = await fetch(url, options);
        const data = await response.json();
    }
    catch (error) {
        console.log("Error retweeting tweet: "+error);
    }
}

export async function getTimeline(env, session) {
    const url = 'https://twttrapi.p.rapidapi.com/for-you-timeline';
    const options = {
    method: 'GET',
    headers: {
        'twttr-session': session,
        'X-RapidAPI-Key': env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com'
    }
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        // Filter out any tweets that dont start with "tweet" or "home-conversation" in data.data.timeline_response.instructions[0].entries.entryId
        let tweets = data.data.timeline_response.timeline.instructions[0].entries.filter(entry => entry.entryId.startsWith('tweet') || entry.entryId.startsWith('home-conversation'));
        // Filter out any tweets that have a matches "suggest_promoted" in data.data.timeline_response.instructions[0].entries.content.clientEventInfo.component
        tweets = tweets.filter(entry => entry.content.clientEventInfo.component !== 'suggest_promoted');
        // Return a random entryId, excluding all the letters and just returning the number
        const randomTweet = tweets[Math.floor(Math.random() * tweets.length)].entryId.replace(/\D/g,'');
        return randomTweet;
    } catch (error) {
        console.error("error in retrieveing timeline tweet:  "+ error);
        return null;
    }
}

export async function followUser(env, username, session){
    const url = `https://twttrapi.p.rapidapi.com/follow-user`;
    const encodedParams = new URLSearchParams();
    encodedParams.set('username', username);
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'twttr-session': session,
            'X-RapidAPI-Key': env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
        },
        body: encodedParams
    };
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log("Followed: " + username);
    }
    catch (error) {
        console.log("Error following user: "+error);
    }
}

function splitText(text, maxChars = 280) {
    const splitText = [];

    while (text.length > 0) {
        let cutIndex;
        if (text.length > maxChars) {
            for (let i = maxChars - 1; i >= 0; i--) {
                if (['.', '?', '!'].includes(text[i])) {
                    cutIndex = i + 1;
                    break;
                } else if (text[i] === ' ') {
                    cutIndex = i;
                }
            }

            cutIndex = cutIndex || maxChars;
        } else {
            cutIndex = text.length;
        }

        const chunk = text.slice(0, cutIndex);
        splitText.push(chunk.trim());
        text = text.slice(cutIndex).trim();
    }

    return splitText;
}

  
  