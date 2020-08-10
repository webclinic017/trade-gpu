import { Options } from "./Options";

export class Column {
  public name: string;
  type: string;
  nullable: boolean;
  public index: boolean;
  public increment: boolean;

  constructor(name: string, type: string, options?: Options) {
    this.name = name;
    this.type = type;
    this.nullable = !!(options?.nullable);
    this.index = !!(options?.index);
    this.increment = !!(options?.increment);
  }

  public str() {
    const nullable = this.nullable ? "NULL" : "NOT NULL";
    if(this.increment) return `${this.name} ${this.type} PRIMARY KEY AUTOINCREMENT`;
    return `${this.name} ${this.type} ${nullable}`;
  }
}