import { connect } from '@planetscale/database';
import { withContent, ThrowableRouter, } from 'itty-router-extras';
import { getProfiles } from './database';
const router = ThrowableRouter()

// Creates a PlanetScale connection object and returns it
function getPlanetScaleConnection(env) {
	const config = {
	  host: env.DATABASE_HOST,
	  username: env.DATABASE_USERNAME,
	  password: env.DATABASE_PASSWORD,
	  fetch: (url, init) => {
		delete (init)["cache"];
		return fetch(url, init);
	  }
	}
	return connect(config)
  }
  
// Function to fetch tweets using rapid API
async function searchNotifications(env, query='dougbertai') {
	const url = `https://twttrapi.p.rapidapi.com/search-users?query=${query}`;
	const rapidApiKey = env.RAPIDAPI_KEY;
	const session = env.SESSION;
	const twitterId = '1610746366682361856';
  
	const headers = {
	  'twttr-session': session,
	  'X-RapidAPI-Key': rapidApiKey,
	  'X-RapidAPI-Host': 'twttrapi.p.rapidapi.com',
	};
  
	try {
	  const response = await fetch(url, { headers });
	  const data = await response.json();
  
	  const tweets = data.globalObjects.tweets;
	  console.log(tweets);
	  const newNotifications = Object.values(tweets)
	  .filter((tweet) => {
		return !tweet.scopes && !(tweet.retweeted_status_id_str || tweet.user_id_str === twitterId)
	  })
	  .map((tweet) => ({
		tweet_id: tweet.id_str,
		author_id: tweet.user_id,
		created_at: new Date(tweet.created_at),
		content: tweet.full_text,
		actioned: false,
		notification_for: query
	  }));
	  console.log(newNotifications);
  
	  // Reverse the order of notifications
	  return newNotifications;
	} catch (error) {
	  console.error(error);
	  throw error;
	}
  }

// Find and upload new notifications
router.post("/", withContent, async (request, env) => {

	const new_data = await request.json(); // parse the JSON body of the request
  
	if (!new_data) {
	  return new Response("Request body must include new_data", { status: 400 });
	}
  
	const { tweet_id, content, created_at, author_id, actioned, notification_for } = new_data;
  
	if (!(tweet_id && content && created_at && author_id && actioned != null && notification_for)) {
	  return new Response("new_data must include tweet_id, content, created_at, author_id, actioned, and notification_for", { status: 400 });
	}
	const conn = getPlanetScaleConnection(env)
	const data = await conn.execute('INSERT INTO notifications (tweet_id, content, created_at, author_id, actioned, notification_for) VALUES (:tweet_id, :content, :created_at, :author_id, :actioned, :notification_for);', {
		tweet_id,
		content,
		created_at,
		author_id,
		actioned,
		notification_for
	})
  
	return new Response(JSON.stringify(newNotification), {
	  status: 201,
	  headers: {
		"Content-Type": "application/json"
	  }
	})
  })

//   Get all notifications
router.get("/", async ({}, env) => {
	await searchNotifications(env)
	// const conn = getPlanetScaleConnection(env)
	// const data = await conn.execute('SELECT * FROM logs');
	// return new Response(JSON.stringify(data.rows), {
	// 			  status: 200,			
	// 			  headers: {
	// 				"Content-Type": "application/json"
	// 			  			}				
	// 				})
	})


async function handleScheduled(event, env, ctx) {
	const profiles = await getProfiles(env)
	const tweets = [];
	// If profile.paidUntil is in the past, don't fetch notifications
	// If profile.paidUntil is in the future, fetch notifications

	// For each profile, fetch new notifications
	for (let profile of profiles) {
		if (profile.paidUntil <= new Date()) {
			continue;
		  }
			const newNotifications = await searchNotifications(env, profile.name);																	
			tweets.push(...newNotifications);
		}
	const conn = getPlanetScaleConnection(env)
	const data = [];
	for (let tweet of tweets) {
	  try {
		await conn.execute('INSERT INTO notifications (tweet_id, content, created_at, author_id, actioned, notification_for) VALUES (:tweet_id, :content, :created_at, :author_id, :actioned, :notification_for);', 
		{
		  tweet_id: tweet.tweet_id,
		  content: tweet.content,
		  created_at: tweet.created_at,
		  author_id: tweet.author_id,
		  actioned: tweet.actioned,
		  notification_for: tweet.notification_for
		});
		data.push(tweet);
	  } catch (error) {
		if (error.message && error.message.includes('Duplicate entry')) {
		  data.push('duplicate');
		  continue;
		} else {
		  console.error('An unexpected error occurred:', error);
		  throw error;
		}
	  }
	}
	console.log(data);
  };


  // Catchall
router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.handle,
	scheduled: handleScheduled
  }
  
