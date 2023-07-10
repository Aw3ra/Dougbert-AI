import { connect } from '@planetscale/database';
async function connectToPlanetScale(env) {
	const config = {
		host: env.DATABASE_HOST,
		username: env.DATABASE_USERNAME,
		password: env.DATABASE_PASSWORD,
		fetch: (url, init) => {
			delete (init)["cache"];
			return fetch(url, init);
		}
	};
	const conn = connect(config);
	return conn;
}

export async function getTweet(env, query) {
    const conn = await connectToPlanetScale(env);
    const data = await conn.execute
	(
		`SELECT *
		FROM notifications
		WHERE notification_for = ? AND actioned = false
		ORDER BY created_at DESC
		LIMIT 10;`,
		[query]
	);
    // If the query returns no results, return undefined
	if (data.rows.length == 0) {
		return undefined;
	}
	// Otherwise, return a random row from the results
	return data.rows[Math.floor(Math.random() * data.rows.length)];
}

export async function updateReplied(env, tweetId) {
	const conn = await connectToPlanetScale(env);
	try{
		const data = await conn.execute
		(
			`UPDATE notifications
			SET actioned = true
			WHERE tweet_id = ?;`,
			[tweetId]
		);
	}
	catch (error) {
		console.log(error);
	}
}

export async function addLog(env, tweetId, action, tweetText, name) {
	const conn = await connectToPlanetScale(env);
	// Convert actions to a string, with a comma between each action and each action converted to it's related word
	action = action.map((action) => {
		switch (action) {
			case 'A':
				return 'Like';
			case 'B':
				return 'Retweet';
			case 'C':
				return 'Reply';
			case 'D':
				return 'Follow';
			case 'E':
				return 'Unfollow';
			case 'F':
				return 'Block';
			case 'G':
				return 'Mute';
			case 'H':
				return 'Report';
			case 'Z':
				return 'Ignore';
			default:
				return 'Unknown';
		}
	}).join(', ');
	try{
		// Create a new timestamp with the datetime property
		const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
		// Try to add a log for it, if one already exists return undefined
		const data = await conn.execute
		(
			`INSERT INTO logs (tweetId, actions, timeStamp, tweetText, twitterName)
			VALUES (?, ?, ?, ?, ?);`,
			[tweetId+"+"+name, action, timestamp, tweetText, name]
		);
		return true;
	}
	catch (error) {
		console.log(error);
		return false;
	}
}

export async function getProfiles(env) {
	const conn = await connectToPlanetScale(env);
	const data = await conn.execute
	(
		`SELECT *
		FROM profiles;`
	);
	return data.rows;
}

export async function updateReplyTime (env, profile) {
	const conn = await connectToPlanetScale(env);
	// If replyTime and currentReplyTime are the same, reset currentReplyTime to 0
	if (profile.currentReplyTime >= profile.replyTime) {
		const data = await conn.execute
		(
			`UPDATE profiles
			SET currentReplyTime = 0
			WHERE name = ?;`,
			[profile.name]
		);
		return;
	}
	// Add 2 to the currentReplyTime of the profile
	const data = await conn.execute
	(
		`UPDATE profiles
		SET currentReplyTime = currentReplyTime + 2
		WHERE name = ?;`,
		[profile.name]
	);
}
