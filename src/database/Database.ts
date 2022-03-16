import sqlite3 from 'sqlite3';
import { Table } from './Table';
import Model from './models/model';

export interface WhereTuple {
  column: string;
  operator: '=' | '<' | '>';
  value: any;
}

export class Database {
  name: string;

  database: sqlite3.Database;

  constructor(name: string) {
    this.name = name;
    this.database = new sqlite3.Database(name);
  }

  public save(
    name: string,
    pairs: [string, any, boolean?][],
    log: boolean,
    onId?: (id: number) => void,
    id?: number,
  ) {
    log && console.log('saving :: ', id ? 'updating' : 'creating');
    if (id) {
      const update = `UPDATE ${name} SET ${pairs
        .map((p) => `"${p[0]}"=?`)
        .join(',')} WHERE id=${id}`;
      const statement = this.database.prepare(update);

      statement.each(
        pairs.map((p) => p[1]),
        (err: Error, row: any) => {
          log && console.log('updating :: res', row);
          err && console.log('updating :: err', err);
        },
        (err: Error) => {
          console.error('updating error', err);
        },
      );

      statement.finalize();
      onId && onId(id);
    } else {
      const create = `INSERT INTO ${name}`
        + `(${pairs.map((p) => p[0]).join(',')})`
        + ' VALUES '
        + `(${pairs.map((p) => '?').join(',')})`;

      const statement = this.database.prepare(create);

      statement.each(
        pairs.map((p) => p[1]),
        (err: Error, row: any) => {
          log && console.log('updating :: res', row);
          log && console.log('updating :: err', err);
        },
        () => {},
      );

      statement.finalize();

      const lastId = `SELECT MAX(id) as id FROM ${name}`;

      this.database.serialize(() => {
        this.database.each(
          lastId,
          (err, row) => {
            row && row.id && onId && onId(row.id);
          },
          () => {
            /* here ?? */
          },
        );
      });
    }
  }

  public list<TYPE>(
    table: Table,
    create: (row: any) => TYPE,
    where?: WhereTuple[],
  ): Promise<TYPE[]> {
    if (where) {
      return this.executeWhere(
        table,
        table.list(
          where
            ? where.map(({ column, operator }) => ({ column, operator }))
            : undefined,
        ),
        where?.map(({ value }) => value),
        create,
      );
    }

    return new Promise((resolve, reject) => {
      const list: TYPE[] = [];
      this.database.run(table.str());

      this.database.each(
        table.list(),
        (err, row) => {
          list.push(create(row));
        },
        () => resolve(list),
      );
    });
  }

  public lastWhere<TYPE extends Model>(
    table: Table,
    columns: string[],
    values: any[],
    create: (r: any) => TYPE,
  ): Promise<TYPE> {
    return this.executeWhere(table, table.last(columns), values, create).then(
      (results) => {
        const result = results.find((item) => !!item);
        if (!result) throw 'no last item';
        return result;
      },
    );
  }

  private executeWhere<TYPE>(
    table: Table,
    query: string,
    values: any[],
    create: (r: any) => TYPE,
  ): Promise<TYPE[]> {
    return new Promise((resolve, reject) => {
      const result: TYPE[] = [];
      this.database.run(table.str());

      const statement = this.database.prepare(query);

      statement.each(
        values,
        (err: Error, row: any) => {
          result.push(create(row));
        },
        () => resolve(result),
      );

      statement.finalize();
    });
  }

  public last<TYPE extends Model>(
    table: Table,
    create: (r: any) => TYPE,
  ): Promise<TYPE | null> {
    return new Promise((resolve, reject) => {
      let result: TYPE | null = null;
      this.database.run(table.str());

      this.database.each(
        table.last(),
        (err, row) => {
          result = create(row);
        },
        () => resolve(result),
      );
    });
  }

  public add(table: Table): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        this.database.run(table.str());

        table.indexes().forEach((row) => {
          this.database.run(row);
        });
      });

      resolve();
    });
  }
}
