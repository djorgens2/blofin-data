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
			timeframe_units INT NOT NULL,
			CONSTRAINT ak_period UNIQUE (timeframe)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.trade_state (
		trade_state BINARY(3) NOT NULL PRIMARY KEY,
		state VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL,
		description VARCHAR(30) CHARACTER
		SET
			utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
			CONSTRAINT ak_trade_state UNIQUE (state)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE TABLE
	blofin.instrument (
		instrument BINARY(3) NOT NULL PRIMARY KEY,
		base_currency BINARY(3) NOT NULL,
		quote_currency BINARY(3) NOT NULL,
		trade_period BINARY(3),
		trade_state BINARY(3) DEFAULT (0x1697FE) NOT NULL,
		CONSTRAINT ak_instrument UNIQUE (base_currency, quote_currency),
		CONSTRAINT fk_i_base_currency FOREIGN KEY (base_currency) REFERENCES blofin.currency (currency) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_i_quote_currency FOREIGN KEY (quote_currency) REFERENCES blofin.currency (currency) ON DELETE NO ACTION ON UPDATE NO ACTION,
		CONSTRAINT fk_i_trade_period FOREIGN KEY (trade_period) REFERENCES blofin.period (period) ON DELETE RESTRICT ON UPDATE RESTRICT,
		CONSTRAINT fk_i_trade_state FOREIGN KEY (trade_state) REFERENCES blofin.trade_state (trade_state) ON DELETE NO ACTION ON UPDATE NO ACTION
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument (quote_currency);

CREATE INDEX fk_i_trade_period ON blofin.instrument (trade_period);

CREATE INDEX fk_i_trade_state ON blofin.instrument (trade_state);

CREATE TABLE
	blofin.instrument_detail (
		instrument BINARY(3) NOT NULL PRIMARY KEY,
		instrument_type BINARY(3) NOT NULL,
		contract_type BINARY(3) NOT NULL,
		contract_value DECIMAL(17, 5) NOT NULL,
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
		bulk_collection_rate SMALLINT DEFAULT ('0') NOT NULL,
		interval_collection_rate SMALLINT DEFAULT (0) NOT NULL,
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
	CONCAT (b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	pt.period AS period,
	pt.timeframe AS timeframe,
	c.bar_time,
	UNIX_TIMESTAMP (c.bar_time) AS timestamp,
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
OR REPLACE VIEW blofin.vw_instruments AS
SELECT
	i.instrument AS instrument,
	CONCAT (b.symbol, '-', q.symbol) AS symbol,
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
    IF(ip.bulk_collection_rate=0, 0, if(ip.interval_collection_rate>4, ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	id.contract_value AS contract_value,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.lot_size AS lot_size,
	id.tick_size AS tick_size,
	LENGTH (SUBSTRING_INDEX (CAST(id.tick_size AS CHAR charset utf8mb4),'.',- (1))) + 1 AS digits,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	id.list_time AS list_time,
	UNIX_TIMESTAMP (id.list_time) AS list_timestamp,
	id.expiry_time AS expiry_time,
	UNIX_TIMESTAMP (id.expiry_time) AS expiry_timestamp,
	ts.trade_state AS trade_state,
	ts.state AS state,
	b.suspense AS suspense
FROM
    blofin.instrument i
	LEFT JOIN blofin.instrument_period ip ON (i.trade_period = ip.period AND i.instrument = ip.instrument)
	LEFT JOIN blofin.instrument_detail id ON (i.instrument = id.instrument)
	LEFT JOIN blofin.instrument_type it ON (id.instrument_type = it.instrument_type)
	LEFT JOIN blofin.contract_type ct ON (id.contract_type = ct.contract_type)
	LEFT JOIN blofin.period tp ON ((i.trade_period = tp.period))
	JOIN blofin.trade_state ts
	JOIN blofin.currency b
	JOIN blofin.currency q
WHERE
		(i.trade_state = ts.trade_state)
		AND (i.base_currency = b.currency)
		AND (i.quote_currency = q.currency);

CREATE
OR REPLACE VIEW blofin.vw_instrument_periods AS
SELECT
	i.instrument AS instrument,
	CONCAT (b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_units AS timeframe_units,
	ip.bulk_collection_rate AS bulk_collection_rate,
    IF(ip.bulk_collection_rate=0, 0, if(ip.interval_collection_rate>4, ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	LENGTH (SUBSTRING_INDEX (CAST(id.tick_size AS CHAR charset utf8mb4),'.',- (1))) + 1 AS digits,
	ts.trade_state AS trade_state,
	ts.state AS state,
	IF(ip.bulk_collection_rate>0, true, false) AS active_collection,
	b.suspense AS suspense
FROM
	blofin.instrument i
	JOIN blofin.trade_state ts
	JOIN blofin.instrument_period ip
	JOIN blofin.period p
	JOIN blofin.instrument_detail id
	JOIN blofin.currency b
	JOIN blofin.currency q
	JOIN (
	       SELECT ipts.instrument,
                  ipts.period,
                  IF(its.trade_period=ipts.period,its.trade_state,x'1697fe') AS trade_state
             FROM
                  blofin.instrument_period ipts
             JOIN blofin.instrument its
            WHERE ipts.instrument=its.instrument
         ) tps
WHERE
	(
		(ip.instrument=i.instrument)
		AND (ip.period = p.period)
		AND (ip.instrument = tps.instrument)
		AND (ip.period= tps.period)
		AND (tps.trade_state = ts.trade_state)
		AND (i.instrument = id.instrument)
		AND (i.base_currency = b.currency)
		AND (i.quote_currency = q.currency)
	);
