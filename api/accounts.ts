//+--------------------------------------------------------------------------------------+
//|                                                                          accounts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
"use server";

import * as Accounts from "@db/interfaces/account";
import * as Currency from "@db/interfaces/currency";

export interface IAccountAPI {
  ts: string;
  totalEquity: string;
  isolatedEquity: string;
  account: Uint8Array;
  details: [
    {
      currency: string;
      equity: string;
      available: string;
      balance: string;
      ts: string;
      isolatedEquity: string;
      equityUsd: string;
      availableEquity: string;
      frozen: string;
      orderFrozen: string;
      unrealizedPnl: string;
      isolatedUnrealizedPnl: string;
      coinUsdPrice: string;
      marginRatio: string;
      spotAvailable: string;
      liability: string;
      borrowFrozen: string;
    }
  ];
}

//+--------------------------------------------------------------------------------------+
//| Retrieve blofin account data and details; apply updates to local db;                 |
//+--------------------------------------------------------------------------------------+
export async function Update(props: IAccountAPI) {
  const [account] = await Accounts.Fetch({ account: props!.account });

  if (account) {
    Accounts.Update({
      account: props!.account,
      total_equity: parseFloat(props!.totalEquity),
      isolated_equity: parseFloat(props!.isolatedEquity),
      update_time: parseInt(props!.ts),
    });

    for (let id in props.details) {
      const detail = props.details[id];
      const currency = await Currency.Key({ symbol: detail.currency });

      currency &&
        Accounts.UpdateDetail({
          account: props!.account,
          currency,
          balance: parseFloat(detail.balance!),
          equity: parseFloat(detail.equity!),
          isolated_equity: parseFloat(detail.isolatedEquity!),
          available: parseFloat(detail.available!),
          available_equity: parseFloat(detail.availableEquity!),
          equity_usd: parseFloat(detail.equityUsd!),
          frozen: parseFloat(detail.frozen!),
          order_frozen: parseFloat(detail.orderFrozen!),
          borrow_frozen: parseFloat(detail.borrowFrozen!),
          unrealized_pnl: parseFloat(detail.unrealizedPnl!),
          isolated_unrealized_pnl: parseFloat(detail.isolatedUnrealizedPnl!),
          coin_usd_price: parseFloat(detail.coinUsdPrice!),
          margin_ratio: parseFloat(detail.marginRatio!),
          spot_available: parseFloat(detail.spotAvailable!),
          liability: parseFloat(detail.liability!),
          update_time: parseInt(detail.ts!),
        });
    }
  }
}
