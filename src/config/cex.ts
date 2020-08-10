import dotenv from "dotenv";

const result = dotenv.config();

const json = {
  clientId: process.env.CEX_CLIENT_ID,
  api: process.env.CEX_API,
  secret: process.env.CEX_SECRET,
}

export default json;