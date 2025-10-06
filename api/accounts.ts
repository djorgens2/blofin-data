//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  accounts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Session } from "module/session";

import * as Accounts from "db/interfaces/account";
import * as Currency from "db/interfaces/currency";

export interface IAccountAPI {
  ts: string;
  totalEquity: string;
  isolatedEquity: string;
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
export async function Publish(props: IAccountAPI) {
  const account = await Accounts.Fetch({ account: Session().account });

  if (account) {
    Accounts.Publish({
      account: Session().account,
      total_equity: parseFloat(parseFloat(props!.totalEquity).toFixed(3)),
      isolated_equity: parseFloat(parseFloat(props!.isolatedEquity).toFixed(3)),
      update_time: new Date(parseInt(props!.ts)),
    });

    for (const detail of props.details) {
      const currency = await Currency.Key({ symbol: detail.currency });

      currency &&
        Accounts.PublishDetail({
          account: Session().account,
          currency,
          balance: parseFloat(detail.balance!),
          available: parseFloat(detail.available!),
          currency_equity: parseFloat(detail.equity!),
          currency_isolated_equity: parseFloat(detail.isolatedEquity!),
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
          update_time: new Date(parseInt(detail.ts!)),
        });
    }
  }
}
