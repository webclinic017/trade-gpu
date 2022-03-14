import dotenv from 'dotenv';

let result = dotenv.config();
if (process.env.CONFIG_PATH) {
  result = dotenv.config({ path: process.env.CONFIG_PATH });
}

const json = {
  key: process.env.SERVER_KEY,
  cert: process.env.SERVER_CERT,
  port: parseInt(process.env.SERVER_PORT || '443'),
};

if (Number.isNaN(json.port)) json.port = 443;

export default json;
