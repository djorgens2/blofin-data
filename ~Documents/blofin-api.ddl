CREATE SCHEMA blofin;

CREATE TABLE
	blofin.contract_type (
		contract_type BINARY(3) NOT NULL PRIMARY KEY,
		source_ref VARCHAR(10) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			description VARCHAR(30) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			CONSTRAINT ak_contract_type UNIQUE (source_ref)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.currency (
		currency BINARY(3) NOT NULL PRIMARY KEY,
		symbol VARCHAR(20) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			image_url VARCHAR(300) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs,
			suspense BOOLEAN,
			CONSTRAINT ak_currency UNIQUE (symbol)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.instrument_type (
		instrument_type BINARY(3) NOT NULL PRIMARY KEY,
		source_ref VARCHAR(10) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			description VARCHAR(30) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			CONSTRAINT ak_instrument_type UNIQUE (source_ref)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.period (
		period BINARY(3) NOT NULL PRIMARY KEY,
		timeframe VARCHAR(3) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			description VARCHAR(30) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			CONSTRAINT ak_period UNIQUE (timeframe)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.instrument (
		instrument BINARY(3) NOT NULL PRIMARY KEY,
		base_currency BINARY(3) NOT NULL,
		quote_currency BINARY(3) NOT NULL,
		trade_period BINARY(3),
		interval_period BINARY(3),
		CONSTRAINT ak_instrument UNIQUE (base_currency, quote_currency),
		CONSTRAINT fk_i_base_currency FOREIGN KEY (base_currency) REFERENCES blofin.currency (currency) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_i_interval_period FOREIGN KEY (interval_period) REFERENCES blofin.period (period) ON DELETE RESTRICT ON UPDATE RESTRICT,
		CONSTRAINT fk_i_quote_currency FOREIGN KEY (quote_currency) REFERENCES blofin.currency (currency) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_i_trade_period FOREIGN KEY (trade_period) REFERENCES blofin.period (period) ON DELETE RESTRICT ON UPDATE RESTRICT
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument (quote_currency);

CREATE INDEX fk_i_trade_period ON blofin.instrument (trade_period);

CREATE INDEX fk_i_interval_period ON blofin.instrument (interval_period);

CREATE TABLE
	blofin.instrument_detail (
		instrument BINARY(3) NOT NULL PRIMARY KEY,
		instrument_type BINARY(3) NOT NULL,
		contract_type BINARY(3) NOT NULL,
		contract_value DECIMAL(13, 2) NOT NULL,
		max_leverage INT NOT NULL,
		min_size DECIMAL(5, 3) NOT NULL,
		lot_size DECIMAL(5, 3) NOT NULL,
		tick_size DOUBLE NOT NULL,
		max_limit_size DECIMAL(13, 2) NOT NULL,
		max_market_size DECIMAL(13, 2) NOT NULL,
		list_time DATETIME NOT NULL,
		expiry_time DATETIME NOT NULL,
		CONSTRAINT fk_id_contract_type FOREIGN KEY (contract_type) REFERENCES blofin.contract_type (contract_type) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_id_instrument FOREIGN KEY (instrument) REFERENCES blofin.instrument (instrument) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_id_instrument_type FOREIGN KEY (instrument_type) REFERENCES blofin.instrument_type (instrument_type) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE INDEX fk_id_instrument_type ON blofin.instrument_detail (instrument_type);

CREATE INDEX fk_id_contract_type ON blofin.instrument_detail (contract_type);

CREATE TABLE
	blofin.instrument_period (
		instrument BINARY(3) NOT NULL,
		period BINARY(3) NOT NULL,
		data_collection_rate SMALLINT DEFAULT (0) NOT NULL,
		sma_factor SMALLINT DEFAULT ('0') NOT NULL,
		CONSTRAINT pk_instrument_period PRIMARY KEY (instrument, period),
		CONSTRAINT fk_ip_instrument FOREIGN KEY (instrument) REFERENCES blofin.instrument (instrument) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_ip_period FOREIGN KEY (period) REFERENCES blofin.period (period) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE INDEX fk_ip_period ON blofin.instrument_period (period);

CREATE TABLE
	blofin.candle (
		instrument BINARY(3) NOT NULL,
		period BINARY(3) NOT NULL,
		bar_time DATETIME NOT NULL,
		open DOUBLE NOT NULL,
		high DOUBLE NOT NULL,
		low DOUBLE NOT NULL,
		close DOUBLE NOT NULL,
		volume INT NOT NULL,
		vol_currency INT NOT NULL,
		vol_currency_quote INT NOT NULL,
		completed BOOLEAN NOT NULL,
		CONSTRAINT pk_candle PRIMARY KEY (instrument, period, bar_time),
		CONSTRAINT fk_c_instrument FOREIGN KEY (instrument) REFERENCES blofin.instrument (instrument) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_c_period FOREIGN KEY (period) REFERENCES blofin.period (period) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE INDEX fk_c_period ON blofin.candle (period);

CREATE
OR REPLACE VIEW blofin.vw_candles AS
SELECT
	i.instrument AS instrument,
	CONCAT (b.symbol, '-', q.symbol) AS currency_pair,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	pt.period AS period,
	pt.timeframe AS timeframe,
	c.bar_time,
	UNIX_TIMESTAMP (c.bar_time) AS time,
	c.open AS open,
	c.high AS high,
	c.low AS low,
	c.close AS close,
	c.volume AS volume,
	c.vol_currency AS vol_currency,
	c.vol_currency_quote AS vol_currency_quote,
	c.completed AS completed
FROM
	blofin.instrument i
	JOIN blofin.instrument_period ip
	JOIN blofin.period pt
	JOIN blofin.currency b
	JOIN blofin.currency q
	JOIN blofin.candle c
WHERE
	(
		(c.instrument = i.instrument)
		AND (c.period = pt.period)
		AND (i.base_currency = b.currency)
		AND (i.quote_currency = q.currency)
		AND (i.instrument = ip.instrument)
		AND (ip.period = pt.period)
	);

CREATE
OR REPLACE VIEW blofin.vw_instrument_period_pivot AS
select
	i.instrument AS instrument,
	concat (b.symbol, '-', q.symbol) AS currency_pair,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	'BARS' AS type_def,
	max(
		(
			case
				when (p.timeframe = '1m') then ip.data_collection_rate
			end
		)
	) AS period_1m,
	max(
		(
			case
				when (p.timeframe = '3m') then ip.data_collection_rate
			end
		)
	) AS period_3m,
	max(
		(
			case
				when (p.timeframe = '5m') then ip.data_collection_rate
			end
		)
	) AS period_5m,
	max(
		(
			case
				when (p.timeframe = '15m') then ip.data_collection_rate
			end
		)
	) AS period_15m,
	max(
		(
			case
				when (p.timeframe = '30m') then ip.data_collection_rate
			end
		)
	) AS period_30m,
	max(
		(
			case
				when (p.timeframe = '1H') then ip.data_collection_rate
			end
		)
	) AS period_1h,
	max(
		(
			case
				when (p.timeframe = '2H') then ip.data_collection_rate
			end
		)
	) AS period_2h,
	max(
		(
			case
				when (p.timeframe = '4H') then ip.data_collection_rate
			end
		)
	) AS period_4h,
	max(
		(
			case
				when (p.timeframe = '6H') then ip.data_collection_rate
			end
		)
	) AS period_6h,
	max(
		(
			case
				when (p.timeframe = '8H') then ip.data_collection_rate
			end
		)
	) AS period_8h,
	max(
		(
			case
				when (p.timeframe = '12H') then ip.data_collection_rate
			end
		)
	) AS period_12h,
	max(
		(
			case
				when (p.timeframe = '1D') then ip.data_collection_rate
			end
		)
	) AS period_1d,
	max(
		(
			case
				when (p.timeframe = '3D') then ip.data_collection_rate
			end
		)
	) AS period_3d,
	max(
		(
			case
				when (p.timeframe = '1W') then ip.data_collection_rate
			end
		)
	) AS period_1w,
	max(
		(
			case
				when (p.timeframe = '1M') then ip.data_collection_rate
			end
		)
	) AS period_1mm
from
	(
		(
			blofin.instrument i
			left join blofin.instrument_period ip on ((ip.instrument = i.instrument))
		)
		left join blofin.period p on ((ip.period = p.period))
	)
	join blofin.currency b
	join blofin.currency q
where
	(
		(i.base_currency = b.currency)
		and (i.quote_currency = q.currency)
	)
group by
	i.instrument
union all
select
	i.instrument AS instrument,
	concat (b.symbol, '-', q.symbol) AS currency_pair,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	'SMA' AS type_def,
	max(
		(
			case
				when (p.timeframe = '1m') then ip.sma_factor
			end
		)
	) AS period_1m,
	max(
		(
			case
				when (p.timeframe = '3m') then ip.sma_factor
			end
		)
	) AS period_3m,
	max(
		(
			case
				when (p.timeframe = '5m') then ip.sma_factor
			end
		)
	) AS period_5m,
	max(
		(
			case
				when (p.timeframe = '15m') then ip.sma_factor
			end
		)
	) AS period_15m,
	max(
		(
			case
				when (p.timeframe = '30m') then ip.sma_factor
			end
		)
	) AS period_30m,
	max(
		(
			case
				when (p.timeframe = '1H') then ip.sma_factor
			end
		)
	) AS period_1h,
	max(
		(
			case
				when (p.timeframe = '2H') then ip.sma_factor
			end
		)
	) AS period_2h,
	max(
		(
			case
				when (p.timeframe = '4H') then ip.sma_factor
			end
		)
	) AS period_4h,
	max(
		(
			case
				when (p.timeframe = '6H') then ip.sma_factor
			end
		)
	) AS period_6h,
	max(
		(
			case
				when (p.timeframe = '8H') then ip.sma_factor
			end
		)
	) AS period_8h,
	max(
		(
			case
				when (p.timeframe = '12H') then ip.sma_factor
			end
		)
	) AS period_12h,
	max(
		(
			case
				when (p.timeframe = '1D') then ip.sma_factor
			end
		)
	) AS period_1d,
	max(
		(
			case
				when (p.timeframe = '3D') then ip.sma_factor
			end
		)
	) AS period_3d,
	max(
		(
			case
				when (p.timeframe = '1W') then ip.sma_factor
			end
		)
	) AS period_1w,
	max(
		(
			case
				when (p.timeframe = '1M') then ip.sma_factor
			end
		)
	) AS period_1mm
from
	(
		(
			blofin.instrument i
			left join blofin.instrument_period ip on ((ip.instrument = i.instrument))
		)
		left join blofin.period p on ((ip.period = p.period))
	)
	join blofin.currency b
	join blofin.currency q
where
	(
		(i.base_currency = b.currency)
		and (i.quote_currency = q.currency)
	)
group by
	i.instrument
order by
	currency_pair,
	type_def;

CREATE
OR REPLACE VIEW blofin.vw_instruments AS
SELECT
	i.instrument AS instrument,
	CONCAT (b.symbol, '-', q.symbol) AS currency_pair,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	tp.period AS trade_period,
	tp.timeframe AS trade_timeframe,
	ti.period AS interval_period,
	ti.timeframe AS interval_timeframe,
	IFNULL (ip.data_collection_rate, 0) AS data_collection_rate,
	IFNULL (ip.sma_factor, 0) AS sma_factor,
	id.contract_value AS contract_value,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.lot_size AS lot_size,
	id.tick_size AS tick_size,
	LENGTH (
		SUBSTRING_INDEX (
			CAST(id.tick_size AS CHAR charset utf8mb4),
			'.',
			- (1)
		)
	) + 1 AS digits,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	b.suspense AS suspense
FROM
	(
		(
			(
				blofin.instrument i
				LEFT JOIN blofin.instrument_period ip ON (
					(
						(i.trade_period = ip.period)
						AND (i.instrument = ip.instrument)
					)
				)
			)
			LEFT JOIN blofin.period tp ON ((i.trade_period = tp.period))
		)
		LEFT JOIN blofin.period ti ON ((i.interval_period = ti.period))
	)
	JOIN blofin.instrument_detail id
	JOIN blofin.currency b
	JOIN blofin.currency q
WHERE
	(
		(i.instrument = id.instrument)
		AND (i.base_currency = b.currency)
		AND (i.quote_currency = q.currency)
	);

CREATE
OR REPLACE VIEW blofin.vw_instrument_periods AS
SELECT
	i.instrument AS instrument,
	concat (b.symbol, '-', q.symbol) AS currency_pair,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	p.period AS period,
	p.timeframe AS timeframe,
	ifnull (ip.data_collection_rate, 0) AS data_collection_rate,
	ifnull (ip.sma_factor, 0) AS sma_factor,
	length (
		substring_index (
			cast(id.tick_size AS char charset utf8mb4),
			'.',
			- (1)
		)
	) + 1 AS digits,
	b.suspense AS suspense
from
	blofin.instrument i
	join blofin.instrument_period ip
	join blofin.period p
	join blofin.instrument_detail id
	join blofin.currency b
	join blofin.currency q
where
	(
		(i.instrument = ip.instrument)
		and (i.instrument = id.instrument)
		and (i.base_currency = b.currency)
		and (i.quote_currency = q.currency)
		and (ip.period = p.period)
	);