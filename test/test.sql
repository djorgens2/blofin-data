create or replace view blofin.vw_orders as
select
o.client_order_id as client_order_id,
o.account as account,
o.instrument as instrument,
o.order_id as order_id,
o.price as price,
o.size as size,
ot.source_ref as order_type,
o.action as action,
o.bias as bias,
o.margin_mode as margin_mode,
o.filled_size as filled_size,
o.filled_amount as filled_amount,
o.average_price as average_price,
os.source_ref as state,
o.leverage as leverage,
o.fee as fee,
o.pnl as pnl,
can.source_ref as cancel_source,
cat.source_ref as order_category,
o.create_time as create_time,
o.update_time as update_time,
o.reduce_only as reduce_only,
o.broker_id as broker_id,
	tp.trigger_price as tp_trigger_price,
	tp.order_price as tp_order_price,
	tp.price_type as tp_price_type,
	sl.trigger_price as sl_trigger_price,
	sl.order_price as sl_order_price,
	sl.price_type as sl_price_type,
i.symbol as symbol,
i.base_currency as base_currency,
i.base_symbol as base_symbol,
i.quote_currency as quote_currency,
i.quote_symbol as quote_symbol,
i.instrument_type as instrument_type,
i.contract_type as contract_type,
i.trade_period as trade_period,
i.trade_timeframe as trade_timeframe,
i.timeframe_units as timeframe_units,
i.bulk_collection_rate as bulk_collection_rate,
i.interval_collection_rate as interval_collection_rate,
i.sma_factor as sma_factor,
i.contract_value as contract_value,
i.max_leverage as max_leverage,
i.min_size as min_size,
i.lot_size as lot_size,
i.tick_size as tick_size,
i.digits as digits,
i.max_limit_size as max_limit_size,
i.max_market_size as max_market_size,
i.list_time as list_time,
i.list_timestamp as list_timestamp,
i.expiry_time as expiry_time,
i.expiry_timestamp as expiry_timestamp,
i.trade_state as trade_state,
i.trade_status as trade_status,
i.suspense as suspense
from
	blofin.orders o
       left join blofin.triggers tp on
	     (o.client_order_id = tp.client_order_id)
       left join blofin.category ctp on
        (tp.category = ctp.category
		  AND ctp.source_ref = 'tp')
left join blofin.triggers sl on
	(o.client_order_id = sl.client_order_id)
left join blofin.category csl on
	(sl.category = csl.category
		AND csl.source_ref = 'sl')
join blofin.order_type ot
join blofin.order_state os
join blofin.cancel can
join blofin.category cat
join blofin.vw_instruments i
where
	o.order_type = ot.order_type
	and o.instrument = i.instrument
	and o.state = os.order_state
	and o.cancel_source = can.cancel
	and o.order_category = cat.category;

