import { connect } from "@planetscale/database";


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

//   Function to return the oldest notification from the notifications table that has an actioned value of false AND a notification_for value of the query
async function handleScheduled(env, query) {
	const conn = getPlanetScaleConnection(env);
	try {
	  const { results } = await conn.query(
		`SELECT * FROM notifications WHERE actioned = false AND notification_for = '${query}' ORDER BY created_at ASC LIMIT 1`
	  );
	  return results;
	} catch (error) {
	  console.error(error);
	  throw error;
	} finally {
	  await conn.end();
	}

}
// Export a default object containing event handlers
export default {
	fetch: handleScheduled,
	scheduled: handleScheduled
};
