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

CREATE OR REPLACE
VIEW blofin.vw_candles AS
SELECT
	i.instrument AS instrument,
	CONCAT(b.symbol, '-', q.symbol) AS instrument_pair,
    b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	pt.period AS period,
	pt.timeframe AS timeframe,
	c.bar_time,
	UNIX_TIMESTAMP(c.bar_time) AS time,
	c.open,
	c.high,
	c.low,
	c.close,
	c.volume,
	c.vol_currency,
	c.vol_currency_quote,
	c.completed
FROM
	blofin.instrument i,
    blofin.instrument_period ip,
    blofin.period pt,
    blofin.currency b,
    blofin.currency q,
    blofin.candle c
WHERE
	    c.instrument = i.instrument
	AND c.period = pt.period
	AND i.base_currency = b.currency
	AND i.quote_currency = q.currency
	AND i.instrument = ip.instrument
	AND ip.period = pt.period;

CREATE VIEW
	blofin.vw_instrument_periods AS
select
	`i`.`instrument` AS `instrument`,
	concat (`b`.`symbol`, '-', `q`.`symbol`) AS `currency_pair`,
	`b`.`currency` AS `base_currency`,
	`b`.`symbol` AS `base_symbol`,
	`q`.`currency` AS `quote_currency`,
	`q`.`symbol` AS `quote_symbol`,
	'BARS' AS `type_def`,
	max(
		(
			case
				when (`p`.`timeframe` = '1m') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_1m`,
	max(
		(
			case
				when (`p`.`timeframe` = '3m') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_3m`,
	max(
		(
			case
				when (`p`.`timeframe` = '5m') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_5m`,
	max(
		(
			case
				when (`p`.`timeframe` = '15m') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_15m`,
	max(
		(
			case
				when (`p`.`timeframe` = '30m') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_30m`,
	max(
		(
			case
				when (`p`.`timeframe` = '1H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_1h`,
	max(
		(
			case
				when (`p`.`timeframe` = '2H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_2h`,
	max(
		(
			case
				when (`p`.`timeframe` = '4H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_4h`,
	max(
		(
			case
				when (`p`.`timeframe` = '6H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_6h`,
	max(
		(
			case
				when (`p`.`timeframe` = '8H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_8h`,
	max(
		(
			case
				when (`p`.`timeframe` = '12H') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_12h`,
	max(
		(
			case
				when (`p`.`timeframe` = '1D') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_1d`,
	max(
		(
			case
				when (`p`.`timeframe` = '3D') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_3d`,
	max(
		(
			case
				when (`p`.`timeframe` = '1W') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_1w`,
	max(
		(
			case
				when (`p`.`timeframe` = '1M') then `ip`.`data_collection_rate`
			end
		)
	) AS `period_1mm`
from
	(
		(
			`blofin`.`instrument` `i`
			left join `blofin`.`instrument_period` `ip` on ((`ip`.`instrument` = `i`.`instrument`))
		)
		left join `blofin`.`period` `p` on ((`ip`.`period` = `p`.`period`))
	)
	join `blofin`.`currency` `b`
	join `blofin`.`currency` `q`
where
	(
		(`i`.`base_currency` = `b`.`currency`)
		and (`i`.`quote_currency` = `q`.`currency`)
	)
group by
	`i`.`instrument`
union all
select
	`i`.`instrument` AS `instrument`,
	concat (`b`.`symbol`, '-', `q`.`symbol`) AS `currency_pair`,
	`b`.`currency` AS `base_currency`,
	`b`.`symbol` AS `base_symbol`,
	`q`.`currency` AS `quote_currency`,
	`q`.`symbol` AS `quote_symbol`,
	'SMA' AS `type_def`,
	max(
		(
			case
				when (`p`.`timeframe` = '1m') then `ip`.`sma_factor`
			end
		)
	) AS `1m`,
	max(
		(
			case
				when (`p`.`timeframe` = '3m') then `ip`.`sma_factor`
			end
		)
	) AS `3m`,
	max(
		(
			case
				when (`p`.`timeframe` = '5m') then `ip`.`sma_factor`
			end
		)
	) AS `5m`,
	max(
		(
			case
				when (`p`.`timeframe` = '15m') then `ip`.`sma_factor`
			end
		)
	) AS `15m`,
	max(
		(
			case
				when (`p`.`timeframe` = '30m') then `ip`.`sma_factor`
			end
		)
	) AS `30m`,
	max(
		(
			case
				when (`p`.`timeframe` = '1H') then `ip`.`sma_factor`
			end
		)
	) AS `1h`,
	max(
		(
			case
				when (`p`.`timeframe` = '2H') then `ip`.`sma_factor`
			end
		)
	) AS `2h`,
	max(
		(
			case
				when (`p`.`timeframe` = '4H') then `ip`.`sma_factor`
			end
		)
	) AS `4h`,
	max(
		(
			case
				when (`p`.`timeframe` = '6H') then `ip`.`sma_factor`
			end
		)
	) AS `6h`,
	max(
		(
			case
				when (`p`.`timeframe` = '8H') then `ip`.`sma_factor`
			end
		)
	) AS `8h`,
	max(
		(
			case
				when (`p`.`timeframe` = '12H') then `ip`.`sma_factor`
			end
		)
	) AS `12h`,
	max(
		(
			case
				when (`p`.`timeframe` = '1D') then `ip`.`sma_factor`
			end
		)
	) AS `1d`,
	max(
		(
			case
				when (`p`.`timeframe` = '3D') then `ip`.`sma_factor`
			end
		)
	) AS `3d`,
	max(
		(
			case
				when (`p`.`timeframe` = '1W') then `ip`.`sma_factor`
			end
		)
	) AS `1w`,
	max(
		(
			case
				when (`p`.`timeframe` = '1M') then `ip`.`sma_factor`
			end
		)
	) AS `1mm`
from
	(
		(
			`blofin`.`instrument` `i`
			left join `blofin`.`instrument_period` `ip` on ((`ip`.`instrument` = `i`.`instrument`))
		)
		left join `blofin`.`period` `p` on ((`ip`.`period` = `p`.`period`))
	)
	join `blofin`.`currency` `b`
	join `blofin`.`currency` `q`
where
	(
		(`i`.`base_currency` = `b`.`currency`)
		and (`i`.`quote_currency` = `q`.`currency`)
	)
group by
	`i`.`instrument`
order by
	`currency_pair`,
	`type_def`;

CREATE
OR REPLACE VIEW blofin.vw_instruments AS
SELECT distinct
	i.instrument,
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
	id.contract_value,
	id.max_leverage,
	id.min_size,
	id.lot_size,
	id.tick_size,
	LENGTH (
		SUBSTRING_INDEX (CAST(id.tick_size AS CHAR), '.', -1)
	) AS 'precision',
	id.max_limit_size,
	id.max_market_size,
	b.suspense
FROM
	instrument i
	LEFT JOIN instrument_period ip ON (
		i.trade_period = ip.period
		AND i.instrument = ip.instrument
	)
	LEFT JOIN period tp ON (i.trade_period = tp.period)
	LEFT JOIN period ti ON (i.interval_period = ti.period),
	instrument_detail id,
	currency b,
	currency q
WHERE
	i.instrument = id.instrument
	AND i.base_currency = b.currency
	AND i.quote_currency = q.currency;