import { IInstrument, IResult } from "./api/instruments";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import db from "mysql2/promise";
import { ICurrency } from "./db/interfaces/currency";

const pool = db.createPool({
    host: 'localhost',
    user: 'blofin_user',
    password: 'blofin123',
    database: 'blofin',
    connectionLimit: 30,
    maxIdle: 10,
  });

  async function Select<T>(Query: string, Fields: Partial<Array<any>>): Promise<Partial<T>[]> {
    const [results] = await pool.execute(Query, Fields);
    return results as T[];
  }
  
  async function Modify(Query: string, Fields: Partial<Array<any>>): Promise<ResultSetHeader> {
    const [results] = await pool.execute(Query, Fields);
    return results as ResultSetHeader;
  }
  
  function SplitSymbol(Symbol: string): string[] {
    const symbols: string[] = Symbol.split('-');
    if (symbols.length === 1) {
        symbols.push('USDT');
    }
    return symbols;
};

async function PublishSymbol(Symbol: string, Suspense: boolean): Promise<number|void> {
    Select<ICurrency>('SELECT * FROM currency WHERE symbol = ?', [Symbol])
        .then((get) => {
            console.log('@get:',get);
            if (get.length === 0) {
                Modify(`INSERT INTO currency (symbol, image_url, suspense) VALUES (?,'./public/images/no-image.png',?)`,[Symbol, Suspense])
                    .then((add) => {
                        console.log('@add',add);
                        return add.insertId;
                    })
                    .catch((error) => {console.log("@Insert",error)})
            }
            else {
                console.log("@getCurrency",get[0].currrency);
                return get[0].currency;
            }})
        .catch ((error) => { console.log('@select',error)});
};

function Publish(Instruments: IInstrument[]) {
    Instruments.forEach(async (instrument) => {
        const symbol: string[] = SplitSymbol(instrument.instId);

        if (instrument.baseCurrency === symbol[0] && instrument.quoteCurrency === symbol[1]) {
            const quote:number|void = await PublishSymbol(instrument.quoteCurrency, false);
            const base:number|void  = await PublishSymbol(instrument.baseCurrency, instrument.state !== 'live');
            console.log("Published", [base, quote]);
        }
    }
)};

function ImportInstruments() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then(response => response.json())
    .then((result: IResult) => Publish(result.data));
};

ImportInstruments();