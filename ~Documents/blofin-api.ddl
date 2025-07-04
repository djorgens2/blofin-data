CREATE SCHEMA blofin;

CREATE  TABLE blofin.activity ( 
	activity             BINARY(3)    NOT NULL   PRIMARY KEY,
	task                 VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.authority ( 
	authority            BINARY(3)    NOT NULL   PRIMARY KEY,
	privilege            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	priority             SMALLINT  DEFAULT (0)  NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.broker ( 
	broker               BINARY(3)    NOT NULL   PRIMARY KEY,
	name                 VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	image_url            VARCHAR(60)  DEFAULT ('./images/broker/no-image') COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	website_url          VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_broker UNIQUE ( name ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.cancel_source ( 
	cancel_source        BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(15)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	source               VARCHAR(12)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_cancel UNIQUE ( source_ref ) 
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

CREATE  TABLE blofin.environment ( 
	environment          BINARY(3)    NOT NULL   PRIMARY KEY,
	environ              VARCHAR(15)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.fibonacci ( 
	fibonacci            BINARY(3)    NOT NULL   PRIMARY KEY,
	level                TINYINT    NOT NULL   ,
	percent              DECIMAL(5,3)    NOT NULL   ,
	alias                VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.fractal_state ( 
	fractal_state        CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.instrument_type ( 
	instrument_type      BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_instrument_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.margin_mode ( 
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.order_category ( 
	order_category       BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(20)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_category UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.order_state ( 
	order_state          BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(20)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	status             VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	map_ref              VARCHAR(10)   COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_order_state UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.period ( 
	period               BINARY(3)    NOT NULL   PRIMARY KEY,
	timeframe            VARCHAR(3)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	timeframe_units      INT    NOT NULL   ,
	CONSTRAINT ak_period UNIQUE ( timeframe ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.point_type ( 
	point_type           CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.price_type ( 
	price_type           CHAR(5)   COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY,
	description          VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.request_type ( 
	request_type         BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_request_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.role ( 
	role                 BINARY(3)    NOT NULL   PRIMARY KEY,
	title                VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	auth_rank            SMALLINT    NOT NULL   ,
	CONSTRAINT ak_role UNIQUE ( title ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.state ( 
	state                BINARY(3)    NOT NULL   PRIMARY KEY,
	status             VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_trade_state UNIQUE ( status ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.subject ( 
	subject              BINARY(3)    NOT NULL   PRIMARY KEY,
	area                 VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.user ( 
	user               BINARY(3)    NOT NULL   PRIMARY KEY,
	email                VARCHAR(80)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	role                 BINARY(3)    NOT NULL   ,
	hash                 BINARY(16)    NOT NULL   ,
	username             VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	password             BINARY(32)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	image_url            VARCHAR(60)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	create_time          DATETIME  DEFAULT (CURRENT_TIMESTAMP)  NOT NULL   ,
	update_time          DATETIME  DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP NOT NULL   ,
	CONSTRAINT ak_user UNIQUE ( username, email ) ,
	CONSTRAINT fk_u_role FOREIGN KEY ( role ) REFERENCES blofin.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_u_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_u_role ON blofin.user ( role );

CREATE INDEX fk_u_state ON blofin.user ( state );

CREATE  TABLE blofin.account ( 
	account              BINARY(3)    NOT NULL   PRIMARY KEY,
	broker               BINARY(3)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	environment          BINARY(3)    NOT NULL   ,
	total_equity         DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	isolated_equity      DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	wss_url              VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	rest_api_url         VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	wss_public_url       VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	update_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT fk_a_broker FOREIGN KEY ( broker ) REFERENCES blofin.broker( broker ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_environment FOREIGN KEY ( environment ) REFERENCES blofin.environment( environment ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_a_state ON blofin.account ( state );

CREATE INDEX fk_a_broker ON blofin.account ( broker );

CREATE INDEX fk_a_environment ON blofin.account ( environment );

CREATE  TABLE blofin.account_detail ( 
	account              BINARY(3)    NOT NULL   ,
	currency             BINARY(3)    NOT NULL   ,
	balance              DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	equity               DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	isolated_equity      DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	available            DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	available_equity     DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	equity_usd           DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	frozen               DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	order_frozen         DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	borrow_frozen        DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	unrealized_pnl       DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	isolated_unrealized_pnl DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	coin_usd_price       DECIMAL(10,6)  DEFAULT (0)  NOT NULL   ,
	margin_ratio         DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	spot_available       DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	liability            DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	update_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT pk_account_detail PRIMARY KEY ( account, currency ),
	CONSTRAINT fk_ad_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ad_currency FOREIGN KEY ( currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ad_currency ON blofin.account_detail ( currency );

CREATE  TABLE blofin.instrument ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	base_currency        BINARY(3)    NOT NULL   ,
	quote_currency       BINARY(3)    NOT NULL   ,
	trade_period         BINARY(3)       ,
	trade_state          BINARY(3)    NOT NULL   ,
	lot_scale_factor     INT  DEFAULT (0)  NOT NULL   ,
	martingale_factor    INT  DEFAULT (0)  NOT NULL   ,
	leverage             INT  DEFAULT ('0')  NOT NULL   ,
	default_stop_loss    DOUBLE  DEFAULT (0)  NOT NULL   ,
	default_take_profit  DOUBLE  DEFAULT (0)  NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_state FOREIGN KEY ( trade_state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_trade_period FOREIGN KEY ( trade_period ) REFERENCES blofin.period( period ) ON DELETE RESTRICT ON UPDATE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument ( quote_currency );

CREATE INDEX fk_i_trade_period ON blofin.instrument ( trade_period );

CREATE INDEX fk_i_state ON blofin.instrument ( trade_state );

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
	sma_factor           SMALLINT  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	bulk_collection_rate SMALLINT  DEFAULT ('0')  NOT NULL   ,
	interval_collection_rate SMALLINT  DEFAULT (0)  NOT NULL   ,
	strict_stops         BOOLEAN  DEFAULT (false)  NOT NULL   ,
	CONSTRAINT pk_instrument_period PRIMARY KEY ( instrument, period ),
	CONSTRAINT fk_ip_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_period FOREIGN KEY ( period ) REFERENCES blofin.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ip_period ON blofin.instrument_period ( period );

CREATE  TABLE blofin.positions ( 
	position_id          BINARY(4)    NOT NULL   PRIMARY KEY,
	state                BINARY(3)    NOT NULL   ,
	instrument           BINARY(3)    NOT NULL   ,
	position             CHAR(5)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	positions            INT    NOT NULL   ,
	positions_avail      INT    NOT NULL   ,
	instrument_type      BINARY(3)    NOT NULL   ,
	leverage             INT  DEFAULT (0)  NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	margin_used          DOUBLE  DEFAULT ('0')  NOT NULL   ,
	margin_ratio         DECIMAL(12,3)    NOT NULL   ,
	margin_initial       DOUBLE    NOT NULL   ,
	margin_maint         DOUBLE    NOT NULL   ,
	average_price        DOUBLE    NOT NULL   ,
	mark_price           DOUBLE    NOT NULL   ,
	liquidation_price    DOUBLE    NOT NULL   ,
	unrealized_pnl       DOUBLE    NOT NULL   ,
	unrealized_pnl_ratio DECIMAL(12,3)    NOT NULL   ,
	adl                  TINYINT  DEFAULT (0)  NOT NULL   ,
	create_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	update_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT fk_p_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_p_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES blofin.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_p_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_positions_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.positions ADD CONSTRAINT ck_p_position CHECK ( position in (_utf8mb4'long',_utf8mb4'net',_utf8mb4'short') );

CREATE INDEX fk_p_instrument_type ON blofin.positions ( instrument_type );

CREATE INDEX fk_p_margin_mode ON blofin.positions ( margin_mode );

CREATE INDEX fk_p_instrument ON blofin.positions ( instrument );

CREATE INDEX fk_positions_state ON blofin.positions ( state );

CREATE  TABLE blofin.request ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	account              BINARY(3)    NOT NULL   ,
	instrument           BINARY(3)    NOT NULL   ,
	position             CHAR(5)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	action               CHAR(4)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	price                DOUBLE  DEFAULT (0)  NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	leverage             INT    NOT NULL   ,
	request_type         BINARY(3)    NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	expiry_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	create_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	update_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT fk_r_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_request_type FOREIGN KEY ( request_type ) REFERENCES blofin.request_type( request_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.request ADD CONSTRAINT ck_r_action CHECK ( action in (_utf8mb4'buy',_utf8mb4'sell') );

ALTER TABLE blofin.request ADD CONSTRAINT ck_r_position CHECK ( position in (_utf8mb4'long',_utf8mb4'net',_utf8mb4'short') );

CREATE INDEX fk_r_request_type ON blofin.request ( request_type );

CREATE INDEX fk_r_margin_mode ON blofin.request ( margin_mode );

CREATE INDEX fk_r_account ON blofin.request ( account );

CREATE INDEX fk_r_state ON blofin.request ( state );

CREATE INDEX fk_r_instrument ON blofin.request ( instrument );

CREATE  TABLE blofin.role_authority ( 
	role_authority       BINARY(3)    NOT NULL   PRIMARY KEY,
	role                 BINARY(3)    NOT NULL   ,
	authority            BINARY(3)    NOT NULL   ,
	subject              BINARY(3)    NOT NULL   ,
	enabled              BOOLEAN  DEFAULT (true)  NOT NULL   ,
	CONSTRAINT ak_role_authority UNIQUE ( role, authority, subject ) ,
	CONSTRAINT fk_sra_authority FOREIGN KEY ( authority ) REFERENCES blofin.authority( authority ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sra_role FOREIGN KEY ( role ) REFERENCES blofin.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sra_subject FOREIGN KEY ( subject ) REFERENCES blofin.subject( subject ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ra_subject ON blofin.role_authority ( subject );

CREATE INDEX fk_ra_role ON blofin.role_authority ( role );

CREATE INDEX fk_ra_authority ON blofin.role_authority ( authority );

CREATE  TABLE blofin.stop_request ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	position_id          BINARY(4)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	size                 DOUBLE  DEFAULT (-(1))  NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	memo                 VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	expiry_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	create_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT fk_sr_positions FOREIGN KEY ( position_id ) REFERENCES blofin.positions( position_id ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_sr_state ON blofin.stop_request ( state );

CREATE INDEX fk_sr_positions ON blofin.stop_request ( position_id );

CREATE  TABLE blofin.task_authority ( 
	role_authority       BINARY(3)    NOT NULL   ,
	activity             BINARY(3)    NOT NULL   ,
	CONSTRAINT pk_task_authority PRIMARY KEY ( role_authority, activity ),
	CONSTRAINT fk_ta_activity FOREIGN KEY ( activity ) REFERENCES blofin.activity( activity ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ta_subject_role_authority FOREIGN KEY ( role_authority ) REFERENCES blofin.role_authority( role_authority ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ta_activity ON blofin.task_authority ( activity );

CREATE  TABLE blofin.user_account ( 
	user               BINARY(3)    NOT NULL   ,
	account              BINARY(3)    NOT NULL   ,
	owner                BINARY(3)    NOT NULL   ,
	alias                VARCHAR(30)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT pk_user_account PRIMARY KEY ( user, account ),
	CONSTRAINT ak_account_owner UNIQUE ( account, owner ) ,
	CONSTRAINT fk_ua_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_owner FOREIGN KEY ( owner ) REFERENCES blofin.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_user FOREIGN KEY ( user ) REFERENCES blofin.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ua_owner ON blofin.user_account ( owner );

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

CREATE  TABLE blofin.fractal ( 
	fractal              BINARY(3)    NOT NULL   PRIMARY KEY,
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	position             CHAR(5)   COLLATE utf8mb4_0900_as_cs    ,
	fibonacci            BINARY(3)       ,
	CONSTRAINT ak_fractal UNIQUE ( instrument, period, position ) ,
	CONSTRAINT fk_f_instrument_period FOREIGN KEY ( instrument, period ) REFERENCES blofin.instrument_period( instrument, period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.fractal_fibonacci ( 
	fractal              BINARY(3)    NOT NULL   ,
	fractal_type         CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	fibonacci            BINARY(3)    NOT NULL   ,
	fractal_state        CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	price                DOUBLE    NOT NULL   ,
	CONSTRAINT pk_fractal_fibonacci PRIMARY KEY ( fractal, fractal_type, fibonacci ),
	CONSTRAINT fk_ff_fibonacci FOREIGN KEY ( fibonacci ) REFERENCES blofin.fibonacci( fibonacci ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal FOREIGN KEY ( fractal ) REFERENCES blofin.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal_state FOREIGN KEY ( fractal_state ) REFERENCES blofin.fractal_state( fractal_state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.fractal_fibonacci ADD CONSTRAINT ck_ff_fractal_type CHECK ( fractal_type in (_utf8mb4'extension',_utf8mb4'retrace') );

CREATE INDEX fk_ff_fibonacci ON blofin.fractal_fibonacci ( fibonacci );

CREATE INDEX fk_ff_fractal_state ON blofin.fractal_fibonacci ( fractal_state );

CREATE  TABLE blofin.fractal_point ( 
	fractal              BINARY(3)    NOT NULL   ,
	point_type           CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	price                DOUBLE    NOT NULL   ,
	create_time          DATETIME    NOT NULL   ,
	CONSTRAINT pk_fractal_point PRIMARY KEY ( fractal, point_type ),
	CONSTRAINT fk_p_point_type FOREIGN KEY ( point_type ) REFERENCES blofin.point_type( point_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_point_fractal FOREIGN KEY ( fractal ) REFERENCES blofin.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_fp_point_type ON blofin.fractal_point ( point_type );

CREATE  TABLE blofin.orders ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	order_id             BIGINT    NOT NULL   ,
	instrument_type      BINARY(3)    NOT NULL   ,
	price                DOUBLE    NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	request_type         BINARY(3)    NOT NULL   ,
	position             CHAR(5)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	action               CHAR(4)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	filled_size          DOUBLE  DEFAULT (0)  NOT NULL   ,
	filled_amount        DOUBLE  DEFAULT (0)  NOT NULL   ,
	average_price        DOUBLE  DEFAULT (0)  NOT NULL   ,
	order_state          BINARY(3)    NOT NULL   ,
	leverage             INT  DEFAULT (0)  NOT NULL   ,
	fee                  DOUBLE  DEFAULT (0)  NOT NULL   ,
	pnl                  DOUBLE  DEFAULT (0)  NOT NULL   ,
	cancel_source        BINARY(3)    NOT NULL   ,
	order_category       BINARY(3)    NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	update_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT ak_orders UNIQUE ( order_id ) ,
	CONSTRAINT fk_o_cancel_source FOREIGN KEY ( cancel_source ) REFERENCES blofin.cancel_source( cancel_source ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES blofin.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_category FOREIGN KEY ( order_category ) REFERENCES blofin.order_category( order_category ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_state FOREIGN KEY ( order_state ) REFERENCES blofin.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_request_type FOREIGN KEY ( request_type ) REFERENCES blofin.request_type( request_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_request FOREIGN KEY ( request ) REFERENCES blofin.request( request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_o_instrument_type ON blofin.orders ( instrument_type );

CREATE INDEX fk_o_request_type ON blofin.orders ( request_type );

CREATE INDEX fk_o_margin_mode ON blofin.orders ( margin_mode );

CREATE INDEX fk_o_order_state ON blofin.orders ( order_state );

CREATE INDEX fk_o_order_category ON blofin.orders ( order_category );

CREATE INDEX fk_o_cancel_source ON blofin.orders ( cancel_source );

CREATE  TABLE blofin.stop_detail ( 
	request              BINARY(6)    NOT NULL   ,
	stop_type            CHAR(2)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	trigger_price        DOUBLE    NOT NULL   ,
	order_price          DOUBLE    NOT NULL   ,
	CONSTRAINT pk_stop_detail PRIMARY KEY ( request, stop_type ),
	CONSTRAINT fk_sd_stop_request FOREIGN KEY ( request ) REFERENCES blofin.stop_request( request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.stop_detail ADD CONSTRAINT ck_sd_stop_type CHECK ( stop_type in (_utf8mb4'sl',_utf8mb4'tp') );

CREATE  TABLE blofin.stop_order ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	tpsl_id              BIGINT    NOT NULL   ,
	order_state          BINARY(3)    NOT NULL   ,
	action               CHAR(4)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	actual_size          DOUBLE    NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(100)   COLLATE utf8mb4_0900_as_cs    ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT ak_stop_order UNIQUE ( tpsl_id ) ,
	CONSTRAINT fk_so_order_state FOREIGN KEY ( order_state ) REFERENCES blofin.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_so_stop_request FOREIGN KEY ( request ) REFERENCES blofin.stop_request( request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.stop_order ADD CONSTRAINT ck_so_action CHECK ( action in (_utf8mb4'buy',_utf8mb4'sell') );

CREATE INDEX fk_so_order_state ON blofin.stop_order ( order_state );

CREATE  TABLE blofin.position_stops ( 
	tpsl_id              BIGINT    NOT NULL   ,
	stop_type            CHAR(2)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	trigger_price        DOUBLE  DEFAULT (0)  NOT NULL   ,
	order_price          DOUBLE  DEFAULT (0)  NOT NULL   ,
	CONSTRAINT pk_position_stops PRIMARY KEY ( tpsl_id, stop_type ),
	CONSTRAINT fk_ps_stop_order FOREIGN KEY ( tpsl_id ) REFERENCES blofin.stop_order( tpsl_id ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.position_stops ADD CONSTRAINT ck_ps_stop_type CHECK ( stop_type in (_utf8mb4'sl',_utf8mb4'tp') );

CREATE VIEW blofin.vw_accounts AS
select
	a.account AS account,
	a.broker AS broker,
	a.state AS state,
	s.status AS status,
	e.environment AS environment,
	e.environ AS environ,
	b.name AS broker_name,
	b.image_url AS broker_image_url,
	b.website_url AS broker_website_url,
	u.username AS owner_name,
	ua.alias AS alias,
	u.email AS owner_email,
	u.image_url AS owner_image_url,
	a.total_equity AS total_equity,
	a.isolated_equity AS isolated_equity,
	a.wss_url AS wss_url,
	a.rest_api_url AS rest_api_url,
	c.currency AS currency,
	c.symbol AS symbol,
	c.image_url AS currency_image_url,
	c.suspense AS currency_suspended,
	ad.balance AS balance,
	ad.equity AS currency_equity,
	ad.isolated_equity AS currency_isolated_equity,
	ad.equity AS equity,
	ad.available AS available,
	ad.available_equity AS available_equity,
	ad.equity_usd AS equity_usd,
	ad.frozen AS frozen,
	ad.order_frozen AS order_frozen,
	ad.borrow_frozen AS borrow_frozen,
	ad.unrealized_pnl AS unrealized_pnl,
	ad.isolated_unrealized_pnl AS isolated_unrealized_pnl,
	ad.coin_usd_price AS coin_usd_price,
	ad.margin_ratio AS margin_ratio,
	ad.spot_available AS spot_available,
	ad.liability AS liability,
	ad.update_time AS update_time
from
	(((((((blofin.account a
left join blofin.account_detail ad on
	((a.account = ad.account)))
left join blofin.currency c on
	((ad.currency = c.currency)))
left join blofin.user_account ua on
	((a.account = ua.account)))
left join blofin.user u on
	((u.user = ua.owner)))
join blofin.environment e)
join blofin.broker b)
join blofin.state s)
where
	((a.broker = b.broker)
		and (a.environment = e.environment)
			and (a.state = s.state));

CREATE VIEW blofin.vw_api_requests AS
select
	ifnull(os.map_ref, rs.status) AS status,
	concat(b.symbol, '-', q.symbol) AS instId,
	r.margin_mode AS marginMode,
	r.position AS positionSide,
	r.action AS side,
	rt.source_ref AS orderType,
	replace(format(r.price,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS price,
	replace(format(r.size,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS size,
	if((r.reduce_only = 0), 'false', 'true') AS reduceOnly,
	r.broker_id AS broker_id,
	cast(hex(r.request) as char charset utf8mb4) AS clientOrderId,
	r.memo AS memo,
	r.expiry_time AS expiry_time
from
	((((((((blofin.request r
left join blofin.orders o on
	((r.request = o.request)))
left join blofin.order_state os on
	((o.order_state = os.order_state)))
join blofin.instrument i)
join blofin.instrument_detail id)
join blofin.currency b)
join blofin.currency q)
join blofin.request_type rt)
join blofin.state rs)
where
	((r.instrument = i.instrument)
		and (i.instrument = id.instrument)
			and (i.base_currency = b.currency)
				and (i.quote_currency = q.currency)
					and (r.state = rs.state)
						and (r.request_type = rt.request_type));

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

CREATE VIEW blofin.vw_orders AS
select
	o.request AS request,
	o.order_id AS order_id,
	cast(hex(r.request) as char charset utf8mb4) AS client_order_id,
	r.account AS account,
	r.instrument AS instrument,
	blofin.i.symbol AS symbol,
	blofin.i.base_currency AS base_currency,
	blofin.i.base_symbol AS base_symbol,
	blofin.i.quote_currency AS quote_currency,
	blofin.i.quote_symbol AS quote_symbol,
	blofin.i.instrument_type AS instrument_type,
	os.order_state AS order_state,
	os.source_ref AS order_status,
	s.state AS request_state,
	s.status AS request_status,
	rt.request_type AS request_type,
	rt.source_ref AS order_type,
	o.position AS position,
	o.action AS action,
	o.price AS price,
	o.size AS size,
	o.leverage AS leverage,
	o.margin_mode AS margin_mode,
	cat.order_category AS order_category,
	cat.source_ref AS category,
	blofin.i.contract_type AS contract_type,
	blofin.i.contract_type AS contract,
	blofin.i.trade_period AS trade_period,
	blofin.i.trade_timeframe AS trade_timeframe,
	o.filled_size AS filled_size,
	o.filled_amount AS filled_amount,
	o.average_price AS average_price,
	o.fee AS fee,
	o.pnl AS pnl,
	can.cancel_source AS cancel_source,
	can.source_ref AS canceled_by,
	o.reduce_only AS reduce_only,
	o.broker_id AS broker_id,
	blofin.i.digits AS digits,
	blofin.i.trade_state AS trade_state,
	blofin.i.trade_status AS trade_status,
	blofin.i.suspense AS suspense,
	o.create_time AS create_time,
	o.update_time AS update_time,
	r.expiry_time AS expiry_time
from
	(((((((blofin.orders o
join blofin.request_type rt)
join blofin.order_state os)
join blofin.cancel_source can)
join blofin.order_category cat)
join blofin.vw_instruments i)
join blofin.request r)
join blofin.state s)
where
	((r.request = o.request)
		and (r.instrument = blofin.i.instrument)
			and (o.request_type = rt.request_type)
				and (o.order_state = os.order_state)
					and (os.map_ref = s.status)
						and (o.cancel_source = can.cancel_source)
							and (o.order_category = cat.order_category));

CREATE VIEW blofin.vw_positions AS
select
	p.position_id AS position_id,
	p.position AS position,
	p.positions AS positions,
	p.positions_avail AS positions_avail,
	concat(b.symbol, '-', q.symbol) AS symbol,
	i.instrument AS instrument,
	it.source_ref AS instrument_type,
	if((p.positions > 0), 'buy', 'sell') AS action,
	if((p.positions > 0), 'buy', 'sell') AS counteraction,
	p.leverage AS leverage,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits,
	p.margin_mode AS margin_mode,
	p.margin_ratio AS margin_ratio,
	replace(format(p.margin_initial, 3), ',', '') AS margin_initial,
	replace(format(p.margin_maint, 3), ',', '') AS margin_maint,
	replace(format(p.average_price,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS average_price,
	replace(format(p.liquidation_price,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS liquidation_price,
	replace(format(p.mark_price,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS mark_price,
	replace(format(p.unrealized_pnl, 3), ',', '') AS unrealized_pnl,
	p.unrealized_pnl_ratio AS unrealized_pnl_ratio,
	s.status AS status,
	p.create_time AS create_time,
	p.update_time AS update_time
from
	((((((blofin.positions p
join blofin.instrument i)
join blofin.instrument_type it)
join blofin.instrument_detail id)
join blofin.currency b)
join blofin.currency q)
join blofin.state s)
where
	((p.instrument = i.instrument)
		and (p.instrument = id.instrument)
			and (p.instrument_type = it.instrument_type)
				and (i.base_currency = b.currency)
					and (i.quote_currency = q.currency)
						and (p.state = s.state));

CREATE VIEW blofin.vw_requests AS
select
	r.request AS request,
	r.account AS account,
	r.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	s.state AS state,
	s.status AS status,
	rs.state AS order_state,
	os.map_ref AS order_status,
	r.margin_mode AS margin_mode,
	r.position AS position,
	r.action AS action,
	r.request_type AS request_type,
	rt.source_ref AS order_type,
	r.price AS price,
	r.size AS size,
	r.leverage AS leverage,
	blofin.i.digits AS digits,
	r.memo AS memo,
	r.reduce_only AS reduce_only,
	r.broker_id AS broker_id,
	r.expiry_time AS expiry_time,
	r.create_time AS create_time
from
	((((((((blofin.request r
left join blofin.orders o on
	((r.request = o.request)))
left join blofin.order_state os on
	((o.order_state = os.order_state)))
left join blofin.state rs on
	((os.map_ref = rs.status)))
join blofin.vw_instruments i)
join blofin.currency b)
join blofin.currency q)
join blofin.request_type rt)
join blofin.state s)
where
	((r.instrument = blofin.i.instrument)
		and (r.request_type = rt.request_type)
			and (r.state = s.state)
				and (blofin.i.base_currency = b.currency)
					and (blofin.i.quote_currency = q.currency));

CREATE VIEW blofin.vw_role_privileges AS
select
	ra.role_authority AS role_authority,
	r.role AS role,
	r.title AS title,
	s.subject AS subject,
	s.area AS area,
	auth.authority AS authority,
	auth.privilege AS privilege,
	auth.priority AS priority,
	ra.enabled AS enabled
from
	(((blofin.role r
join blofin.subject s)
join blofin.authority auth)
join blofin.role_authority ra)
where
	((ra.subject = s.subject)
		and (ra.role = r.role)
			and (ra.authority = auth.authority));

CREATE VIEW blofin.vw_role_subjects AS
select
	r.role AS role,
	r.title AS title,
	s.subject AS subject,
	s.area AS area
from
	(((blofin.role r
join blofin.subject s)
join blofin.authority auth)
join blofin.role_authority ra)
where
	((ra.subject = s.subject)
		and (ra.role = r.role)
			and (ra.authority = auth.authority))
group by
	r.role,
	r.title,
	s.subject,
	s.area
order by
	s.area;

CREATE VIEW blofin.vw_users AS
select
	u.user AS user,
	u.username AS username,
	u.email AS email,
	u.role AS role,
	r.title AS title,
	u.state AS state,
	s.status AS status,
	u.image_url AS image_url,
	u.password AS password,
	u.hash AS hash,
	u.create_time AS create_time,
	u.update_time AS update_time
from
	((blofin.user u
join blofin.role r)
join blofin.state s)
where
	((u.role = r.role)
		and (u.state = s.state));

CREATE VIEW blofin.vw_api_stop_requests AS
select
	ifnull(os.map_ref, s.status) AS status,
	blofin.vp.symbol AS instId,
	blofin.vp.margin_mode AS marginMode,
	blofin.vp.position AS positionSide,
	blofin.vp.counteraction AS side,
	replace(format(tp.trigger_price, blofin.vp.digits), ',', '') AS tpTriggerPrice,
	replace(format(tp.order_price, blofin.vp.digits), ',', '') AS tpOrderPrice,
	replace(format(sl.trigger_price, blofin.vp.digits), ',', '') AS slTriggerPrice,
	replace(format(sl.order_price, blofin.vp.digits), ',', '') AS slOrderPrice,
	sr.size AS size,
	if((sr.reduce_only = 0), 'false', 'true') AS reduceOnly,
	sr.request AS clientOrderId,
	sr.broker_id AS brokerId,
	sr.memo AS memo,
	sr.expiry_time AS expiryTime
from
	((((((blofin.stop_request sr
left join blofin.stop_order so on
	((sr.request = so.request)))
left join blofin.order_state os on
	((so.order_state = os.order_state)))
join blofin.vw_positions vp)
join blofin.state s)
join blofin.stop_detail tp)
join blofin.stop_detail sl)
where
	((sr.state = s.state)
		and (sr.position_id = blofin.vp.position_id)
			and (sr.request = tp.request)
				and (tp.stop_type = 'tp')
					and (sr.request = sl.request)
						and (sl.stop_type = 'sl'));

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

ALTER TABLE blofin.cancel_source COMMENT 'not_canceled
user_canceled
system_canceled';

ALTER TABLE blofin.fractal_state COMMENT 'Rally
Pullback
Retrace
Correction
Recovery
Breakout
Reversal
Extension';

ALTER TABLE blofin.margin_mode COMMENT 'Margin mode
cross
isolated';

ALTER TABLE blofin.order_category COMMENT 'normal
full_liquidation
partial_liquidation
adl
tp
sl';

ALTER TABLE blofin.order_state COMMENT 'live, effective, canceled, order_failed, filled, partially_canceled, partially_filled';

ALTER TABLE blofin.point_type COMMENT 'Origin
Base
Root
Expansion
Retrace
Recovery
Close';

ALTER TABLE blofin.price_type COMMENT 'Trigger price type.
last: last price
index: index price
mark: mark price';

ALTER TABLE blofin.request_type COMMENT 'market: market order
limit: limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order';

ALTER TABLE blofin.fractal_fibonacci MODIFY fractal_type CHAR(10)  NOT NULL   COMMENT 'Retrace
Extension';
