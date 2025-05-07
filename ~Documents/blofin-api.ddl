CREATE SCHEMA blofin;

CREATE  TABLE blofin.broker ( 
	broker               BINARY(3)    NOT NULL   PRIMARY KEY,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	image_url            VARCHAR(60)  DEFAULT ('./images/broker/no-image') COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	website_url          VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_broker UNIQUE ( description ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.contract_type ( 
	contract_type        BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_contract_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.currency ( 
	currency             BINARY(3)    NOT NULL   PRIMARY KEY,
	symbol               VARCHAR(20)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	image_url            VARCHAR(300)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	suspense             BOOLEAN       ,
	CONSTRAINT ak_currency UNIQUE ( symbol ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument_type ( 
	instrument_type      BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_instrument_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.period ( 
	period               BINARY(3)    NOT NULL   PRIMARY KEY,
	timeframe            VARCHAR(3)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	timeframe_units      INT    NOT NULL   ,
	CONSTRAINT ak_period UNIQUE ( timeframe ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.role ( 
	role                 BINARY(3)    NOT NULL   PRIMARY KEY,
	title                VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_role UNIQUE ( title ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.state ( 
	state                BINARY(3)    NOT NULL   PRIMARY KEY,
	status             VARCHAR(10)    NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_trade_state UNIQUE ( status ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.user ( 
	user               BINARY(3)    NOT NULL   PRIMARY KEY,
	username             VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	email                VARCHAR(80)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	hash                 BINARY(16)    NOT NULL   ,
	password             BINARY(16)    NOT NULL   ,
	avatar_url           VARCHAR(60)  DEFAULT ('./images/user/no-image.png') COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	role                 BINARY(3)    NOT NULL   ,
	create_time          DATETIME  DEFAULT (CURRENT_TIMESTAMP)  NOT NULL   ,
	update_time          DATETIME  DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( username, email ) ,
	CONSTRAINT fk_u_role FOREIGN KEY ( role ) REFERENCES blofin.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_u_role ON blofin.user ( role );

CREATE  TABLE blofin.account ( 
	account              BINARY(3)    NOT NULL   PRIMARY KEY,
	broker               BINARY(3)    NOT NULL   ,
	currency             BINARY(3)    NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	total_equity         DOUBLE    NOT NULL   ,
	isolated_equity      DOUBLE    NOT NULL   ,
	equity               DOUBLE    NOT NULL   ,
	available            DOUBLE    NOT NULL   ,
	balance              DOUBLE    NOT NULL   ,
	equity_usd           DOUBLE    NOT NULL   ,
	available_equity     DOUBLE    NOT NULL   ,
	frozen               DOUBLE    NOT NULL   ,
	order_frozen         DOUBLE    NOT NULL   ,
	unrealized_pnl       DOUBLE    NOT NULL   ,
	isolated_unrealized_pnl DOUBLE    NOT NULL   ,
	coin_usd_price       DOUBLE    NOT NULL   ,
	margin_ratio         DOUBLE    NOT NULL   ,
	spot_available       DOUBLE    NOT NULL   ,
	liability            DOUBLE    NOT NULL   ,
	borrow_frozen        DOUBLE    NOT NULL   ,
	update_time          DATETIME    NOT NULL   ,
	CONSTRAINT fk_a_base_currency FOREIGN KEY ( currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_broker FOREIGN KEY ( broker ) REFERENCES blofin.broker( broker ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_a_base_currency ON blofin.account ( currency );

CREATE INDEX fk_a_broker ON blofin.account ( broker );

CREATE  TABLE blofin.instrument ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	base_currency        BINARY(3)    NOT NULL   ,
	quote_currency       BINARY(3)    NOT NULL   ,
	trade_period         BINARY(3)       ,
	trade_state          BINARY(3)  DEFAULT (0x1697FE)  NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_trade_period FOREIGN KEY ( trade_period ) REFERENCES blofin.period( period ) ON DELETE RESTRICT ON UPDATE RESTRICT,
	CONSTRAINT fk_i_state FOREIGN KEY ( trade_state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument ( quote_currency );

CREATE INDEX fk_i_trade_period ON blofin.instrument ( trade_period );

CREATE INDEX fk_i_trade_state ON blofin.instrument ( trade_state );

CREATE  TABLE blofin.instrument_detail ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	instrument_type      BINARY(3)    NOT NULL   ,
	contract_type        BINARY(3)    NOT NULL   ,
	contract_value       DECIMAL(17,5)    NOT NULL   ,
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

CREATE INDEX fk_id_instrument_type ON blofin.instrument_detail ( instrument_type );

CREATE INDEX fk_id_contract_type ON blofin.instrument_detail ( contract_type );

CREATE  TABLE blofin.instrument_period ( 
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	sma_factor           SMALLINT  DEFAULT ('0')  NOT NULL   ,
	bulk_collection_rate SMALLINT  DEFAULT ('0')  NOT NULL   ,
	interval_collection_rate SMALLINT  DEFAULT (0)  NOT NULL   ,
	CONSTRAINT pk_instrument_period PRIMARY KEY ( instrument, period ),
	CONSTRAINT fk_ip_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_period FOREIGN KEY ( period ) REFERENCES blofin.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ip_period ON blofin.instrument_period ( period );

CREATE  TABLE blofin.user_account ( 
	user               BINARY(3)    NOT NULL   ,
	account              BINARY(3)    NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT pk_user_account PRIMARY KEY ( user, account ),
	CONSTRAINT fk_ua_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_user FOREIGN KEY ( user ) REFERENCES blofin.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ua_account ON blofin.user_account ( account );

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

CREATE VIEW blofin.vw_instrument_periods AS
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
	s.state AS trade_state,
	s.status AS trade_status,
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
					and (tps.trade_state = s.state)
						and (i.instrument = id.instrument)
							and (i.base_currency = b.currency)
								and (i.quote_currency = q.currency));

CREATE VIEW blofin.vw_instruments AS
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
	s.state AS trade_state,
	s.status AS trade_status,
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
	((i.trade_state = s.state)
		and (i.base_currency = b.currency)
			and (i.quote_currency = q.currency));

CREATE VIEW blofin.vw_candles AS
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

CREATE VIEW blofin.vw_candle_audit AS
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
