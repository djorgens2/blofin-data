/**
 * Handles incoming account data from the WSS feed.
 *
 * @module accounts
 * @copyright 2018, Dennis Jorgenson
 */

/**
 * Processes and persists account and currency detail updates.
 *
 * @param props - The account data received from the Blofin WSS feed.
 * @returns A promise that resolves once the database sync is complete.
 */
"use strict";

import { Session } from "#module/session";
import { format } from "#lib/std.util";
import { Account, Currency } from "#db";
import { ApiError } from "#api";

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
    },
  ];
}

// -> the envelope -> const subscribe = { op: "subscribe", args: [{ channel: "account" }] };

/**
 * Processes and persists account and currency detail updates.
 * @module accounts
 * @param props - Account data from Blofin WSS.
 * @copyright 2018, Dennis Jorgenson
 */
export const Publish = async (props: IAccountAPI) => {
  if (!props?.details?.length) return;

  const account = Session().account;
  const updateTime = new Date(parseInt(props.ts));

  // 1. Prepare and publish account master;
  await Account.Publish({
    account,
    total_equity: format(props!.totalEquity, 3),
    isolated_equity: format(props!.isolatedEquity, 3),
    update_time: updateTime,
  });

  // 2. Prepare and publish data for account details
  const detailRows = await Promise.all(
    props.details.map(async (d) => {
      const currency = await Currency.Publish({ symbol: d.currency });

      if (!currency.response.success) throw new ApiError(99, "hello");
      const account_currency = Currency.Fetch({ currency: currency?.key?.currency });
      return [
        account,
        currency,
        format(d.balance, 3),
        format(d.available, 3),
        format(d.equity, 3),
        updateTime, // ... add other fields here
      ];
    }),
  );

  for (const detail of props.details) {
    const currency = await Currency.Key({ symbol: detail.currency });

    currency &&
      (await Account.PublishDetail({
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
};
