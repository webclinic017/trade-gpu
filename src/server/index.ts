import https from 'https';
import express, { Express } from 'express';
import { Runner } from '../runner';

export class Server {
  private server: https.Server;

  private app: Express;

  constructor(private runner: Runner) {
    this.app = express();

    this.server = https.createServer(this.app);

    this.app.get('/orders', async (req, res) => {
      try {
        const orders = runner.orders();
        res.json(orders);
      } catch (err) {
        res.status(500).json({ err: `${err}` });
      }
    });
  }

  public start() {
    this.server.listen(443, () => console.log('listening on port 443'));
  }
}
