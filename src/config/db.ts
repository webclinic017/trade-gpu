import dotenv from "dotenv";

const result = dotenv.config()

const json = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  port: process.env.DB_PORT,
}

export default json;