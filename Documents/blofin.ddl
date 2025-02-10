CREATE SCHEMA blofin;

DROP TABLE blofin.instrument_period;
DROP TABLE blofin.instrument_detail;
DROP TABLE blofin.candle;
DROP TABLE blofin.contract_type;
DROP TABLE blofin.instrument_type;
DROP TABLE blofin.instrument;
DROP TABLE blofin.period_type;
DROP TABLE blofin.currency;

CREATE  TABLE blofin.period_type (
	period_type          BINARY(3)       NOT NULL   PRIMARY KEY,
	period               VARCHAR(3)      NOT NULL   ,
	description          VARCHAR(30)     NOT NULL   ,
	CONSTRAINT ak_period_type UNIQUE (period)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.currency (
	currency             BINARY(3)       NOT NULL   PRIMARY KEY,
	symbol               VARCHAR(20)     NOT NULL   ,
	image_url			 VARCHAR(300)               ,
    suspense             BOOLEAN                    ,
	CONSTRAINT ak_currency UNIQUE (symbol)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.contract_type (
	contract_type        BINARY(3)       NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)     NOT NULL   ,
	description          VARCHAR(30)     NOT NULL   ,
	CONSTRAINT ak_contract_type UNIQUE (source_ref)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument_type (
	instrument_type      BINARY(3)       NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)     NOT NULL   ,
	description          VARCHAR(30)     NOT NULL   ,
	CONSTRAINT ak_instrument_type UNIQUE (source_ref)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument (
	instrument           BINARY(3)       NOT NULL   PRIMARY KEY,
	base_currency        BINARY(3)       NOT NULL   ,
	quote_currency       BINARY(3)       NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ),
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES blofin.currency( currency) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument_period (
	instrument           BINARY(3)       NOT NULL   ,
	period_type          BINARY(3)       NOT NULL   ,
	trading_period       BOOLEAN         DEFAULT    FALSE   ,
	CONSTRAINT pk_instrument PRIMARY KEY ( instrument, period_type ),
	CONSTRAINT fk_ip_instrument FOREIGN KEY ( instrument) REFERENCES blofin.instrument( instrument) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_period_type FOREIGN KEY ( period_type ) REFERENCES blofin.period_type( period_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument_detail ( 
	instrument           BINARY(3)       NOT NULL   PRIMARY KEY,
	instrument_type      BINARY(3)       NOT NULL   ,
	contract_type        BINARY(3)       NOT NULL   ,
	contract_value       DECIMAL(13,2)   NOT NULL   ,
	max_leverage         INT             NOT NULL   ,
	min_size             DECIMAL(5,3)    NOT NULL   ,
	lot_size             DECIMAL(5,3)    NOT NULL   ,
	tick_size            DOUBLE          NOT NULL   ,
	max_limit_size       DECIMAL(13,2)   NOT NULL   ,
	max_market_size      DECIMAL(13,2)   NOT NULL   ,
	list_time            DATETIME        NOT NULL   ,
	expiry_time          DATETIME        NOT NULL   ,
	CONSTRAINT fk_id_contract_type FOREIGN KEY ( contract_type ) REFERENCES blofin.contract_type( contract_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES blofin.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.candle (
	instrument           BINARY(3)       NOT NULL   ,
	period_type          BINARY(3)       NOT NULL   ,
	bar_time             DATETIME        NOT NULL   ,
	open                 DOUBLE          NOT NULL   ,
	high                 DOUBLE          NOT NULL   ,
	low                  DOUBLE          NOT NULL   ,
	close                DOUBLE          NOT NULL   ,
	volume               INT             NOT NULL   ,
	vol_currency         INT             NOT NULL   ,
	vol_currency_quote   INT             NOT NULL   ,
	completed            BOOLEAN         NOT NULL   ,
	CONSTRAINT pk_candle PRIMARY KEY ( instrument, period_type, bar_time ),
	CONSTRAINT fk_c_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_c_period_type FOREIGN KEY ( period_type ) REFERENCES blofin.period_type( period_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_instrument_type ON blofin.instrument_detail ( instrument_type );
CREATE INDEX fk_c_period_type ON blofin.candle ( period_type );
CREATE INDEX fk_contract_type ON blofin.instrument_detail ( contract_type );

