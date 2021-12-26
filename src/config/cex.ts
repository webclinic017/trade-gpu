import dotenv from 'dotenv';

var result = dotenv.config();
if (process.env.CONFIG_PATH) {
  result = dotenv.config({ path: process.env.CONFIG_PATH });
}

const json = {
  clientId: process.env.CEX_CLIENT_ID,
  api: process.env.CEX_API,
  secret: process.env.CEX_SECRET,
};

export default json;
