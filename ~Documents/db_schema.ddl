DROP SCHEMA devel;
CREATE SCHEMA devel;
ALTER DATABASE devel CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

USE devel;

CREATE  TABLE devel.api_error ( 
	error_code           INT    NOT NULL   PRIMARY KEY,
	http_status_code     SMALLINT    NOT NULL   ,
	error_message        VARCHAR(200)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.audit_request ( 
	request              BINARY(6)       ,
	old_state            BINARY(3)       ,
	new_state            BINARY(3)       ,
	update_time          DATETIME(6)       
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.authority ( 
	authority            BINARY(3)    NOT NULL   PRIMARY KEY,
	privilege            VARCHAR(16)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	priority             SMALLINT  DEFAULT (0)  NOT NULL   ,
	CONSTRAINT ak_authority UNIQUE ( privilege ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.broker ( 
	broker               BINARY(3)    NOT NULL   PRIMARY KEY,
	name                 VARCHAR(30)    NOT NULL   ,
	image_url            VARCHAR(60)    NOT NULL   ,
	website_url          VARCHAR(60)    NOT NULL   ,
	CONSTRAINT ak_broker UNIQUE ( name ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.cancel_source ( 
	cancel_source        BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(15)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	source               VARCHAR(12)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_cancel UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.contract_type ( 
	contract_type        BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_contract_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.environment ( 
	environment          BINARY(3)    NOT NULL   PRIMARY KEY,
	environ              VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_environment UNIQUE ( environ ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fibonacci ( 
	fibonacci            BINARY(3)    NOT NULL   PRIMARY KEY,
	level                TINYINT    NOT NULL   ,
	percent              DECIMAL(5,3)    NOT NULL   ,
	alias                VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fractal_state ( 
	fractal_state        CHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.instrument_type ( 
	instrument_type      BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_instrument_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.margin_mode ( 
	margin_mode          VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.order_category ( 
	order_category       BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(20)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_category UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.order_state ( 
	order_state          BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(20)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	status             VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_order_state UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.period ( 
	period               BINARY(3)    NOT NULL   PRIMARY KEY,
	timeframe            VARCHAR(3)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	timeframe_units      INT    NOT NULL   ,
	CONSTRAINT ak_period UNIQUE ( timeframe ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.point_type ( 
	point_type           CHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.position ( 
	position             CHAR(5)    NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE devel.price_type ( 
	price_type           CHAR(5)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   PRIMARY KEY,
	description          VARCHAR(16)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.request_type ( 
	request_type         BINARY(3)    NOT NULL   PRIMARY KEY,
	source_ref           VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_request_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.role ( 
	role                 BINARY(3)    NOT NULL   PRIMARY KEY,
	title                VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	auth_rank            SMALLINT    NOT NULL   ,
	CONSTRAINT ak_role UNIQUE ( title ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.state ( 
	state                BINARY(3)    NOT NULL   PRIMARY KEY,
	status             VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	description          VARCHAR(60)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_state UNIQUE ( status ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.stop_type ( 
	stop_type            CHAR(2)    NOT NULL   PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE devel.subject_area ( 
	subject_area         BINARY(3)    NOT NULL   PRIMARY KEY,
	title                VARCHAR(20)    NOT NULL   ,
	description          VARCHAR(200)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_subject_area UNIQUE ( title ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.user ( 
	user               BINARY(3)    NOT NULL   PRIMARY KEY,
	email                VARCHAR(80)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	role                 BINARY(3)    NOT NULL   ,
	hash                 BINARY(16)    NOT NULL   ,
	username             VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	password             BINARY(32)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	image_url            VARCHAR(60)    NOT NULL   ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_user UNIQUE ( username, email ) ,
	CONSTRAINT fk_u_role FOREIGN KEY ( role ) REFERENCES devel.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_u_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_u_role ON devel.user ( role );

CREATE INDEX fk_u_state ON devel.user ( state );

CREATE  TABLE devel.account ( 
	account              BINARY(3)    NOT NULL   PRIMARY KEY,
	alias                VARCHAR(100)    NOT NULL   ,
	owner                BINARY(3)    NOT NULL   ,
	broker               BINARY(3)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	environment          BINARY(3)    NOT NULL   ,
	total_equity         DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	isolated_equity      DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	rest_api_url         VARCHAR(100)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	private_wss_url      VARCHAR(100)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	public_wss_url       VARCHAR(100)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME(3)  DEFAULT (now())  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_alias UNIQUE ( alias ) ,
	CONSTRAINT fk_a_broker FOREIGN KEY ( broker ) REFERENCES devel.broker( broker ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_environment FOREIGN KEY ( environment ) REFERENCES devel.environment( environment ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_owner FOREIGN KEY ( owner ) REFERENCES devel.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_a_state ON devel.account ( state );

CREATE INDEX fk_a_broker ON devel.account ( broker );

CREATE INDEX fk_a_environment ON devel.account ( environment );

CREATE INDEX fk_a_owner ON devel.account ( owner );

CREATE  TABLE devel.activity ( 
	activity             BINARY(3)    NOT NULL   PRIMARY KEY,
	subject_area         BINARY(3)    NOT NULL   ,
	task                 VARCHAR(60)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT ak_activity UNIQUE ( task ) ,
	CONSTRAINT fk_a_subject FOREIGN KEY ( subject_area ) REFERENCES devel.subject_area( subject_area ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_a_subject ON devel.activity ( subject_area );

CREATE  TABLE devel.currency ( 
	currency             BINARY(3)    NOT NULL   PRIMARY KEY,
	symbol               VARCHAR(20)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	image_url            VARCHAR(300)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_currency UNIQUE ( symbol ) ,
	CONSTRAINT fk_c_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_c_state ON devel.currency ( state );

CREATE  TABLE devel.instrument ( 
	instrument           BINARY(3)    NOT NULL   PRIMARY KEY,
	trade_period         BINARY(3)    NOT NULL   ,
	base_currency        BINARY(3)    NOT NULL   ,
	quote_currency       BINARY(3)    NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	leverage             SMALLINT  DEFAULT (10)  NOT NULL   ,
	lot_scale_factor     SMALLINT UNSIGNED DEFAULT (1)     ,
	martingale_factor    SMALLINT  DEFAULT (1)  NOT NULL   ,
	CONSTRAINT ak_instrument UNIQUE ( base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_trade_period FOREIGN KEY ( trade_period ) REFERENCES devel.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON devel.instrument ( quote_currency );

CREATE INDEX fk_i_trade_period ON devel.instrument ( trade_period );

CREATE INDEX fk_i_margin_mode ON devel.instrument ( margin_mode );

CREATE  TABLE devel.instrument_detail ( 
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
	CONSTRAINT fk_id_contract_type FOREIGN KEY ( contract_type ) REFERENCES devel.contract_type( contract_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES devel.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_id_instrument_type ON devel.instrument_detail ( instrument_type );

CREATE INDEX fk_id_contract_type ON devel.instrument_detail ( contract_type );

CREATE  TABLE devel.instrument_period ( 
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	sma_factor           SMALLINT  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	bulk_collection_rate SMALLINT  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	interval_collection_rate SMALLINT  DEFAULT (0)  NOT NULL   ,
	active_collection    BOOLEAN  DEFAULT (false)  NOT NULL   ,
	CONSTRAINT pk_instrument_period PRIMARY KEY ( instrument, period ),
	CONSTRAINT fk_ip_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ip_period FOREIGN KEY ( period ) REFERENCES devel.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ip_period ON devel.instrument_period ( period );

CREATE  TABLE devel.instrument_position ( 
	instrument_position  BINARY(6)    NOT NULL   PRIMARY KEY,
	account              BINARY(3)    NOT NULL   ,
	instrument           BINARY(3)    NOT NULL   ,
	position             CHAR(5)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	auto_state           BINARY(3)    NOT NULL   ,
	strict_stops         BOOLEAN  DEFAULT (false)  NOT NULL   ,
	strict_targets       BOOLEAN  DEFAULT (false)  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	close_time           DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT ak_instrument_position UNIQUE ( account, instrument, position ) ,
	CONSTRAINT fk_ipos_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_position FOREIGN KEY ( position ) REFERENCES devel.position( position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_ipos_state ON devel.instrument_position ( state );

CREATE INDEX fk_ipos_position ON devel.instrument_position ( position );

CREATE INDEX fk_ipos_instrument ON devel.instrument_position ( instrument );

CREATE  TABLE devel.positions ( 
	positions            BINARY(6)    NOT NULL   PRIMARY KEY,
	instrument_position  BINARY(6)    NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	size_available       DOUBLE    NOT NULL   ,
	leverage             INT  DEFAULT (0)  NOT NULL   ,
	margin_mode          VARCHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
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
	CONSTRAINT fk_p_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_p_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_p_margin_mode ON devel.positions ( margin_mode );

CREATE INDEX fk_p_instrument_position ON devel.positions ( instrument_position );

CREATE  TABLE devel.request ( 
	request              BINARY(6)    NOT NULL   PRIMARY KEY,
	instrument_position  BINARY(6)    NOT NULL   ,
	action               CHAR(4)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	price                DOUBLE  DEFAULT (0)  NOT NULL   ,
	size                 DOUBLE    NOT NULL   ,
	leverage             INT    NOT NULL   ,
	request_type         BINARY(3)    NOT NULL   ,
	margin_mode          VARCHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(200)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	broker_id            VARCHAR(16)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	expiry_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	CONSTRAINT fk_r_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_request_type FOREIGN KEY ( request_type ) REFERENCES devel.request_type( request_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_r_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.request ADD CONSTRAINT ck_r_action CHECK ( action in (_utf8mb4'buy',_utf8mb4'sell') );

CREATE INDEX fk_r_instrument_position ON devel.request ( instrument_position );

CREATE INDEX fk_r_request_type ON devel.request ( request_type );

CREATE INDEX fk_r_margin_mode ON devel.request ( margin_mode );

CREATE INDEX fk_r_state ON devel.request ( state );

CREATE  TABLE devel.role_authority ( 
	role                 BINARY(3)    NOT NULL   ,
	authority            BINARY(3)    NOT NULL   ,
	activity             BINARY(3)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	CONSTRAINT pk_role_authority PRIMARY KEY ( role, authority, activity ),
	CONSTRAINT fk_ra_authority FOREIGN KEY ( authority ) REFERENCES devel.authority( authority ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sra_role FOREIGN KEY ( role ) REFERENCES devel.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ra_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ra_activity FOREIGN KEY ( activity ) REFERENCES devel.activity( activity ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ra_role ON devel.role_authority ( role );

CREATE INDEX fk_ra_authority ON devel.role_authority ( authority );

CREATE INDEX fk_ra_state ON devel.role_authority ( state );

CREATE INDEX fk_ra_activity ON devel.role_authority ( activity );

CREATE  TABLE devel.stop_request ( 
	stop_request         BINARY(4)    NOT NULL   ,
	instrument_position  BINARY(6)    NOT NULL   ,
	state                BINARY(3)    NOT NULL   ,
	stop_type            CHAR(2)    NOT NULL   ,
	action               CHAR(4)    NOT NULL   ,
	size                 DOUBLE       ,
	trigger_price        DOUBLE  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	order_price          DOUBLE  DEFAULT (_utf8mb4'0')  NOT NULL   ,
	reduce_only          BOOLEAN  DEFAULT (false)  NOT NULL   ,
	memo                 VARCHAR(100)       ,
	create_time          DATETIME(3)  DEFAULT (now(3))  NOT NULL   ,
	update_time          DATETIME(3)  DEFAULT (now())  NOT NULL   ,
	CONSTRAINT pk_stop_request PRIMARY KEY ( stop_request, stop_type ),
	CONSTRAINT fk_sr_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_stop_type FOREIGN KEY ( stop_type ) REFERENCES devel.stop_type( stop_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_sr_stop_type ON devel.stop_request ( stop_type );

CREATE INDEX fk_sr_instrument_position ON devel.stop_request ( instrument_position );

CREATE INDEX fk_sr_state ON devel.stop_request ( state );

CREATE  TABLE devel.user_account ( 
	user               BINARY(3)    NOT NULL   ,
	account              BINARY(3)    NOT NULL   ,
	nickname             VARCHAR(30)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	CONSTRAINT pk_user_account PRIMARY KEY ( user, account ),
	CONSTRAINT fk_ua_user FOREIGN KEY ( user ) REFERENCES devel.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ua_account ON devel.user_account ( account );

CREATE  TABLE devel.account_detail ( 
	account              BINARY(3)    NOT NULL   ,
	currency             BINARY(3)    NOT NULL   ,
	balance              DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	available            DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	currency_equity      DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
	currency_isolated_equity DECIMAL(15,3)  DEFAULT (0)  NOT NULL   ,
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
	CONSTRAINT fk_ad_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ad_currency FOREIGN KEY ( currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ad_currency ON devel.account_detail ( currency );

CREATE  TABLE devel.candle ( 
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
	CONSTRAINT fk_c_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_c_period FOREIGN KEY ( period ) REFERENCES devel.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_c_period ON devel.candle ( period );

CREATE  TABLE devel.fractal ( 
	fractal              BINARY(3)    NOT NULL   PRIMARY KEY,
	instrument           BINARY(3)    NOT NULL   ,
	period               BINARY(3)    NOT NULL   ,
	position             CHAR(5)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	fibonacci            BINARY(3)       ,
	CONSTRAINT ak_fractal UNIQUE ( instrument, period, position ) ,
	CONSTRAINT fk_f_instrument_period FOREIGN KEY ( instrument, period ) REFERENCES devel.instrument_period( instrument, period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fractal_fibonacci ( 
	fractal              BINARY(3)    NOT NULL   ,
	fractal_type         CHAR(10)   COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	fibonacci            BINARY(3)    NOT NULL   ,
	fractal_state        CHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	price                DOUBLE    NOT NULL   ,
	CONSTRAINT pk_fractal_fibonacci PRIMARY KEY ( fractal, fractal_type, fibonacci ),
	CONSTRAINT fk_ff_fibonacci FOREIGN KEY ( fibonacci ) REFERENCES devel.fibonacci( fibonacci ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal FOREIGN KEY ( fractal ) REFERENCES devel.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal_state FOREIGN KEY ( fractal_state ) REFERENCES devel.fractal_state( fractal_state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.fractal_fibonacci ADD CONSTRAINT ck_ff_fractal_type CHECK ( fractal_type in (_utf8mb4'extension',_utf8mb4'retrace') );

CREATE INDEX fk_ff_fibonacci ON devel.fractal_fibonacci ( fibonacci );

CREATE INDEX fk_ff_fractal_state ON devel.fractal_fibonacci ( fractal_state );

CREATE  TABLE devel.fractal_point ( 
	fractal              BINARY(3)    NOT NULL   ,
	point_type           CHAR(10)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL   ,
	price                DOUBLE    NOT NULL   ,
	create_time          DATETIME    NOT NULL   ,
	CONSTRAINT pk_fractal_point PRIMARY KEY ( fractal, point_type ),
	CONSTRAINT fk_p_point_type FOREIGN KEY ( point_type ) REFERENCES devel.point_type( point_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_point_fractal FOREIGN KEY ( fractal ) REFERENCES devel.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_fp_point_type ON devel.fractal_point ( point_type );

CREATE  TABLE devel.orders ( 
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
	CONSTRAINT ak_orders UNIQUE ( order_id ) ,
	CONSTRAINT fk_o_cancel_source FOREIGN KEY ( cancel_source ) REFERENCES devel.cancel_source( cancel_source ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_category FOREIGN KEY ( order_category ) REFERENCES devel.order_category( order_category ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_state FOREIGN KEY ( order_state ) REFERENCES devel.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_request FOREIGN KEY ( request ) REFERENCES devel.request( request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_o_order_state ON devel.orders ( order_state );

CREATE INDEX fk_o_order_category ON devel.orders ( order_category );

CREATE INDEX fk_o_cancel_source ON devel.orders ( cancel_source );

CREATE  TABLE devel.stop_order ( 
	stop_request         BINARY(4)    NOT NULL   PRIMARY KEY,
	tpsl_id              BIGINT    NOT NULL   ,
	order_state          BINARY(3)    NOT NULL   ,
	actual_size          DOUBLE    NOT NULL   ,
	broker_id            VARCHAR(16)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs    ,
	CONSTRAINT ak_stop_order UNIQUE ( tpsl_id ) ,
	CONSTRAINT fk_so_order_state FOREIGN KEY ( order_state ) REFERENCES devel.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_so_stop_request FOREIGN KEY ( stop_request ) REFERENCES devel.stop_request( stop_request ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_so_order_state ON devel.stop_order ( order_state );

CREATE VIEW devel.vw_account_orders AS
select
	ord.account AS account,
	ifnull(min(ord.order_id), 0) AS order_id
from
	(
	select
		ipos.account AS account,
		min(o.order_id) AS order_id
	from
		((devel.instrument_position ipos
	left join devel.request r on
		((r.instrument_position = ipos.instrument_position)))
	left join devel.orders o on
		(((r.request = o.request) and (r.create_time = r.update_time))))
	group by
		ipos.account
union
	select
		uip.account AS account,
		max(uo.order_id) AS order_id
	from
		((devel.instrument_position uip
	left join devel.request ur on
		((uip.instrument_position = ur.instrument_position)))
	left join devel.orders uo on
		((uo.request = ur.request)))
	group by
		uip.account) ord
group by
	ord.account;

CREATE VIEW devel.vw_accounts AS
select
	a.account AS account,
	a.alias AS alias,
	a.broker AS broker,
	a.state AS state,
	s.status AS status,
	e.environment AS environment,
	e.environ AS environ,
	b.name AS broker_name,
	b.image_url AS broker_image_url,
	b.website_url AS broker_website_url,
	u.username AS owner_name,
	u.email AS owner_email,
	u.image_url AS owner_image_url,
	a.total_equity AS total_equity,
	a.isolated_equity AS isolated_equity,
	a.rest_api_url AS rest_api_url,
	a.private_wss_url AS private_wss_url,
	a.public_wss_url AS public_wss_url,
	c.currency AS currency,
	c.symbol AS symbol,
	c.image_url AS currency_image_url,
	c.state AS currency_state,
	cs.status AS currency_status,
	ad.balance AS balance,
	ad.currency_equity AS currency_equity,
	ad.currency_isolated_equity AS currency_isolated_equity,
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
	(((((((devel.account a
left join devel.account_detail ad on
	((a.account = ad.account)))
left join devel.currency c on
	((ad.currency = c.currency)))
left join devel.state cs on
	((c.state = cs.state)))
join devel.user u on
	((u.user = a.owner)))
join devel.environment e on
	((a.environment = e.environment)))
join devel.broker b on
	((a.broker = b.broker)))
join devel.state s on
	((a.state = s.state)));

CREATE VIEW devel.vw_activity AS
select
	sa.subject_area AS subject_area,
	sa.title AS title,
	sa.description AS description,
	a.activity AS activity,
	a.task AS task
from
	(devel.subject_area sa
join devel.activity a on
	((a.subject_area = sa.subject_area)));

CREATE VIEW devel.vw_api_requests AS
select
	ipos.account AS account,
	ifnull(os.status, rs.status) AS status,
	concat(b.symbol, '-', q.symbol) AS instId,
	r.margin_mode AS marginMode,
	ipos.position AS positionSide,
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
	(((((((((devel.request r
left join devel.orders o on
	((r.request = o.request)))
left join devel.order_state os on
	((o.order_state = os.order_state)))
join devel.instrument_position ipos on
	((ipos.instrument_position = r.instrument_position)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.instrument_detail id on
	((i.instrument = id.instrument)))
join devel.currency b on
	((i.base_currency = b.currency)))
join devel.currency q on
	((i.quote_currency = q.currency)))
join devel.request_type rt on
	((r.request_type = rt.request_type)))
join devel.state rs on
	((r.state = rs.state)));

CREATE VIEW devel.vw_audit_instrument_periods AS
select
	missing.instrument AS instrument,
	missing.period AS period
from
	((
	select
		i.instrument AS instrument,
		p.period AS period
	from
		(devel.instrument i
	join devel.period p)) missing
left join devel.instrument_period ip on
	(((ip.instrument = missing.instrument) and (ip.period = missing.period))))
where
	(ip.period is null);

CREATE VIEW devel.vw_audit_role_authority AS
select
	r.role AS role,
	auth.authority AS authority,
	a.activity AS activity
from
	((devel.activity a
join devel.role r)
join devel.authority auth)
where
	(r.role,
	auth.authority,
	a.activity) in (
	select
		devel.role_authority.role,
		devel.role_authority.authority,
		devel.role_authority.activity
	from
		devel.role_authority) is false;

CREATE VIEW devel.vw_auth_trade_instruments AS
select
	distinct ipos.account AS account,
	ipos.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	i.trade_period AS trade_period,
	s.state AS auto_state,
	s.status AS auto_status,
	i.margin_mode AS margin_mode,
	i.leverage AS leverage,
	id.max_leverage AS max_leverage,
	i.lot_scale_factor AS lot_scale_factor,
	i.martingale_factor AS martingale_factor,
	id.lot_size AS lot_size,
	id.min_size AS min_size,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits
from
	(((((devel.instrument_position ipos
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.instrument_detail id on
	((id.instrument = ipos.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.state s on
	((s.state = ipos.auto_state)));

CREATE VIEW devel.vw_currency AS
select
	c.currency AS currency,
	c.symbol AS symbol,
	s.state AS state,
	s.status AS status,
	c.image_url AS image_url
from
	(devel.currency c
join devel.state s on
	((c.state = s.state)));

CREATE VIEW devel.vw_instrument_periods AS
select
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.symbol AS base_symbol,
	b.currency AS base_currency,
	q.symbol AS quote_symbol,
	q.currency AS quote_currency,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_units AS timeframe_units,
	ip.bulk_collection_rate AS bulk_collection_rate,
	if((ip.bulk_collection_rate = 0), 0, if((ip.interval_collection_rate > 4), ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	ip.active_collection AS active_collection,
	if((qs.status = 'Suspended'), qs.state, bs.state) AS state,
	if((qs.status = 'Suspended'), qs.status, bs.status) AS status
from
	(((((((devel.instrument i
join devel.instrument_period ip on
	((ip.instrument = i.instrument)))
join devel.period p on
	((ip.period = p.period)))
join devel.instrument_detail id on
	((i.instrument = id.instrument)))
join devel.currency b on
	((i.base_currency = b.currency)))
join devel.state bs on
	((b.state = bs.state)))
join devel.currency q on
	((i.quote_currency = q.currency)))
join devel.state qs on
	((q.state = qs.state)));

CREATE VIEW devel.vw_instruments AS
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
	i.margin_mode AS margin_mode,
	i.leverage AS leverage,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	id.lot_size AS lot_size,
	i.lot_scale_factor AS lot_scale_factor,
	id.tick_size AS tick_size,
	(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits,
	i.martingale_factor AS martingale_factor,
	ip.bulk_collection_rate AS bulk_collection_rate,
	if(((ip.bulk_collection_rate = 0) or (ip.bulk_collection_rate is null)), NULL, if((ip.interval_collection_rate > 4), ip.interval_collection_rate, 4)) AS interval_collection_rate,
	ip.sma_factor AS sma_factor,
	p.period AS trade_period,
	p.timeframe AS trade_timeframe,
	p.timeframe_units AS timeframe_units,
	if((qs.status = 'Suspended'), qs.state, bs.state) AS state,
	if((qs.status = 'Suspended'), qs.status, bs.status) AS status,
	id.list_time AS list_time,
	id.expiry_time AS expiry_time
from
	(((((((((devel.instrument i
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.state bs on
	((bs.state = b.state)))
join devel.state qs on
	((qs.state = q.state)))
left join devel.instrument_period ip on
	(((ip.period = i.trade_period) and (ip.instrument = i.instrument))))
left join devel.instrument_detail id on
	((id.instrument = i.instrument)))
left join devel.instrument_type it on
	((it.instrument_type = id.instrument_type)))
left join devel.contract_type ct on
	((ct.contract_type = id.contract_type)))
left join devel.period p on
	((p.period = i.trade_period)));

CREATE VIEW devel.vw_order_states AS
select
	os.order_state AS order_state,
	os.source_ref AS source_ref,
	os.description AS description,
	s.state AS state,
	s.status AS status
from
	(devel.order_state os
join devel.state s on
	((s.status = os.status)));

CREATE VIEW devel.vw_orders AS
select
	ipos.account AS account,
	r.request AS request,
	o.order_id AS order_id,
	cast(hex(r.request) as char charset utf8mb4) AS client_order_id,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	devel.vi.symbol AS symbol,
	devel.vi.base_currency AS base_currency,
	devel.vi.base_symbol AS base_symbol,
	devel.vi.quote_currency AS quote_currency,
	devel.vi.quote_symbol AS quote_symbol,
	s.state AS state,
	s.status AS status,
	ifnull(rs.state, s.state) AS request_state,
	ifnull(os.status, s.status) AS request_status,
	os.order_state AS order_state,
	os.source_ref AS order_status,
	ipos.position AS position,
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
	devel.vi.digits AS digits,
	cat.order_category AS order_category,
	cat.source_ref AS category,
	can.cancel_source AS cancel_source,
	can.source_ref AS canceled_by,
	devel.vi.contract_type AS contract_type,
	devel.vi.instrument_type AS instrument_type,
	r.reduce_only AS reduce_only,
	r.broker_id AS broker_id,
	devel.vi.trade_period AS trade_period,
	devel.vi.trade_timeframe AS trade_timeframe,
	devel.vi.timeframe_units AS timeframe_units,
	devel.vi.state AS trade_state,
	devel.vi.status AS trade_status,
	r.memo AS memo,
	r.create_time AS create_time,
	r.expiry_time AS expiry_time,
	r.update_time AS update_time
from
	(((((((((devel.request r
join devel.instrument_position ipos on
	((ipos.instrument_position = r.instrument_position)))
join devel.vw_instruments vi on
	((devel.vi.instrument = ipos.instrument)))
join devel.state s on
	((r.state = s.state)))
join devel.request_type rt on
	((r.request_type = rt.request_type)))
left join devel.orders o on
	((r.request = o.request)))
left join devel.order_state os on
	((o.order_state = os.order_state)))
left join devel.state rs on
	((os.status = rs.status)))
left join devel.cancel_source can on
	((o.cancel_source = can.cancel_source)))
left join devel.order_category cat on
	((o.order_category = cat.order_category)));

CREATE VIEW devel.vw_positions AS
select
	ipos.account AS account,
	p.positions AS positions,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	ipos.position AS position,
	it.source_ref AS instrument_type,
	if((p.size > 0), 'buy', 'sell') AS action,
	if((p.size < 0), 'buy', 'sell') AS counter_action,
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
	(((((((devel.positions p
join devel.instrument_position ipos on
	((ipos.instrument_position = p.instrument_position)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.instrument_detail id on
	((id.instrument = ipos.instrument)))
join devel.instrument_type it on
	((it.instrument_type = id.instrument_type)))
join devel.currency b on
	((i.base_currency = b.currency)))
join devel.currency q on
	((i.quote_currency = q.currency)))
join devel.state s on
	((ipos.state = s.state)));

CREATE VIEW devel.vw_role_authority AS
select
	r.role AS role,
	r.title AS title,
	sa.subject_area AS subject_area,
	sa.title AS subject_area_title,
	sa.description AS description,
	a.activity AS activity,
	a.task AS task,
	auth.authority AS authority,
	auth.privilege AS privilege,
	auth.priority AS priority,
	s.state AS state,
	s.status AS status
from
	(((((devel.role_authority ra
join devel.role r on
	((r.role = ra.role)))
join devel.activity a on
	((a.activity = ra.activity)))
join devel.subject_area sa on
	((sa.subject_area = a.subject_area)))
join devel.authority auth on
	((auth.authority = ra.authority)))
join devel.state s on
	((s.state = ra.state)));

CREATE VIEW devel.vw_role_subject_areas AS
select
	ra.role AS role,
	ra.authority AS authority,
	ra.activity AS activity,
	ra.state AS state,
	rsa.title AS subject_area_title
from
	(devel.role_authority ra
join (
	select
		a.activity AS activity,
		sa.subject_area AS subject_area,
		sa.title AS title
	from
		(devel.activity a
	join devel.subject_area sa)
	group by
		a.activity,
		sa.subject_area) rsa on
	((ra.activity = rsa.activity)));

CREATE VIEW devel.vw_users AS
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
	rc.similar_roles AS similar_roles,
	uc.total_users AS total_users,
	u.create_time AS create_time,
	u.update_time AS update_time
from
	((((devel.user u
join devel.role r on
	((r.role = u.role)))
join (
	select
		devel.user.role AS role,
		count(0) AS similar_roles
	from
		devel.user
	group by
		devel.user.role) rc on
	((rc.role = u.role)))
join (
	select
		count(0) AS total_users
	from
		devel.user) uc)
join devel.state s on
	((s.state = u.state)));

CREATE VIEW devel.vw_audit_instrument_positions AS
select
	a.account AS account,
	devel.i.instrument AS instrument,
	p.position AS position,
	devel.i.state AS auto_state
from
	((devel.vw_instruments i
join devel.position p)
join devel.account a)
where
	(a.account,
	devel.i.instrument,
	p.position) in (
	select
		ipos.account,
		ipos.instrument,
		ipos.position
	from
		devel.instrument_position ipos) is false;

CREATE VIEW devel.vw_candles AS
select
	devel.vi.instrument AS instrument,
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
	devel.vi.digits AS digits,
	c.completed AS completed
from
	(((((devel.candle c
join devel.vw_instruments vi on
	((c.instrument = devel.vi.instrument)))
join devel.period pt on
	((c.period = pt.period)))
join devel.instrument_period ip on
	(((devel.vi.instrument = ip.instrument) and (ip.period = pt.period))))
join devel.currency b on
	((devel.vi.base_currency = b.currency)))
join devel.currency q on
	((devel.vi.quote_currency = q.currency)));

CREATE VIEW devel.vw_instrument_positions AS
select
	ipos.instrument_position AS instrument_position,
	ipos.account AS account,
	ipos.instrument AS instrument,
	ipos.position AS position,
	devel.vi.symbol AS symbol,
	ipos.state AS state,
	s.status AS status,
	ipos.auto_state AS auto_state,
	auto.status AS auto_status,
	ipos.strict_stops AS strict_stops,
	ipos.strict_targets AS strict_targets,
	id.digits AS digits,
	ifnull(r.open_request, 0) AS open_request,
	ifnull(tp.open_take_profit, 0) AS open_take_profit,
	ifnull(sl.open_stop_loss, 0) AS open_stop_loss,
	ipos.update_time AS update_time,
	ipos.close_time AS close_time,
	r.create_time AS create_time
from
	(((((((devel.instrument_position ipos
join devel.vw_instruments vi on
	((ipos.instrument = devel.vi.instrument)))
join devel.state s on
	((ipos.state = s.state)))
join devel.state auto on
	((auto.state = ipos.auto_state)))
join (
	select
		id.instrument AS instrument,
		(length(substring_index(cast(id.tick_size as char charset utf8mb4), '.',-(1))) + 1) AS digits
	from
		devel.instrument_detail id) id on
	((id.instrument = ipos.instrument)))
left join (
	select
		r.instrument_position AS instrument_position,
		max(r.create_time) AS create_time,
		count(0) AS open_request
	from
		(devel.state s
	join devel.request r on
		(((r.state = s.state) and (s.status in ('Pending', 'Queued')))))
	group by
		r.instrument_position) r on
	((r.instrument_position = ipos.instrument_position)))
left join (
	select
		sr.instrument_position AS instrument_position,
		count(0) AS open_take_profit
	from
		(devel.state s
	join devel.stop_request sr on
		(((sr.state = s.state) and (s.status in ('Pending', 'Queued')) and (sr.stop_type = 'tp'))))
	group by
		sr.instrument_position) tp on
	((tp.instrument_position = ipos.instrument_position)))
left join (
	select
		sr.instrument_position AS instrument_position,
		count(0) AS open_stop_loss
	from
		(devel.state s
	join devel.stop_request sr on
		(((sr.state = s.state) and (s.status in ('Pending', 'Queued')) and (sr.stop_type = 'sl'))))
	group by
		sr.instrument_position) sl on
	((sl.instrument_position = ipos.instrument_position)));

CREATE VIEW devel.vw_stop_orders AS
select
	sr.stop_request AS stop_request,
	sr.stop_type AS stop_type,
	so.tpsl_id AS tpsl_id,
	concat(lower(cast(hex(sr.stop_request) as char charset utf8mb4)), '-', sr.stop_type) AS client_order_id,
	devel.vip.instrument_position AS instrument_position,
	devel.vip.instrument AS instrument,
	devel.vip.symbol AS symbol,
	devel.vip.position AS position,
	devel.vip.state AS position_state,
	devel.vip.status AS position_status,
	rs.state AS state,
	rs.status AS status,
	ifnull(rs.state, s.state) AS request_state,
	ifnull(os.status, s.status) AS request_status,
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
	sr.create_time AS create_time,
	sr.update_time AS update_time
from
	(((((devel.stop_request sr
left join devel.stop_order so on
	((so.stop_request = sr.stop_request)))
left join devel.order_state os on
	((so.order_state = os.order_state)))
left join devel.state s on
	((s.status = os.status)))
join devel.vw_instrument_positions vip on
	((sr.instrument_position = devel.vip.instrument_position)))
join devel.state rs on
	((sr.state = rs.state)));

CREATE VIEW devel.vw_api_stop_requests AS
select
	s.status AS status,
	devel.vip.symbol AS instId,
	devel.vip.position AS positionSide,
	sr.action AS side,
	sr.size AS size,
	if((sr.stop_type = 'tp'), replace(format(sr.trigger_price, devel.vip.digits), ',', ''), NULL) AS tpTriggerPrice,
	if((sr.stop_type = 'tp'), replace(format(sr.order_price, devel.vip.digits), ',', ''), NULL) AS tpOrderPrice,
	if((sr.stop_type = 'sl'), replace(format(sr.trigger_price, devel.vip.digits), ',', ''), NULL) AS slTriggerPrice,
	if((sr.stop_type = 'sl'), replace(format(sr.order_price, devel.vip.digits), ',', ''), NULL) AS slOrderPrice,
	sr.reduce_only AS reduceOnly,
	concat(lower(cast(hex(sr.stop_request) as char charset utf8mb4)), '-', sr.stop_type) AS clientOrderId
from
	((devel.stop_request sr
join devel.state s on
	((sr.state = s.state)))
join devel.vw_instrument_positions vip on
	((sr.instrument_position = devel.vip.instrument_position)));

CREATE VIEW devel.vw_audit_candles AS
select
	audit.instrument AS instrument,
	audit.symbol AS symbol,
	audit.period AS period,
	audit.timeframe AS timeframe,
	audit.hour AS hour,
	audit.entries AS entries
from
	((
	select
		devel.vc.instrument AS instrument,
		devel.vc.symbol AS symbol,
		devel.vc.period AS period,
		devel.vc.timeframe AS timeframe,
		cast(date_format(devel.vc.bar_time, '%Y-%m-%d %k:00:00') as datetime) AS hour,
		count(0) AS entries
	from
		devel.vw_candles vc
	group by
		devel.vc.instrument,
		devel.vc.symbol,
		devel.vc.period,
		devel.vc.timeframe,
		cast(date_format(devel.vc.bar_time, '%Y-%m-%d %k:00:00') as datetime)
	having
		(entries < 4)) audit
join (
	select
		c.instrument AS instrument,
		c.period AS period,
		min(cast(date_format(c.bar_time, '%Y-%m-%d %k:00:00') as datetime)) AS hour
	from
		devel.candle c
	group by
		c.instrument,
		c.period) exclusions on
	(((audit.instrument = exclusions.instrument) and (audit.period = exclusions.period))))
where
	(audit.hour > exclusions.hour)
order by
	audit.symbol,
	audit.timeframe,
	audit.hour desc;
ALTER TABLE devel.cancel_source COMMENT 'not_canceled
user_canceled
system_canceled';

ALTER TABLE devel.fractal_state COMMENT 'Rally
Pullback
Retrace
Correction
Recovery
Breakout
Reversal
Extension';

ALTER TABLE devel.margin_mode COMMENT 'Margin mode
cross
isolated';

ALTER TABLE devel.order_category COMMENT 'normal
full_liquidation
partial_liquidation
adl
tp
sl';

ALTER TABLE devel.order_state COMMENT 'live, effective, canceled, order_failed, filled, partially_canceled, partially_filled';

ALTER TABLE devel.point_type COMMENT 'Origin
Base
Root
Expansion
Retrace
Recovery
Close';

ALTER TABLE devel.price_type COMMENT 'Trigger price type.
last: last price
index: index price
mark: mark price';

ALTER TABLE devel.request_type COMMENT 'market: market order
limit: limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order';

ALTER TABLE devel.fractal_fibonacci MODIFY fractal_type CHAR(10)  NOT NULL   COMMENT 'Retrace
Extension';

