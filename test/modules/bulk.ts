import { IInstrumentAPI, IResult } from "../../api/instruments";
import { Select, Modify, UniqueKey } from "../../db/query.utils";
import { ICurrency } from "../../db/interfaces/currency";
import { IInstrument } from "../../db/interfaces/instrument";
import { splitSymbol } from "../../lib/std.util";
import * as ContractType from "../../db/interfaces/contract_type";
import * as InstrumentType from "../../db/interfaces/instrument_type";
import * as InstrumentDetail from "../../db/interfaces/instrument_detail";

async function PublishCurrency(
  Symbol: string,
  Suspense: boolean
): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(
    `INSERT INTO currency (currency, symbol, image_url, suspense) VALUES (UNHEX(?),?,'./public/images/currency/no-image.png',?) ON DUPLICATE KEY UPDATE suspense=?`,
    [key, Symbol, Suspense, Suspense]
  );
  const get = await Select<ICurrency>(
    "SELECT currency FROM currency WHERE symbol = ?",
    [Symbol]
  );

  return get.length === 0 ? set.insertId : get[0].currency!;
}

async function PublishInstrument(Base: number, Quote: number): Promise<number> {
  const key = UniqueKey(6);
  const set = await Modify(
    `INSERT IGNORE INTO instrument VALUES (UNHEX(?),?,?)`,
    [key, Base, Quote]
  );
  const get = await Select<IInstrument>(
    "SELECT instrument FROM instrument WHERE base_currency = ? AND quote_currency = ?",
    [Base, Quote]
  );

  /*@ts-ignore*/
  return get.length === 0 ? set.insertId : get[0].instrument;
}

function Publish(Instruments: IInstrumentAPI[]) {
  Instruments.forEach(async (item) => {
    const symbol: string[] = splitSymbol(item.instId);
    const base = await PublishCurrency(symbol[0], item.state !== "live");
    const quote = await PublishCurrency(symbol[1], false);
    const contract = await ContractType.Publish(item.contractType);
    const inst_type = await InstrumentType.Publish(item.instType);
    const inst = await PublishInstrument(base, quote);
    const detail = await InstrumentDetail.Publish(
      inst,
      inst_type,
      contract,
      item
    );
    console.log("Published", symbol);
  });
}

function ImportInstruments() {
  fetch(`https://openapi.blofin.com/api/v1/market/instruments`)
    .then((response) => response.json())
    .then((result: IResult) => Publish(result.data));
}

ImportInstruments();
