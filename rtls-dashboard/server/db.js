// server/db.js
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you're NOT using SSL locally, leave this off.
  // If you connect to a remote DB that requires SSL, enable it:
  // ssl: { rejectUnauthorized: false },
});

module.exports = pool;

