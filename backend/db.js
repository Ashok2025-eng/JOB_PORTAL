require("dotenv").config();
const { Pool } = require("pg");

if (typeof process.env.DB_PASSWORD !== "string") {
  throw new Error("❌ DB_PASSWORD must be a string. Check your .env file.");
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

module.exports = pool;


pool.connect()
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.error("Connection failed cannot connect database", err));


  module.exports = pool;