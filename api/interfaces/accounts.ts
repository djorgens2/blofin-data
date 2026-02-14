//+--------------------------------------------------------------------------------------+
//|                                                                   [api]  accounts.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Session } from "module/session";
import { format } from "lib/std.util";

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
//| WSS only feed receives blofin account data and details; apply updates to local db;   |
//+--------------------------------------------------------------------------------------+
export const Publish = async (props: IAccountAPI) => {
  if (props && props.details) {
    await Accounts.Publish({
      account: Session().account,
      total_equity: format(props!.totalEquity, 3),
      isolated_equity: format(props!.isolatedEquity, 3),
      update_time: new Date(parseInt(props!.ts)),
    });

    for (const detail of props.details) {
      const currency = await Currency.Key({ symbol: detail.currency });

      currency &&
        (await Accounts.PublishDetail({
          account: Session().account,
          currency,
          balance: format(detail.balance!, 3),
          available: format(detail.available!, 3),
          currency_equity: format(detail.equity!, 3),
          currency_isolated_equity: format(detail.isolatedEquity!, 3),
          available_equity: format(detail.availableEquity!, 3),
          equity_usd: format(detail.equityUsd!, 3),
          frozen: format(detail.frozen!, 3),
          order_frozen: format(detail.orderFrozen!, 3),
          borrow_frozen: format(detail.borrowFrozen!, 3),
          unrealized_pnl: format(detail.unrealizedPnl!, 3),
          isolated_unrealized_pnl: format(detail.isolatedUnrealizedPnl!, 3),
          coin_usd_price: format(detail.coinUsdPrice!, 6),
          margin_ratio: format(detail.marginRatio!, 3),
          spot_available: format(detail.spotAvailable!, 3),
          liability: format(detail.liability!, 3),
          update_time: new Date(parseInt(detail.ts!)),
        }));
    }
  }
};
