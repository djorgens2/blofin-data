DROP SCHEMA  devel;
CREATE SCHEMA devel;

CREATE  TABLE blofin.activity ( 
	activity             BINARY(3)    NOT NULL   PRIMARY KEY,
	task                 VARCHAR(60)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.api_error ( 
	error_code           INT    NOT NULL   PRIMARY KEY,
	http_status_code     SMALLINT    NOT NULL   ,
	error_message        VARCHAR(200)   COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.audit_request ( 
	request              BINARY(6)       ,
	old_state            BINARY(3)       ,
	new_state            BINARY(3)       ,
	update_time          DATETIME(6)       
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

CREATE  TABLE blofin.position ( 
	position             CHAR(5)    NOT NULL   PRIMARY KEY
 ) engine=InnoDB;

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

CREATE  TABLE blofin.stop_type ( 
	stop_type            CHAR(2)    NOT NULL   PRIMARY KEY
 ) engine=InnoDB;

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
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3)) NOT NULL   ,
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
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
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
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT pk_account_detail PRIMARY KEY ( account, currency ),
	CONSTRAINT fk_ad_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ad_currency FOREIGN KEY ( currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ad_currency ON blofin.account_detail ( currency );

CREATE  TABLE blofin.instrument ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	period               BINARY(3)    NOT NULL   ,
	base_currency        BINARY(3)    NOT NULL   ,
	quote_currency       BINARY(3)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	margin_mode          VARCHAR(10)    NOT NULL   ,
	leverage             SMALLINT  DEFAULT (10)  NOT NULL   ,
	lot_scale_factor     SMALLINT UNSIGNED DEFAULT (1)     ,
	martingale_factor    SMALLINT  DEFAULT (1)  NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES blofin.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_period FOREIGN KEY ( period ) REFERENCES blofin.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON blofin.instrument ( quote_currency );

CREATE INDEX fk_i_trade_period ON blofin.instrument ( period );

CREATE INDEX fk_i_state ON blofin.instrument ( state );

CREATE INDEX fk_i_margin_mode ON blofin.instrument ( margin_mode );

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
	list_time            DATETIME(3)    NOT NULL   ,
	expiry_time          DATETIME(3)    NOT NULL   ,
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

CREATE  TABLE blofin.instrument_position ( 
	instrument_position  BINARY(3)    NOT NULL   PRIMARY KEY,
	account              BINARY(3)    NOT NULL   ,
	instrument           BINARY(3)    NOT NULL   ,
	position             CHAR(5)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	auto_state           BINARY(3)    NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	close_time           DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_instrument_position UNIQUE ( account, instrument, position ) ,
	CONSTRAINT fk_ips_instrument FOREIGN KEY ( instrument ) REFERENCES blofin.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ips_position FOREIGN KEY ( position ) REFERENCES blofin.position( position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ips_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_account FOREIGN KEY ( account ) REFERENCES blofin.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_ips_state ON blofin.instrument_position ( state );

CREATE INDEX fk_ips_position ON blofin.instrument_position ( position );

CREATE  TABLE blofin.positions ( 
	positions            BINARY(6)    NOT NULL   PRIMARY KEY,
	instrument_position  BINARY(3)    NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	size_available       DOUBLE    NOT NULL   ,
	leverage             INT  DEFAULT (0)  NOT NULL   ,
	margin_mode          VARCHAR(10)    NOT NULL   ,
	margin_used          DOUBLE  DEFAULT (0)  NOT NULL   ,
	margin_ratio         DECIMAL(12,3)    NOT NULL   ,
	margin_initial       DOUBLE    NOT NULL   ,
	margin_maint         DOUBLE    NOT NULL   ,
	average_price        DOUBLE    NOT NULL   ,
	mark_price           DOUBLE    NOT NULL   ,
	liquidation_price    DOUBLE    NOT NULL   ,
	unrealized_pnl       DOUBLE    NOT NULL   ,
	unrealized_pnl_ratio DECIMAL(12,3)    NOT NULL   ,
	adl                  SMALLINT  DEFAULT (0)  NOT NULL   ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT fk_p_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_p_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES blofin.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE blofin.request ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	instrument_position  BINARY(3)    NOT NULL   ,
	action               CHAR(4)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	price                DOUBLE  DEFAULT (0)  NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	leverage             INT    NOT NULL   ,
	request_type         BINARY(3)    NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(200)   COLLATE utf8mb4_0900_as_cs    ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	expiry_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT fk_r_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES blofin.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_request_type FOREIGN KEY ( request_type ) REFERENCES blofin.request_type( request_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES blofin.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE blofin.request ADD CONSTRAINT ck_r_action CHECK ( action in (_utf8mb4'buy',_utf8mb4'sell') );

CREATE INDEX fk_r_request_type ON blofin.request ( request_type );

CREATE INDEX fk_r_margin_mode ON blofin.request ( margin_mode );

CREATE INDEX fk_r_state ON blofin.request ( state );

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
	stop_request         BINARY(4)    NOT NULL   ,
	instrument_position  BINARY(3)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	stop_type            CHAR(2)    NOT NULL   ,
	action               CHAR(4)    NOT NULL   ,
	size                 DOUBLE       ,
	trigger_price        DOUBLE  DEFAULT ('0')  NOT NULL   ,
	order_price          DOUBLE  DEFAULT ('0')  NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(100)       ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT pk_position_request PRIMARY KEY ( stop_request, stop_type ),
	CONSTRAINT fk_sr_state FOREIGN KEY ( state ) REFERENCES blofin.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_stop_type FOREIGN KEY ( stop_type ) REFERENCES blofin.stop_type( stop_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES blofin.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_sr_stop_type ON blofin.stop_request ( stop_type );

CREATE INDEX fk_sr_instrument_position ON blofin.stop_request ( instrument_position );

CREATE INDEX fk_sr_state ON blofin.stop_request ( state );

CREATE  TABLE blofin.task_authority ( 
	role_authority       BINARY(3)    NOT NULL   ,
	activity             BINARY(3)    NOT NULL   ,
	CONSTRAINT pk_task_authority PRIMARY KEY ( role_authority, activity ),
	CONSTRAINT fk_ta_activity FOREIGN KEY ( activity ) REFERENCES blofin.activity( activity ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ta_role_authority FOREIGN KEY ( role_authority ) REFERENCES blofin.role_authority( role_authority ) ON DELETE NO ACTION ON UPDATE NO ACTION
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
	vol_currency         DECIMAL(15,6)    NOT NULL   ,
	vol_currency_quote   DECIMAL(15,6)    NOT NULL   ,
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
	order_category       BINARY(3)    NOT NULL   ,
	order_state          BINARY(3)    NOT NULL   ,
	cancel_source        BINARY(3)    NOT NULL   ,
	filled_size          DOUBLE  DEFAULT (0)  NOT NULL   ,
	filled_amount        DOUBLE  DEFAULT (0)  NOT NULL   ,
	average_price        DOUBLE  DEFAULT (0)  NOT NULL   ,
	fee                  DOUBLE  DEFAULT (0)  NOT NULL   ,
	pnl                  DOUBLE  DEFAULT (0)  NOT NULL   ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_orders UNIQUE ( order_id ) ,
	CONSTRAINT fk_o_cancel_source FOREIGN KEY ( cancel_source ) REFERENCES blofin.cancel_source( cancel_source ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_category FOREIGN KEY ( order_category ) REFERENCES blofin.order_category( order_category ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_state FOREIGN KEY ( order_state ) REFERENCES blofin.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_request FOREIGN KEY ( request ) REFERENCES blofin.request( request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_o_order_state ON blofin.orders ( order_state );

CREATE INDEX fk_o_order_category ON blofin.orders ( order_category );

CREATE INDEX fk_o_cancel_source ON blofin.orders ( cancel_source );

CREATE  TABLE blofin.stop_order ( 
	stop_request         BINARY(4)    NOT NULL   PRIMARY KEY,
	tpsl_id              BIGINT    NOT NULL   ,
	order_state          BINARY(3)    NOT NULL   ,
	actual_size          DOUBLE    NOT NULL   ,
	broker_id            VARCHAR(16)   COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_stop_order UNIQUE ( tpsl_id ) ,
	CONSTRAINT fk_so_order_state FOREIGN KEY ( order_state ) REFERENCES blofin.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_so_stop_request FOREIGN KEY ( stop_request ) REFERENCES blofin.stop_request( stop_request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_so_order_state ON blofin.stop_order ( order_state );

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
	r.account AS account,
	ifnull(os.map_ref, rs.status) AS status,
	concat(b.symbol, '-', q.symbol) AS instId,
	r.margin_mode AS marginMode,
	r.position AS positionSide,
	r.action AS side,
	rt.source_ref AS orderType,
	replace(format(r.price,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS price,
	replace(format(r.size,(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1)), ',', '') AS size,
	cast(r.leverage as char charset utf8mb4) AS leverage,
	if((r.reduce_only = 0), 'false', 'true') AS reduceOnly,
	r.broker_id AS brokerId,
	cast(hex(r.request) as char charset utf8mb4) AS clientOrderId,
	r.memo AS memo,
	r.expiry_time AS expiry_time
from
	((((((((blofin.request r
left join blofin.orders o on
	((r.request = o.request)))
left join blofin.order_state os on
	((o.order_state = os.order_state)))
join blofin.instrument i on
	((r.instrument = i.instrument)))
join blofin.instrument_detail id on
	((i.instrument = id.instrument)))
join blofin.currency b on
	((i.base_currency = b.currency)))
join blofin.currency q on
	((i.quote_currency = q.currency)))
join blofin.request_type rt on
	((r.request_type = rt.request_type)))
join blofin.state rs on
	((r.state = rs.state)));

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
	id.contract_value AS contract_value,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.lot_size AS lot_size,
	id.tick_size AS tick_size,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	i.leverage AS leverage,
	i.margin_mode AS margin_mode,
	i.martingale_factor AS martingale_factor,
	ip.bulk_collection_rate AS bulk_collection_rate,
	if(((ip.bulk_collection_rate = 0) or (ip.bulk_collection_rate is null)), NULL, if((ip.interval_collection_rate > 4), ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	tp.period AS trade_period,
	tp.timeframe AS trade_timeframe,
	tp.timeframe_units AS timeframe_units,
	s.state AS trade_state,
	s.status AS trade_status,
	b.suspense AS suspense,
	id.list_time AS list_time,
	id.expiry_time AS expiry_time
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
join blofin.state s on
	((i.trade_state = s.state)))
join blofin.currency b on
	((i.base_currency = b.currency)))
join blofin.currency q on
	((i.quote_currency = q.currency)));

CREATE VIEW blofin.vw_orders AS
select
	r.account AS account,
	r.request AS request,
	o.order_id AS order_id,
	cast(hex(r.request) as char charset utf8mb4) AS client_order_id,
	ip.instrument_position AS instrument_position,
	r.instrument AS instrument,
	blofin.vi.symbol AS symbol,
	blofin.vi.base_currency AS base_currency,
	blofin.vi.base_symbol AS base_symbol,
	blofin.vi.quote_currency AS quote_currency,
	blofin.vi.quote_symbol AS quote_symbol,
	s.state AS state,
	s.status AS status,
	ifnull(rs.state, s.state) AS request_state,
	ifnull(os.map_ref, s.status) AS request_status,
	os.order_state AS order_state,
	os.source_ref AS order_status,
	r.position AS position,
	r.action AS action,
	r.request_type AS request_type,
	rt.source_ref AS order_type,
	r.margin_mode AS margin_mode,
	r.price AS price,
	r.size AS size,
	r.leverage AS leverage,
	o.filled_size AS filled_size,
	o.filled_amount AS filled_amount,
	o.average_price AS average_price,
	o.fee AS fee,
	o.pnl AS pnl,
	blofin.vi.digits AS digits,
	cat.order_category AS order_category,
	cat.source_ref AS category,
	can.cancel_source AS cancel_source,
	can.source_ref AS canceled_by,
	blofin.vi.contract_type AS contract_type,
	blofin.vi.instrument_type AS instrument_type,
	r.reduce_only AS reduce_only,
	r.broker_id AS broker_id,
	blofin.vi.trade_period AS trade_period,
	blofin.vi.trade_timeframe AS trade_timeframe,
	blofin.vi.trade_state AS trade_state,
	blofin.vi.trade_status AS trade_status,
	blofin.vi.suspense AS suspense,
	r.memo AS memo,
	ifnull(o.create_time, r.create_time) AS create_time,
	ifnull(o.update_time, r.update_time) AS update_time,
	r.expiry_time AS expiry_time
from
	(((((((((blofin.request r
left join blofin.orders o on
	((r.request = o.request)))
left join blofin.order_state os on
	((o.order_state = os.order_state)))
left join blofin.state rs on
	((os.map_ref = rs.status)))
left join blofin.cancel_source can on
	((o.cancel_source = can.cancel_source)))
left join blofin.order_category cat on
	((o.order_category = cat.order_category)))
join blofin.vw_instruments vi on
	((r.instrument = blofin.vi.instrument)))
left join blofin.instrument_position ip on
	(((r.instrument = ip.instrument) and (r.position = ip.position))))
join blofin.state s on
	((r.state = s.state)))
join blofin.request_type rt on
	((r.request_type = rt.request_type)));

CREATE VIEW blofin.vw_positions AS
select
	p.positions AS positions,
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	p.position AS position,
	it.source_ref AS instrument_type,
	if((p.positions > 0), 'buy', 'sell') AS action,
	if((p.positions < 0), 'buy', 'sell') AS counter_action,
	p.size AS size,
	p.size_available AS size_available,
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
	p.adl AS adl,
	s.state AS state,
	s.status AS status,
	p.create_time AS create_time,
	p.update_time AS update_time
from
	(((((((blofin.positions p
join blofin.instrument i on
	((p.instrument = i.instrument)))
join blofin.instrument_detail id on
	((i.instrument = id.instrument)))
join blofin.instrument_type it on
	((id.instrument_type = it.instrument_type)))
join blofin.currency b on
	((i.base_currency = b.currency)))
join blofin.currency q on
	((i.quote_currency = q.currency)))
join blofin.instrument_position ip on
	(((ip.instrument = i.instrument) and (ip.position = p.position))))
join blofin.state s on
	((ip.state = s.state)));

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

CREATE VIEW blofin.vw_candles AS
select
	blofin.vi.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	pt.period AS period,
	pt.timeframe AS timeframe,
	c.bar_time AS bar_time,
	(unix_timestamp(c.bar_time) * 1000) AS timestamp,
	c.open AS open,
	c.high AS high,
	c.low AS low,
	c.close AS close,
	c.volume AS volume,
	c.vol_currency AS vol_currency,
	c.vol_currency_quote AS vol_currency_quote,
	blofin.vi.digits AS digits,
	c.completed AS completed
from
	(((((blofin.candle c
join blofin.vw_instruments vi on
	((c.instrument = blofin.vi.instrument)))
join blofin.period pt on
	((c.period = pt.period)))
join blofin.instrument_period ip on
	(((blofin.vi.instrument = ip.instrument) and (ip.period = pt.period))))
join blofin.currency b on
	((blofin.vi.base_currency = b.currency)))
join blofin.currency q on
	((blofin.vi.quote_currency = q.currency)));

CREATE VIEW blofin.vw_instrument_positions AS
select
	ip.instrument_position AS instrument_position,
	ip.instrument AS instrument,
	ip.position AS position,
	blofin.vi.symbol AS symbol,
	ip.state AS state,
	s.status AS status,
	ip.auto_state AS auto_state,
	auto.status AS auto_status,
	id.digits AS digits,
	ifnull(r.open_request, 0) AS open_request,
	ifnull(tp.open_take_profit, 0) AS open_take_profit,
	ifnull(sl.open_stop_loss, 0) AS open_stop_loss,
	ip.update_time AS update_time,
	ip.close_time AS close_time,
	r.create_time AS create_time
from
	(((((((blofin.instrument_position ip
join blofin.vw_instruments vi on
	((ip.instrument = blofin.vi.instrument)))
join blofin.state s on
	((ip.state = s.state)))
join blofin.state auto on
	((ip.auto_state = auto.state)))
join (
	select
		blofin.instrument_detail.instrument AS instrument,
		(length(substring_index(cast(blofin.instrument_detail.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits
	from
		blofin.instrument_detail) id on
	((ip.instrument = id.instrument)))
left join (
	select
		rp.instrument_position AS instrument_position,
		max(r.create_time) AS create_time,
		count(0) AS open_request
	from
		((blofin.state s
	join blofin.request r on
		(((r.state = s.state) and (s.status in ('Pending', 'Queued')))))
	join blofin.instrument_position rp on
		(((r.instrument = rp.instrument) and (r.position = rp.position))))
	group by
		rp.instrument_position) r on
	((ip.instrument_position = r.instrument_position)))
left join (
	select
		sr.instrument_position AS instrument_position,
		count(0) AS open_take_profit
	from
		(blofin.state s
	join blofin.stop_request sr on
		(((sr.state = s.state) and (s.status in ('Pending', 'Queued')))))
	where
		(sr.stop_type = 'tp')
	group by
		sr.instrument_position,
		sr.stop_type) tp on
	((ip.instrument_position = tp.instrument_position)))
left join (
	select
		sr.instrument_position AS instrument_position,
		count(0) AS open_stop_loss
	from
		(blofin.state s
	join blofin.stop_request sr on
		(((sr.state = s.state) and (s.status in ('Pending', 'Queued')))))
	where
		(sr.stop_type = 'sl')
	group by
		sr.instrument_position,
		sr.stop_type) sl on
	((ip.instrument_position = sl.instrument_position)));

CREATE VIEW blofin.vw_stop_orders AS
select
	sr.stop_request AS stop_request,
	sr.stop_type AS stop_type,
	so.tpsl_id AS tpsl_id,
	concat(lower(cast(hex(so.stop_request) as char charset utf8mb4)), '-', so.stop_type) AS client_order_id,
	blofin.vip.instrument_position AS instrument_position,
	blofin.vip.instrument AS instrument,
	blofin.vip.symbol AS symbol,
	blofin.vip.position AS position,
	blofin.vip.state AS position_state,
	blofin.vip.status AS position_status,
	rs.state AS request_state,
	rs.status AS request_status,
	os.order_state AS order_state,
	os.source_ref AS order_status,
	sr.action AS action,
	sr.size AS size,
	so.actual_size AS actual_size,
	sr.trigger_price AS trigger_price,
	sr.order_price AS order_price,
	sr.reduce_only AS reduce_only,
	sr.memo AS memo,
	so.broker_id AS broker_id,
	ifnull(so.create_time, sr.create_time) AS create_time
from
	((((blofin.stop_request sr
left join blofin.stop_order so on
	(((so.stop_request = sr.stop_request) and (so.stop_type = sr.stop_type))))
left join blofin.order_state os on
	((so.order_state = os.order_state)))
join blofin.vw_instrument_positions vip on
	((sr.instrument_position = blofin.vip.instrument_position)))
join blofin.state rs on
	((sr.state = rs.state)));

CREATE VIEW blofin.vw_stop_requests AS
select
	sr.stop_request AS stop_request,
	sr.stop_type AS stop_type,
	concat(lower(cast(hex(sr.stop_request) as char charset utf8mb4)), '-', sr.stop_type) AS client_order_id,
	blofin.vip.instrument AS instrument,
	blofin.vip.symbol AS symbol,
	blofin.vip.position AS position,
	s.state AS state,
	s.status AS status,
	blofin.vip.state AS position_state,
	blofin.vip.status AS position_status,
	sr.action AS action,
	sr.size AS size,
	sr.trigger_price AS trigger_price,
	sr.order_price AS order_price,
	sr.reduce_only AS reduce_only,
	sr.memo AS memo,
	sr.create_time AS create_time
from
	((blofin.stop_request sr
join blofin.state s on
	((sr.state = s.state)))
join blofin.vw_instrument_positions vip on
	((sr.instrument_position = blofin.vip.instrument_position)));

CREATE VIEW blofin.vw_api_stop_requests AS
select
	s.status AS status,
	blofin.vip.symbol AS instId,
	blofin.vip.position AS positionSide,
	sr.action AS side,
	sr.size AS size,
	if((sr.stop_type = 'tp'), replace(format(sr.trigger_price, blofin.vip.digits), ',', ''), NULL) AS tpTriggerPrice,
	if((sr.stop_type = 'tp'), replace(format(sr.order_price, blofin.vip.digits), ',', ''), NULL) AS tpOrderPrice,
	if((sr.stop_type = 'sl'), replace(format(sr.trigger_price, blofin.vip.digits), ',', ''), NULL) AS slTriggerPrice,
	if((sr.stop_type = 'sl'), replace(format(sr.order_price, blofin.vip.digits), ',', ''), NULL) AS slOrderPrice,
	sr.reduce_only AS reduceOnly,
	concat(lower(cast(hex(sr.stop_request) as char charset utf8mb4)), '-', sr.stop_type) AS clientOrderId
from
	((blofin.stop_request sr
join blofin.state s on
	((sr.state = s.state)))
join blofin.vw_instrument_positions vip on
	((sr.instrument_position = blofin.vip.instrument_position)));

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

CREATE TRIGGER blofin.trig_audit_request AFTER UPDATE ON request FOR EACH ROW BEGIN
    INSERT INTO blofin.audit_request VALUES (NEW.request, OLD.state, NEW.state, NEW.update_time);
  END;

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

