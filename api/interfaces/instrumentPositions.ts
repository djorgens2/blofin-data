//+--------------------------------------------------------------------------------------+
//|                                                        [api]  instrumentPositions.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult, IInstrumentAPI, ILeverageAPI } from "#api";
import type { IInstrumentPosition } from "#db";

import { hasValues } from "#lib/std.util";

import { Account, Instrument, InstrumentPosition } from "#db";
import { Leverages, Instruments } from "#api";
import { Session } from "#module/session";

export type TInstrumentLeverage = ILeverageAPI & Partial<IInstrumentAPI>;

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| function to create batches of instruments (e.g., 20; max limit set by broker)          |
//+----------------------------------------------------------------------------------------+
const createBatches = (props: Array<Partial<IInstrumentAPI>>, batchSize = 20) => {
  const batches = [];
  for (let i = 0; i < props.length; i += batchSize) {
    batches.push(props.slice(i, i + batchSize));
  }
  return batches;
};

//+----------------------------------------------------------------------------------------+
//| Merges leverage data with account-specific instrument data;                            |
//+----------------------------------------------------------------------------------------+
const merge = (instruments: Partial<IInstrumentAPI>[], leverages: ILeverageAPI[]): TInstrumentLeverage[] => {
  const instrumentMap = new Map<string, Partial<IInstrumentAPI>>();
  for (const item of instruments) {
    item.instId && instrumentMap.set(item.instId, item);
  }

  const mergedData: TInstrumentLeverage[] = leverages.map((leverageItem) => {
    const matchingInstrument = instrumentMap.get(leverageItem.instId);
    if (!matchingInstrument) {
      console.warn(`No matching instrument found for instId: ${leverageItem.instId}`);
    }

    return {
      ...(matchingInstrument || {}),
      ...leverageItem,
    };
  });

  return mergedData;
};

//+--------------------------------------------------------------------------------------+
//| Updates instrument positions for the logged account;                                 |
//+--------------------------------------------------------------------------------------+
const publish = async (props: Array<TInstrumentLeverage>): Promise<Array<IPublishResult<IInstrumentPosition>>> => {
  if (hasValues(props)) {
    const results = (
      await Promise.all(
        props.map(async (prop) => {
          const instrument = await Instrument.Key({ symbol: prop.instId });
          if (!instrument) return undefined;

          const instrument_position: Partial<IInstrumentPosition> = {
            account: Session().account,
            instrument,
            position: prop.positionSide,
            leverage: parseInt(prop.leverage),
            update_time: new Date(),
          };
          return InstrumentPosition.Publish(instrument_position);
        }),
      )
    ).filter((r): r is IPublishResult<IInstrumentPosition> => !!r);

    return results;
  }
  return [] as Array<IPublishResult<IInstrumentPosition>>;
};

//------------------ Public functions ---------------------//

// +----------------------------------------------------------------------------------------+
// | Retrieves, validates, and updates local db with instrument position data from the API  |
// +----------------------------------------------------------------------------------------+
export const Import = async () => {
  const instruments = await Instruments.Fetch();

  if (instruments) {
    console.log("-> Instrument.Position.Import [API]");

    const [{ margin_mode }] = (await Account.Fetch({ account: Session().account })) ?? [];
    const batches = createBatches(instruments, Session().leverage_max_fetch);
    const merged = batches.map(async (batch) => {
      const symbols: string = batch.map((i: Partial<IInstrumentAPI>) => i.instId).join(",");
      const leverages = ((await Leverages.Import([{ symbol: symbols, margin_mode }])) as Array<ILeverageAPI>) ?? [];
      return merge(batch, leverages);
    });

    const positions = await Promise.all(merged);
    const results = await publish(positions.flat() satisfies Array<TInstrumentLeverage>);
    return results;
  }
};
