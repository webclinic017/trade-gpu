import http from 'http';
import https from 'https';
import express, { Express } from 'express';
import fs from 'fs';
import dgram from 'dgram';
import moment from 'moment';
import { Runner } from '../runner';
import config from '../config/server';
import WalletAggregation from './WalletAggregation';

interface MonthData {
  [month: number]: WalletAggregation;
}

interface YearData {
  [year: number]: MonthData;
}

interface ExchangeData {
  [exchange: string]: YearData;
}

function getOrSet(
  data: ExchangeData,
  exchange: string,
  month: number,
  year: number,
) {
  if (!data[exchange]) data[exchange] = {};
  const holder = data[exchange];
  if (!holder[year]) holder[year] = {};
  if (!holder[year][month]) holder[year][month] = new WalletAggregation(exchange, month, year);
  return holder[year][month];
}

export class Server {
  private data: ExchangeData = {};

  private server: https.Server | http.Server;

  private datagram_server: dgram.Socket;

  private app: Express;

  private key?: any;

  private cert?: any;

  constructor(private runner: Runner) {
    this.app = express();

    this.key = config.key ? fs.readFileSync(config.key) : undefined;
    this.cert = config.cert ? fs.readFileSync(config.cert) : undefined;

    if (!config.https) {
      this.server = https.createServer(
        { key: this.key, cert: this.cert },
        this.app,
      );
    } else {
      this.server = http.createServer(this.app);
    }

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

    this.app.get('/wallets/:month/:year', async (req, res) => {
      try {
        const month = Number.parseInt(req?.params?.month) - 1;
        const year = Number.parseInt(req?.params?.year);

        const currentYear = moment().year();
        if (month < 0 || month > 11) throw `invalid month : ${month}`;
        if (Math.abs(year - currentYear) > 10) throw `invalid year : ${year}`;

        const aggregat = getOrSet(this.data, runner.exchange(), month, year);

        await aggregat.load(runner);
        res.json(aggregat.json());
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
