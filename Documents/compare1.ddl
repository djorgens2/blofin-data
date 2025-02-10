CREATE SCHEMA blofin;

CREATE  TABLE blofin.contract_type ( 
	contract_type        SMALLINT    NOT NULL   PRIMARY KEY,
	description          VARCHAR(20)    NOT NULL   ,
	short_name           VARCHAR(10)    NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE blofin.currency_type ( 
	currency_type        SMALLINT    NOT NULL   PRIMARY KEY,
	description          VARCHAR(20)    NOT NULL   ,
	short_name           VARCHAR(10)    NOT NULL   ,
	image_url            VARCHAR(300)       
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE blofin.instrument ( 
	instrument           SMALLINT    NOT NULL   PRIMARY KEY,
	base_currency        SMALLINT    NOT NULL   ,
	quote_currency       SMALLINT    NOT NULL   ,
	suspended            BOOLEAN       ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_i_quote_currency_type ON blofin.instrument ( quote_currency );

CREATE  TABLE blofin.instrument_type ( 
	instrument_type      SMALLINT    NOT NULL   PRIMARY KEY,
	description          VARCHAR(20)    NOT NULL   ,
	short_name           VARCHAR(10)    NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE blofin.period_type ( 
	period_type          SMALLINT    NOT NULL   PRIMARY KEY,
	description          VARCHAR(20)    NOT NULL   ,
	short_name           VARCHAR(3)    NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE blofin.candle ( 
	instrument           SMALLINT    NOT NULL   ,
	period_type          SMALLINT    NOT NULL   ,
	bar_time             DATETIME    NOT NULL   ,
	open                 DECIMAL(10,0)    NOT NULL   ,
	high                 DECIMAL(10,0)    NOT NULL   ,
	low                  DECIMAL(10,0)    NOT NULL   ,
	close                DECIMAL(10,0)    NOT NULL   ,
	volume               DECIMAL(10,0)    NOT NULL   ,
	currency             DECIMAL(10,0)    NOT NULL   ,
	currency_quote       DECIMAL(10,0)    NOT NULL   ,
	completed            BOOLEAN    NOT NULL   ,
	CONSTRAINT pk_candle PRIMARY KEY ( instrument, period_type, bar_time )
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_c_period_type ON blofin.candle ( period_type );

CREATE  TABLE blofin.instrument_detail ( 
	instrument           SMALLINT    NOT NULL   PRIMARY KEY,
	instrument_type      SMALLINT    NOT NULL   ,
	contract_type        SMALLINT    NOT NULL   ,
	contract_value       DECIMAL(11,2)    NOT NULL   ,
	max_leverage         INT    NOT NULL   ,
	min_size             DECIMAL(5,2)    NOT NULL   ,
	lot_size             DECIMAL(5,2)    NOT NULL   ,
	tick_size            DECIMAL(5,2)    NOT NULL   ,
	max_limit_size       DECIMAL(11,2)    NOT NULL   ,
	max_market_size      DECIMAL(11,2)    NOT NULL   ,
	list_time            DATETIME    NOT NULL   ,
	expiry_time          DATETIME    NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_instrument_type ON blofin.instrument_detail ( instrument_type );

CREATE INDEX fk_contract_type ON blofin.instrument_detail ( contract_type );

ALTER TABLE blofin.candle ADD CONSTRAINT fk_c_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.candle ADD CONSTRAINT fk_c_period_type FOREIGN KEY ( period_type ) REFERENCES blofin.period_type( period_type ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.instrument ADD CONSTRAINT fk_i_base_currency_type FOREIGN KEY ( base_currency ) REFERENCES blofin.currency_type( currency_type ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.instrument ADD CONSTRAINT fk_i_quote_currency_type FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency_type( currency_type ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.instrument_detail ADD CONSTRAINT fk_id_contract_type FOREIGN KEY ( contract_type ) REFERENCES blofin.contract_type( contract_type ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.instrument_detail ADD CONSTRAINT fk_id_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE blofin.instrument_detail ADD CONSTRAINT fk_id_instrument_type_0 FOREIGN KEY ( instrument_type ) REFERENCES blofin.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION;

