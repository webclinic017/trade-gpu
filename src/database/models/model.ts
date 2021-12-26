import { Database } from '..';

export default abstract class Model {
  private enabled: boolean = true;

  constructor(protected name: string, public id?: number) {
    this.name = name;
    this.id = id;
  }

  public log(enabled: boolean) {
    this.enabled = !!enabled;
  }

  pairs(): [string, any, boolean?][] {
    throw 'to implement';
  }

  protected setId(id: number): void {
    this.id = id;
  }

  save(database: Database): Promise<Model> {
    return new Promise((resolve, reject) => {
      database.save(
        this.name,
        this.pairs(),
        this.enabled,
        id => {
          this.setId(id);
          resolve(this);
        },
        this.id,
      );
    });
  }
}
