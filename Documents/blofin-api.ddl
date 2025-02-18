CREATE SCHEMA blofin;

DROP TABLE blofin.instrument_period;
DROP TABLE blofin.instrument_detail;
DROP TABLE blofin.candle;
DROP TABLE blofin.contract_type;
DROP TABLE blofin.instrument_type;
DROP TABLE blofin.instrument;
DROP TABLE blofin.period;
DROP TABLE blofin.currency;

CREATE  TABLE blofin.contract_type ( 
	contract_type        BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_contract_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.currency ( 
	currency             BINARY(3)    NOT NULL   PRIMARY KEY,
	symbol               VARCHAR(20)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	image_url            VARCHAR(300)   COLLATE utf8mb4_0900_as_cs    ,
	suspense             BOOLEAN       ,
	CONSTRAINT ak_currency UNIQUE ( symbol ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	base_currency        BINARY(3)    NOT NULL   ,
	quote_currency       BINARY(3)    NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument ( quote_currency );

CREATE  TABLE blofin.instrument_type ( 
	instrument_type      BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_instrument_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.period ( 
	period               BINARY(3)    NOT NULL   PRIMARY KEY,
	timeframe            VARCHAR(3)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_period UNIQUE ( timeframe ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.candle ( 
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	bar_time             DATETIME    NOT NULL   ,
	open                 DOUBLE    NOT NULL   ,
	high                 DOUBLE    NOT NULL   ,
	low                  DOUBLE    NOT NULL   ,
	close                DOUBLE    NOT NULL   ,
	volume               INT    NOT NULL   ,
	vol_currency         INT    NOT NULL   ,
	vol_currency_quote   INT    NOT NULL   ,
	completed            BOOLEAN    NOT NULL   ,
	CONSTRAINT pk_candle PRIMARY KEY ( instrument, period, bar_time ),
	CONSTRAINT fk_c_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_c_period FOREIGN KEY ( period ) REFERENCES blofin.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_c_period ON blofin.candle ( period );

CREATE  TABLE blofin.instrument_detail ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	instrument_type      BINARY(3)    NOT NULL   ,
	contract_type        BINARY(3)    NOT NULL   ,
	contract_value       DECIMAL(13,2)    NOT NULL   ,
	max_leverage         INT    NOT NULL   ,
	min_size             DECIMAL(5,3)    NOT NULL   ,
	lot_size             DECIMAL(5,3)    NOT NULL   ,
	tick_size            DOUBLE    NOT NULL   ,
	max_limit_size       DECIMAL(13,2)    NOT NULL   ,
	max_market_size      DECIMAL(13,2)    NOT NULL   ,
	list_time            DATETIME    NOT NULL   ,
	expiry_time          DATETIME    NOT NULL   ,
	CONSTRAINT fk_id_contract_type FOREIGN KEY ( contract_type ) REFERENCES blofin.contract_type( contract_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES blofin.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_instrument_type ON blofin.instrument_detail ( instrument_type );
CREATE INDEX fk_contract_type ON blofin.instrument_detail ( contract_type );

CREATE  TABLE blofin.instrument_period ( 
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	data_collection_rate SMALLINT  DEFAULT (0)  NOT NULL   ,
	CONSTRAINT pk_instrument_period PRIMARY KEY ( instrument, period ),
	CONSTRAINT fk_ip_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_period FOREIGN KEY ( period ) REFERENCES blofin.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ip_period ON blofin.instrument_period ( period );

-- blofin.vw_active_instruments source
CREATE OR REPLACE VIEW blofin.vw_active_instruments AS
SELECT
	i.instrument,
	CONCAT(b.symbol, '-', q.symbol) AS instrument_pair,
	pt.period,
	pt.timeframe,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	ip.data_collection_rate
FROM
	instrument i,
	instrument_period ip,
	period pt,
	currency b,
	currency q
WHERE
	i.base_currency = b.currency
	AND i.quote_currency = q.currency
	AND i.instrument = ip.instrument
	AND ip.period = pt.period
	AND ip.data_collection_rate != 0
	AND b.suspense = FALSE;

CREATE OR REPLACE VIEW blofin.vw_candles AS
SELECT
	i.instrument,
	CONCAT(b.symbol, '-', q.symbol) AS instrument_pair,
	pt.period,
	pt.timeframe,
	c.bar_time,
	c.open,
	c.high,
	c.low,
	c.close,
	c.volume
FROM
	instrument i,
	instrument_period ip,
	period pt,
	currency b,
	currency q,
	candle c
WHERE
	c.instrument = i.instrument
	AND c.period = pt.period
	AND i.base_currency = b.currency
	AND i.quote_currency = q.currency
	AND i.instrument = ip.instrument
	AND ip.period = pt.period;
