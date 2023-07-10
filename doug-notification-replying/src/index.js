import { withContent, ThrowableRouter, } from 'itty-router-extras';

import { createResponse, decideAction } from './ai';
import { getTweet, updateReplied, addLog, getProfiles, updateReplyTime } from './database.js';
import { getConversation, postTweet, likeTweet, retweet, getTimeline, followUser} from './twitter';


const router = ThrowableRouter()

router.get("/", async ({}, env) => {
  return startBot(env);
})

async function startBot(env){
  let profiles = await getProfiles(env);
  // Variable for storing each profile response
  let getRequestResponse = "";
  // For each profile run the bot
  for (let profile of profiles) {
    try{
        let today = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // If the paidUntil date after today, run the bot
        if (profile.paidUntil > today) {
          // Check if replyTime is equal to currentReplyTime, if so run the bot
          if (profile.replyTime == profile.currentReplyTime) {
            console.log("Running for profile: " + profile.name + "\n")
            getRequestResponse += await runDoug(env, profile);
          }
          else {
            console.log("Skipping profile based on replyTime: " + profile.name + "\n")
            getRequestResponse += "Skipping profile: " + profile.name + "\n";
          }
        }
        else {
          console.log("Skipping profile: " + profile.name + "\n")
          getRequestResponse += "Skipping profile: " + profile.name + "\n";
        }
        await updateReplyTime(env, profile);
    }
    catch(e){
      console.log(e);
      getRequestResponse += "Error in profile: " + profile.name + "\n";
    }

  }
  return new Response(JSON.stringify(getRequestResponse), {
    status: 200,
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  });
}

async function runDoug(env, profile){
  let getRequestResponse = "";
  let conversation = "";
  let commandList = ['Z'];
  let tweetId = "";
  let tweet = null;
  try {
    const query = profile.name;
    tweet = await getTweet(env, query);
    tweetId = tweet ? tweet.tweet_id : await getTimeline(env, profile.session);

    conversation = await getConversation(env, tweetId, profile.session);

    commandList = (await decideAction(env, conversation, profile)).match(/\[(.*?)\]/g)[0].split(",").map(item => item.replace(/[\[\]']+/g, '').trim());

    console.log(commandList);
  } catch (e) {
    console.log(e);
    getRequestResponse += `Error in ${tweet ? 'getting conversation' : 'generating reply'}\n`;
  }

  try {
    const tweetText = conversation[conversation.length - 1];
    const log = await addLog(env, tweetId, commandList, tweetText, profile.name);
    if (log) {
      getRequestResponse += "Log: " + log + "\n";
      // If the log is successfully added, for each entry in the command list, call the appropriate function
      for (let command of commandList) {
          if (command == "A") {
              console.log("Like");
              await likeTweet(env, tweetId, profile.session);
          }
          else if (command == "B") {
              console.log("Retweet");
              await retweet(env, tweetId, profile.session);
          }
          else if (command == "C") {
              console.log("Reply");
              let twitterReply = await createResponse(env, conversation, profile);
              console.log(twitterReply);
              await postTweet(env, twitterReply, tweetId, profile.session);
          }
          else if (command == "D") {
              console.log("Follow");
              // Split the tweet text and take the section before th : as the username
              let username = tweetText.split(":")[0];
              await followUser(env, username, profile.session);
          }

          else {
              console.log("Ignoring command: " + command);
          }
      }
    }
    else{
      await updateReplied(env, tweetId);
      return "Already replied"
    }
} catch (e) {
    console.log(e);
    getRequestResponse += e.message.includes('addLog') ? "Error in adding log\n" : `Error in command: ${command}\n`;
}

try {
    const updated = await updateReplied(env, tweetId);
    getRequestResponse += "Updated: " + updated + "\n";
} catch (e) {
    console.log(e);
    getRequestResponse += "Error in updating replied status\n";
}
  
  return getRequestResponse;
}

async function handledScheduled(event, env, ctx) {
  return startBot(env);
}


// Catchall
router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
    fetch: router.handle,
    scheduled: handledScheduled
}