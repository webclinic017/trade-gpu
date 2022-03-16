import https from 'https';
import express, { Express } from 'express';
import fs from 'fs';
import dgram from 'dgram';
import { Runner } from '../runner';
import config from '../config/server';

export class Server {
  private server: https.Server;

  private datagram_server: dgram.Socket;

  private app: Express;

  private key?: any;

  private cert?: any;

  constructor(private runner: Runner) {
    this.app = express();

    this.key = config.key ? fs.readFileSync(config.key) : undefined;
    this.cert = config.cert ? fs.readFileSync(config.cert) : undefined;

    this.server = https.createServer(
      { key: this.key, cert: this.cert },
      this.app,
    );

    this.app.get('/orders', async (req, res) => {
      try {
        const orders = await runner.orders();
        res.json(
          orders.map(({ from, to, orders }) => ({
            from,
            to,
            orders: orders.map((o) => o.json()),
          })),
        );
      } catch (err) {
        res.status(500).json({ err: `${err}` });
      }
    });

    this.app.get('/wallets', async (req, res) => {
      try {
        const wallets = await runner.wallets();
        res.json(wallets.map((w) => w.json()));
      } catch (err) {
        res.status(500).json({ err: `${err}` });
      }
    });

    this.datagram_server = dgram.createSocket('udp4');
    this.datagram_server.on('message', (message: string, rinfo) => {
      try {
        const json = JSON.parse(message);
        if (json.discover) {
          const answer = {
            service: 'trader',
            data: {
              port: config.port,
              cert: this.cert?.toString(),
            },
          };

          const message = Buffer.from(JSON.stringify(answer));
          console.log(`send replay to ${rinfo.address} ${rinfo.port}`);
          this.datagram_server.send(
            message,
            0,
            message.length,
            rinfo.port,
            rinfo.address,
          );
        }
      } catch (e) {
        console.log(e);
      }
    });

    this.datagram_server.on('listening', () => {
      const address: any = this.datagram_server.address();
      console.log(`server listening ${address.address}:${address.port}`);
    });
  }

  public start() {
    this.server.listen(config.port, () => console.log(`listening on port ${config.port}`));
    this.datagram_server.bind(1732);
  }
}
