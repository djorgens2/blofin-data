CREATE OR REPLACE VIEW blofin.vw_instrument_periods AS
select
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_units AS timeframe_units,
	ip.bulk_collection_rate AS bulk_collection_rate,
	if((ip.bulk_collection_rate = 0), 0, if((ip.interval_collection_rate > 4), ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits,
	s.state AS state,
	s.status AS status,
	if((ip.bulk_collection_rate > 0), true, false) AS active_collection,
	b.suspense AS suspense
from
	(((((((blofin.instrument i
join blofin.state s)
join blofin.instrument_period ip)
join blofin.period p)
join blofin.instrument_detail id)
join blofin.currency b)
join blofin.currency q)
join (
	select
		ipts.instrument AS instrument,
		ipts.period AS period,
		if((its.trade_period = ipts.period), its.trade_state, 0x1697fe) AS trade_state
	from
		(blofin.instrument_period ipts
	join blofin.instrument its)
	where
		(ipts.instrument = its.instrument)) tps)
where
	((ip.instrument = i.instrument)
		and (ip.period = p.period)
			and (ip.instrument = tps.instrument)
				and (ip.period = tps.period)
					and (tps.state = s.state)
						and (i.instrument = id.instrument)
							and (i.base_currency = b.currency)
								and (i.quote_currency = q.currency));

CREATE OR REPLACE VIEW blofin.vw_instruments AS
select
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	it.source_ref AS instrument_type,
	ct.source_ref AS contract_type,
	tp.period AS trade_period,
	tp.timeframe AS trade_timeframe,
	tp.timeframe_units AS timeframe_units,
	ip.bulk_collection_rate AS bulk_collection_rate,
	if(((ip.bulk_collection_rate = 0) or (ip.bulk_collection_rate is null)), NULL, if((ip.interval_collection_rate > 4), ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	id.contract_value AS contract_value,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.lot_size AS lot_size,
	id.tick_size AS tick_size,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	id.list_time AS list_time,
	unix_timestamp(id.list_time) AS list_timestamp,
	id.expiry_time AS expiry_time,
	unix_timestamp(id.expiry_time) AS expiry_timestamp,
	s.state AS state,
	s.status AS status,
	b.suspense AS suspense
from
	((((((((blofin.instrument i
left join blofin.instrument_period ip on
	(((i.trade_period = ip.period) and (i.instrument = ip.instrument))))
left join blofin.instrument_detail id on
	((i.instrument = id.instrument)))
left join blofin.instrument_type it on
	((id.instrument_type = it.instrument_type)))
left join blofin.contract_type ct on
	((id.contract_type = ct.contract_type)))
left join blofin.period tp on
	((i.trade_period = tp.period)))
join blofin.state s)
join blofin.currency b)
join blofin.currency q)
where
	((i.state = s.state)
		and (i.base_currency = b.currency)
			and (i.quote_currency = q.currency));

CREATE OR REPLACE VIEW blofin.vw_candles AS
select
	blofin.i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	pt.period AS period,
	pt.timeframe AS timeframe,
	c.bar_time AS bar_time,
	unix_timestamp(c.bar_time) AS timestamp,
	c.open AS open,
	c.high AS high,
	c.low AS low,
	c.close AS close,
	c.volume AS volume,
	c.vol_currency AS vol_currency,
	c.vol_currency_quote AS vol_currency_quote,
	blofin.i.digits AS digits,
	c.completed AS completed
from
	(((((blofin.vw_instruments i
join blofin.instrument_period ip)
join blofin.period pt)
join blofin.currency b)
join blofin.currency q)
join blofin.candle c)
where
	((c.instrument = blofin.i.instrument)
		and (c.period = pt.period)
			and (blofin.i.base_currency = b.currency)
				and (blofin.i.quote_currency = q.currency)
					and (blofin.i.instrument = ip.instrument)
						and (ip.period = pt.period));

CREATE OR REPLACE VIEW blofin.vw_candle_audit AS
select
	blofin.vc.symbol AS symbol,
	cast(date_format(blofin.vc.bar_time, '%Y-%m-%d %k:00:00') as datetime) AS hour,
	count(0) AS samplecount
from
	blofin.vw_candles vc
group by
	blofin.vc.symbol,
	cast(date_format(blofin.vc.bar_time, '%Y-%m-%d %k:00:00') as datetime)
having
	(count(0) < 4)
order by
	blofin.vc.symbol,
	hour desc;

