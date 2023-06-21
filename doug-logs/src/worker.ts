import { connect } from '@planetscale/database';
import { withContent, ThrowableRouter, } from 'itty-router-extras';
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
	return connect(config);
}

// Get all notifications
router.get("/", async ({}, env) => {
	const conn = getPlanetScaleConnection(env)
	const data = await conn.execute('SELECT * FROM logs ORDER BY timeStamp DESC LIMIT 50');
	return new Response(JSON.stringify(data.rows), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			// Set CORS headers
			"Access-Control-Allow-Origin": "*", // Or the specific origin you want to allow
			"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
			"Access-Control-Max-Age": "86400",
		}
	})
})

// Catchall
router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.handle,
}
