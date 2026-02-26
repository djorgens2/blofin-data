/**
 * Handles incoming account and balance data from the WebSocket (WSS) feed.
 * 
 * This module is responsible for:
 * 1. Synchronizing global account equity levels.
 * 2. Iterating through sub-account/currency details.
 * 3. Ensuring currency metadata exists via {@link Currency.Publish}.
 * 4. Persisting granular balance, margin, and PnL data per asset.
 * 
 * @module accounts
 * @copyright 2018-2026, Dennis Jorgenson
 */

"use strict";

import { Session } from "#module/session";
import { format } from "#lib/std.util";
import { Account, Currency } from "#db";
import { ApiError } from "#api";

/**
 * Raw account data structure received from the Blofin API/WSS.
 */
export interface IAccountAPI {
  /** Timestamp in milliseconds from the exchange. */
  ts: string;
  /** Combined equity of the entire account in USD. */
  totalEquity: string;
  /** Equity specifically allocated to isolated margin positions. */
  isolatedEquity: string;
  /** Individual asset balances and risk metrics. */
  details: [
    {
      /** Asset symbol (e.g., "BTC", "USDT"). */
      currency: string;
      /** Total equity for this specific coin. */
      equity: string;
      /** Funds available for new orders. */
      available: string;
      /** Total balance including frozen/margin funds. */
      balance: string;
      /** Timestamp for this specific asset update. */
      ts: string;
      isolatedEquity: string;
      equityUsd: string;
      availableEquity: string;
      /** Funds currently locked in active orders or margin. */
      frozen: string;
      orderFrozen: string;
      /** Floating profit/loss for open positions in this asset. */
      unrealizedPnl: string;
      isolatedUnrealizedPnl: string;
      /** Current market price of the coin in USD. */
      coinUsdPrice: string;
      /** Current margin health ratio. */
      marginRatio: string;
      /** Funds available for spot trading. */
      spotAvailable: string;
      /** Total debt/borrowing for this asset. */
      liability: string;
      borrowFrozen: string;
    },
  ];
}

/**
 * Processes and persists high-frequency account and currency detail updates.
 * 
 * This function performs a multi-step sync:
 * - Updates the master `Account` record with aggregate equity.
 * - Validates currency existence; if a new coin is detected, it is auto-provisioned.
 * - Iterates through each detail record to update granular balance and risk metrics 
 *   via `Account.PublishDetail`.
 * 
 * @param props - Raw account data payload from the Blofin WSS stream.
 * @returns A promise that resolves once all database operations are complete.
 * @throws {ApiError} 404 if a currency in the payload cannot be found or initialized.
 */
export const Publish = async (props: IAccountAPI): Promise<void> => {
  if (!props?.details?.length) return;

  const account = Session().account;
  const updateTime = new Date(parseInt(props.ts));

  // 1. Prepare and publish account master
  await Account.Publish({
    account,
    total_equity: format(props!.totalEquity, 3),
    isolated_equity: format(props!.isolatedEquity, 3),
    update_time: updateTime,
  });

  // 2. Validate Currencies
  // Note: We use Promise.all to verify all currencies exist before proceeding to detail updates.
  await Promise.all(
    props.details.map(async (d) => {
      const currency = await Currency.Publish({ symbol: d.currency });
      if (!currency.response.success) {
        throw new ApiError(404, "Account.Publish.WSS: Currency not found", { symbol: d.currency });
      }
    }),
  );

  // 3. Persist individual asset details
  for (const detail of props.details) {
    const currency = await Currency.Key({ symbol: detail.currency });

    if (currency) {
      await Account.PublishDetail({
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
      });
    }
  }
};
