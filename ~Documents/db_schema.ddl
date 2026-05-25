DROP SCHEMA devel;
CREATE SCHEMA devel;
ALTER DATABASE devel CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_as_cs;

USE devel;

CREATE  TABLE devel.api_error ( 
	error_code           INT   NOT NULL    PRIMARY KEY,
	http_status_code     SMALLINT   NOT NULL    ,
	error_message        VARCHAR(200)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.audit_request ( 
	request              BINARY(6)       ,
	old_state            BINARY(3)       ,
	new_state            BINARY(3)       ,
	update_time          DATETIME(6)       
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.broker ( 
	broker               BINARY(3)   NOT NULL    PRIMARY KEY,
	name                 VARCHAR(30)   NOT NULL    ,
	image_url            VARCHAR(60)   NOT NULL    ,
	website_url          VARCHAR(60)   NOT NULL    ,
	CONSTRAINT ak_broker UNIQUE ( name ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.broker_api ( 
	broker_api           BINARY(3)   NOT NULL    PRIMARY KEY,
	broker               BINARY(3)   NOT NULL    ,
	environment          VARCHAR(20)   NOT NULL    ,
	ident                CHAR(4)   NOT NULL    ,
	auth_rank            SMALLINT UNSIGNED  NOT NULL    ,
	description          VARCHAR(100)   NOT NULL    ,
	rest_api_url         VARCHAR(100)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	private_wss_url      VARCHAR(100)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	public_wss_url       VARCHAR(100)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	CONSTRAINT ak_broker_api UNIQUE ( broker, environment ) ,
	CONSTRAINT uk_ba_ident UNIQUE ( ident ) ,
	CONSTRAINT uk_ba_rest_api_url UNIQUE ( rest_api_url ) ,
	CONSTRAINT uk_private_wss_url UNIQUE ( private_wss_url ) ,
	CONSTRAINT fk_ba_broker FOREIGN KEY ( broker ) REFERENCES devel.broker( broker ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX uk_public_wss_url ON devel.broker_api ( public_wss_url );

CREATE INDEX fk_ba_broker ON devel.broker_api ( broker );

CREATE  TABLE devel.cancel_source ( 
	cancel_source        BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(15)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	source               VARCHAR(12)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_cancel UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.cancel_source COMMENT 'not_canceled
user_canceled
system_canceled';

CREATE  TABLE devel.command ( 
	command              BINARY(1)   NOT NULL    PRIMARY KEY,
	execute              VARCHAR(15)   NOT NULL    ,
	description          VARCHAR(50)   NOT NULL    ,
	CONSTRAINT ak_command UNIQUE ( execute ) 
 ) engine=InnoDB;

CREATE  TABLE devel.config_param ( 
	config_param         VARCHAR(64)   NOT NULL    PRIMARY KEY,
	default_param_value  VARCHAR(24)   NOT NULL    ,
	value_type           ENUM('int','string','bin','date','bool')   NOT NULL DEFAULT ('_utf8mb4'string'')   ,
	state                BINARY(3)   NOT NULL    
 ) engine=InnoDB;

CREATE INDEX fk_cp_state ON devel.config_param ( state );

CREATE  TABLE devel.contract_type ( 
	contract_type        BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_contract_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.currency ( 
	currency             BINARY(3)   NOT NULL    PRIMARY KEY,
	symbol               VARCHAR(20)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	image_url            VARCHAR(300)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	CONSTRAINT ak_currency UNIQUE ( symbol ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fibonacci ( 
	fibonacci            BINARY(3)   NOT NULL    PRIMARY KEY,
	level                TINYINT   NOT NULL    ,
	percent              DECIMAL(5,3)   NOT NULL    ,
	alias                VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fractal ( 
	fractal              BINARY(3)   NOT NULL    PRIMARY KEY,
	instrument           BINARY(3)   NOT NULL    ,
	period               BINARY(3)   NOT NULL    ,
	position             CHAR(5)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	fibonacci            BINARY(3)       ,
	CONSTRAINT ak_fractal UNIQUE ( instrument, period, position ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.fractal_state ( 
	fractal_state        CHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.fractal_state COMMENT 'Rally
Pullback
Retrace
Correction
Recovery
Breakout
Reversal
Extension';

CREATE  TABLE devel.full_audit_request ( 
	request              BINARY(6)   NOT NULL    ,
	instrument_position  BINARY(6)   NOT NULL    ,
	action               CHAR(4)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	price                DOUBLE   NOT NULL DEFAULT (0)   ,
	size                 DOUBLE   NOT NULL    ,
	leverage             SMALLINT UNSIGNED  NOT NULL    ,
	request_type         BINARY(3)   NOT NULL    ,
	margin_mode          VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	reduce_only          BOOLEAN   NOT NULL DEFAULT (false)   ,
	memo                 VARCHAR(200)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	broker_id            VARCHAR(16)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	expiry_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.hedging ( 
	hedging              BOOLEAN   NOT NULL DEFAULT (true)   PRIMARY KEY,
	source_ref           VARCHAR(15)   NOT NULL    ,
	description          VARCHAR(20)   NOT NULL    
 ) engine=InnoDB;

ALTER TABLE devel.hedging COMMENT 'Position Mode: Hedge Mode or One-way Mode';

CREATE  TABLE devel.instrument_type ( 
	instrument_type      BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_instrument_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.margin_mode ( 
	margin_mode          VARCHAR(10)   NOT NULL    PRIMARY KEY,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.margin_mode COMMENT 'Margin mode
cross
isolated';

CREATE  TABLE devel.order_category ( 
	order_category       BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(20)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_category UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.order_category COMMENT 'normal
full_liquidation
partial_liquidation
adl
tp
sl';

CREATE  TABLE devel.order_state ( 
	order_state          BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(20)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	status               VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	CONSTRAINT ak_order_state UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.order_state COMMENT 'live, effective, canceled, order_failed, filled, partially_canceled, partially_filled';

CREATE  TABLE devel.orders ( 
	order_id             BINARY(6)   NOT NULL    PRIMARY KEY,
	client_order_id      BINARY(6)       ,
	order_category       BINARY(3)   NOT NULL    ,
	order_state          BINARY(3)   NOT NULL    ,
	cancel_source        BINARY(3)   NOT NULL    ,
	filled_size          DOUBLE   NOT NULL DEFAULT (0)   ,
	filled_amount        DOUBLE   NOT NULL DEFAULT (0)   ,
	average_price        DOUBLE   NOT NULL DEFAULT (0)   ,
	fee                  DOUBLE   NOT NULL DEFAULT (0)   ,
	pnl                  DOUBLE   NOT NULL DEFAULT (0)   ,
	CONSTRAINT fk_o_cancel_source FOREIGN KEY ( cancel_source ) REFERENCES devel.cancel_source( cancel_source ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_category FOREIGN KEY ( order_category ) REFERENCES devel.order_category( order_category ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_o_order_state FOREIGN KEY ( order_state ) REFERENCES devel.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_o_order_state ON devel.orders ( order_state );

CREATE INDEX fk_o_order_category ON devel.orders ( order_category );

CREATE INDEX fk_o_cancel_source ON devel.orders ( cancel_source );

CREATE INDEX ie_o_client_order_id ON devel.orders ( client_order_id );

CREATE  TABLE devel.period ( 
	period               BINARY(3)   NOT NULL    PRIMARY KEY,
	timeframe            VARCHAR(3)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	timeframe_minutes    INT   NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_period UNIQUE ( timeframe ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.point_type ( 
	point_type           CHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.point_type COMMENT 'Origin
Base
Root
Expansion
Retrace
Recovery
Close';

CREATE  TABLE devel.position ( 
	position             CHAR(5)   NOT NULL    PRIMARY KEY
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE devel.price_type ( 
	price_type           CHAR(5)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    PRIMARY KEY,
	description          VARCHAR(16)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.price_type COMMENT 'Trigger price type.
last: last price
index: index price
mark: mark price';

CREATE  TABLE devel.privilege ( 
	privilege            BINARY(3)   NOT NULL    PRIMARY KEY,
	name                 VARCHAR(16)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	priority             SMALLINT   NOT NULL DEFAULT (0)   ,
	CONSTRAINT ak_privilege UNIQUE ( name ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.process_state ( 
	process_state        BINARY(2)   NOT NULL    PRIMARY KEY,
	process_status       VARCHAR(15)   NOT NULL    ,
	description          VARCHAR(50)   NOT NULL    ,
	CONSTRAINT ak_process_state UNIQUE ( process_status ) 
 ) engine=InnoDB;

CREATE  TABLE devel.request_type ( 
	request_type         BINARY(3)   NOT NULL    PRIMARY KEY,
	source_ref           VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	CONSTRAINT ak_request_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.request_type COMMENT 'market: market order
limit: limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order';

CREATE  TABLE devel.role_group ( 
	role_group           BINARY(3)   NOT NULL    PRIMARY KEY,
	group_name           VARCHAR(15)   NOT NULL    ,
	short_name           VARCHAR(5)   NOT NULL    ,
	description          VARCHAR(100)   NOT NULL    ,
	CONSTRAINT ak_role_group UNIQUE ( group_name ) 
 ) engine=InnoDB;

CREATE  TABLE devel.state ( 
	state                BINARY(3)   NOT NULL    PRIMARY KEY,
	status               VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(60)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT ak_state UNIQUE ( status ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.stop_order ( 
	tpsl_id              BINARY(5)   NOT NULL    PRIMARY KEY,
	client_order_id      BINARY(5)       ,
	order_state          BINARY(3)   NOT NULL    ,
	order_category       BINARY(3)       ,
	price_type           CHAR(5)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	trigger_type         CHAR(2)       ,
	actual_size          DOUBLE       ,
	leverage             SMALLINT       ,
	CONSTRAINT uk_so_client_order_id UNIQUE ( client_order_id ) ,
	CONSTRAINT fk_so_order_state FOREIGN KEY ( order_state ) REFERENCES devel.order_state( order_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_so_order_category FOREIGN KEY ( order_category ) REFERENCES devel.order_category( order_category ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_so_price_type FOREIGN KEY ( price_type ) REFERENCES devel.price_type( price_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_so_order_state ON devel.stop_order ( order_state );

CREATE INDEX fk_so_order_category ON devel.stop_order ( order_category );

CREATE INDEX fk_so_price_type ON devel.stop_order ( price_type );

CREATE  TABLE devel.stop_type ( 
	stop_type            BINARY(1)   NOT NULL    PRIMARY KEY,
	source_ref           CHAR(2)   NOT NULL    ,
	prefix               CHAR(2)       ,
	description          VARCHAR(12)       ,
	CONSTRAINT ak_stop_type UNIQUE ( source_ref ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE  TABLE devel.task ( 
	task                 BINARY(3)   NOT NULL    PRIMARY KEY,
	name                 VARCHAR(20)   NOT NULL    ,
	description          VARCHAR(200)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	section              VARCHAR(20)   NOT NULL    ,
	icon                 VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci     ,
	sequence             SMALLINT UNSIGNED  NOT NULL    ,
	CONSTRAINT ak_task UNIQUE ( name ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.account ( 
	account              BINARY(3)   NOT NULL    PRIMARY KEY,
	broker_api           BINARY(3)   NOT NULL    ,
	alias                VARCHAR(100)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	margin_mode          VARCHAR(10)   NOT NULL    ,
	hedging              BOOLEAN   NOT NULL DEFAULT ('1')   ,
	total_equity         DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	isolated_equity      DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT ak_account UNIQUE ( broker_api, alias ) ,
	CONSTRAINT fk_a_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_hedging FOREIGN KEY ( hedging ) REFERENCES devel.hedging( hedging ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_a_broker_api FOREIGN KEY ( broker_api ) REFERENCES devel.broker_api( broker_api ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_a_state ON devel.account ( state );

CREATE INDEX fk_a_margin_mode ON devel.account ( margin_mode );

CREATE INDEX fk_a_hedging ON devel.account ( hedging );

CREATE  TABLE devel.account_config ( 
	account              BINARY(3)   NOT NULL    ,
	config_param         VARCHAR(64)   NOT NULL    ,
	param_value          VARCHAR(24)       ,
	priority             TINYINT UNSIGNED   DEFAULT (_utf8mb4'0')   ,
	create_time          DATETIME(3)    DEFAULT (now(3))   ,
	update_time          DATETIME(3)  ON UPDATE CURRENT_TIMESTAMP(3)  DEFAULT (now(3))   ,
	CONSTRAINT pk_account_config PRIMARY KEY ( account, config_param ),
	CONSTRAINT fk_ac_config_param FOREIGN KEY ( config_param ) REFERENCES devel.config_param( config_param ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ac_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ac_config_param ON devel.account_config ( config_param );

CREATE  TABLE devel.account_detail ( 
	account              BINARY(3)   NOT NULL    ,
	currency             BINARY(3)   NOT NULL    ,
	balance              DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	available            DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	currency_equity      DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	currency_isolated_equity DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	available_equity     DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	equity_usd           DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	frozen               DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	order_frozen         DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	borrow_frozen        DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	unrealized_pnl       DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	isolated_unrealized_pnl DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	coin_usd_price       DECIMAL(10,6)   NOT NULL DEFAULT (0)   ,
	margin_ratio         DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	spot_available       DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	liability            DECIMAL(15,3)   NOT NULL DEFAULT (0)   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT pk_account_detail PRIMARY KEY ( account, currency ),
	CONSTRAINT fk_ad_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ad_currency FOREIGN KEY ( currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ad_currency ON devel.account_detail ( currency );

CREATE  TABLE devel.fractal_fibonacci ( 
	fractal              BINARY(3)   NOT NULL    ,
	fractal_type         CHAR(10)  COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	fibonacci            BINARY(3)   NOT NULL    ,
	fractal_state        CHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	price                DOUBLE   NOT NULL    ,
	CONSTRAINT pk_fractal_fibonacci PRIMARY KEY ( fractal, fractal_type, fibonacci ),
	CONSTRAINT fk_ff_fibonacci FOREIGN KEY ( fibonacci ) REFERENCES devel.fibonacci( fibonacci ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal FOREIGN KEY ( fractal ) REFERENCES devel.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ff_fractal_state FOREIGN KEY ( fractal_state ) REFERENCES devel.fractal_state( fractal_state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.fractal_fibonacci ADD CONSTRAINT ck_ff_fractal_type CHECK ( fractal_type in (_utf8mb4'extension',_utf8mb4'retrace') );

CREATE INDEX fk_ff_fibonacci ON devel.fractal_fibonacci ( fibonacci );

CREATE INDEX fk_ff_fractal_state ON devel.fractal_fibonacci ( fractal_state );

ALTER TABLE devel.fractal_fibonacci MODIFY fractal_type CHAR(10)  COLLATE utf8mb4_0900_as_cs NOT NULL   COMMENT 'Retrace
Extension';

CREATE  TABLE devel.fractal_point ( 
	fractal              BINARY(3)   NOT NULL    ,
	point_type           CHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	price                DOUBLE   NOT NULL    ,
	create_time          DATETIME   NOT NULL    ,
	CONSTRAINT pk_fractal_point PRIMARY KEY ( fractal, point_type ),
	CONSTRAINT fk_p_point_type FOREIGN KEY ( point_type ) REFERENCES devel.point_type( point_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_point_fractal FOREIGN KEY ( fractal ) REFERENCES devel.fractal( fractal ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_fp_point_type ON devel.fractal_point ( point_type );

CREATE  TABLE devel.instrument ( 
	instrument           BINARY(3)   NOT NULL    PRIMARY KEY,
	account              BINARY(3)   NOT NULL    ,
	base_currency        BINARY(3)   NOT NULL    ,
	quote_currency       BINARY(3)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT ak_instrument UNIQUE ( account, base_currency, quote_currency ) ,
	CONSTRAINT fk_i_base_currency FOREIGN KEY ( base_currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_quote_currency FOREIGN KEY ( quote_currency ) REFERENCES devel.currency( currency ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_i_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_i_quote_currency ON devel.instrument ( quote_currency );

CREATE INDEX fk_i_base_currency ON devel.instrument ( base_currency );

CREATE INDEX fk_i_state ON devel.instrument ( state );

CREATE  TABLE devel.instrument_detail ( 
	instrument           BINARY(3)   NOT NULL    PRIMARY KEY,
	instrument_type      BINARY(3)   NOT NULL    ,
	contract_type        BINARY(3)   NOT NULL    ,
	contract_value       DECIMAL(17,5)   NOT NULL    ,
	max_leverage         SMALLINT UNSIGNED  NOT NULL    ,
	min_size             DECIMAL(5,3)   NOT NULL    ,
	lot_size             DECIMAL(5,3)   NOT NULL    ,
	tick_size            DOUBLE   NOT NULL    ,
	max_limit_size       DECIMAL(13,2)   NOT NULL    ,
	max_market_size      DECIMAL(13,2)   NOT NULL    ,
	list_time            DATETIME(3)   NOT NULL    ,
	expiry_time          DATETIME(3)   NOT NULL    ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT fk_id_contract_type FOREIGN KEY ( contract_type ) REFERENCES devel.contract_type( contract_type ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_id_instrument_type FOREIGN KEY ( instrument_type ) REFERENCES devel.instrument_type( instrument_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_id_instrument_type ON devel.instrument_detail ( instrument_type );

CREATE INDEX fk_id_contract_type ON devel.instrument_detail ( contract_type );

CREATE  TABLE devel.instrument_position ( 
	instrument_position  BINARY(6)   NOT NULL    PRIMARY KEY,
	instrument           BINARY(3)   NOT NULL    ,
	position             CHAR(5)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	leverage             SMALLINT UNSIGNED  NOT NULL DEFAULT (0)   ,
	period               BINARY(3)       ,
	sma                  SMALLINT UNSIGNED  NOT NULL DEFAULT (0)   ,
	lot_scale            DECIMAL(5,2)   NOT NULL DEFAULT (0)   ,
	martingale           DECIMAL(5,2)   NOT NULL DEFAULT (_utf8mb4'0.00')   ,
	strict_stops         BOOLEAN   NOT NULL DEFAULT (false)   ,
	strict_targets       BOOLEAN   NOT NULL DEFAULT (false)   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	close_time           DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT ak_instrument_position UNIQUE ( instrument, position ) ,
	CONSTRAINT fk_ipos_position FOREIGN KEY ( position ) REFERENCES devel.position( position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ipos_period FOREIGN KEY ( period ) REFERENCES devel.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_ipos_state ON devel.instrument_position ( state );

CREATE INDEX fk_ipos_position ON devel.instrument_position ( position );

CREATE INDEX fk_ipos_instrument ON devel.instrument_position ( instrument );

CREATE INDEX fk_ipos_period ON devel.instrument_position ( period );

CREATE  TABLE devel.job_control_master ( 
	job_control_master   BINARY(6)   NOT NULL    PRIMARY KEY,
	account              BINARY(3)   NOT NULL    ,
	process_master       BINARY(7)       ,
	job_title            VARCHAR(24)   NOT NULL    ,
	auto_start           BOOLEAN   NOT NULL    ,
	CONSTRAINT ak_jc_process_master UNIQUE ( process_master ) ,
	CONSTRAINT fk_jc_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_jc_account ON devel.job_control_master ( account );

CREATE  TABLE devel.job_control_worker ( 
	job_control_worker   BINARY(7)   NOT NULL    PRIMARY KEY,
	instrument_position  BINARY(6)   NOT NULL    ,
	auto_start           BOOLEAN   NOT NULL    ,
	CONSTRAINT fk_jcw_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_jcw_instrument_position ON devel.job_control_worker ( instrument_position );

CREATE  TABLE devel.positions ( 
	positions            BINARY(6)   NOT NULL    PRIMARY KEY,
	instrument_position  BINARY(6)   NOT NULL    ,
	size                 DOUBLE   NOT NULL    ,
	size_available       DOUBLE   NOT NULL    ,
	leverage             SMALLINT UNSIGNED  NOT NULL    ,
	margin_mode          VARCHAR(10)  COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	margin_used          DOUBLE   NOT NULL DEFAULT (0)   ,
	margin_ratio         DECIMAL(12,3)   NOT NULL    ,
	margin_initial       DOUBLE   NOT NULL    ,
	margin_maint         DOUBLE   NOT NULL    ,
	average_price        DOUBLE   NOT NULL    ,
	mark_price           DOUBLE   NOT NULL    ,
	liquidation_price    DOUBLE   NOT NULL    ,
	unrealized_pnl       DOUBLE   NOT NULL    ,
	unrealized_pnl_ratio DECIMAL(12,3)   NOT NULL    ,
	adl                  SMALLINT   NOT NULL DEFAULT (0)   ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT fk_p_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_p_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_p_margin_mode ON devel.positions ( margin_mode );

CREATE INDEX fk_p_instrument_position ON devel.positions ( instrument_position );

CREATE  TABLE devel.process_master ( 
	process_master       BINARY(7)   NOT NULL    PRIMARY KEY,
	pid                  BIGINT UNSIGNED  NOT NULL    ,
	process_state        BINARY(2)   NOT NULL    ,
	process_name         VARCHAR(16)   NOT NULL    ,
	command              BINARY(1)   NOT NULL    ,
	start_time           DATETIME(3)   NOT NULL    ,
	stop_time            DATETIME(3)       ,
	last_heartbeat       DATETIME(3)   NOT NULL    ,
	CONSTRAINT fk_pm_job_control FOREIGN KEY ( process_master ) REFERENCES devel.job_control_master( process_master ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_pm_process_state FOREIGN KEY ( process_state ) REFERENCES devel.process_state( process_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_pm_command FOREIGN KEY ( command ) REFERENCES devel.command( command ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX ie_pm_pid ON devel.process_master ( pid );

CREATE INDEX fk_pm_process_state ON devel.process_master ( process_state );

CREATE INDEX fk_pm_command ON devel.process_master ( command );

CREATE  TABLE devel.process_worker ( 
	process_master       BINARY(7)   NOT NULL    ,
	pid                  BIGINT UNSIGNED  NOT NULL    ,
	job_control_worker   BINARY(7)   NOT NULL    ,
	process_state        BINARY(2)   NOT NULL    ,
	command              BINARY(1)   NOT NULL    ,
	start_time           DATETIME(3)   NOT NULL    ,
	stop_time            DATETIME(3)       ,
	last_heartbeat       DATETIME(3)   NOT NULL    ,
	CONSTRAINT pk_process_worker PRIMARY KEY ( process_master, pid ),
	CONSTRAINT fk_pw_process_master FOREIGN KEY ( process_master ) REFERENCES devel.process_master( process_master ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_pw_process_state FOREIGN KEY ( process_state ) REFERENCES devel.process_state( process_state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_pw_command FOREIGN KEY ( command ) REFERENCES devel.command( command ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_pw_job_control_worker FOREIGN KEY ( job_control_worker ) REFERENCES devel.job_control_worker( job_control_worker ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_pw_job_control ON devel.process_worker ( job_control_worker );

CREATE INDEX fk_pw_pid ON devel.process_worker ( pid );

CREATE INDEX fk_pw_process_state ON devel.process_worker ( process_state );

CREATE INDEX fk_pw_command ON devel.process_worker ( command );

CREATE  TABLE devel.request ( 
	request              BINARY(6)   NOT NULL    PRIMARY KEY,
	instrument_position  BINARY(6)   NOT NULL    ,
	action               CHAR(4)  COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	price                DOUBLE   NOT NULL DEFAULT (0)   ,
	size                 DOUBLE   NOT NULL    ,
	leverage             SMALLINT UNSIGNED  NOT NULL    ,
	request_type         BINARY(3)   NOT NULL    ,
	margin_mode          VARCHAR(10)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	reduce_only          BOOLEAN   NOT NULL DEFAULT ('1')   ,
	memo                 VARCHAR(200)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	broker_id            VARCHAR(16)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs     ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	expiry_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
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

CREATE  TABLE devel.response_log ( 
	process_master       BINARY(7)   NOT NULL    ,
	pid                  BIGINT UNSIGNED      ,
	event_time           DATETIME(3)   NOT NULL    ,
	CONSTRAINT fk_rl_process_master FOREIGN KEY ( process_master ) REFERENCES devel.process_master( process_master ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_rl_process_master ON devel.response_log ( process_master );

CREATE  TABLE devel.role ( 
	role                 BINARY(3)   NOT NULL    PRIMARY KEY,
	role_group           BINARY(3)   NOT NULL    ,
	title                VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	description          VARCHAR(50)   NOT NULL    ,
	auth_rank            SMALLINT UNSIGNED  NOT NULL DEFAULT (10)   ,
	CONSTRAINT ak_role UNIQUE ( role_group, title ) ,
	CONSTRAINT fk_rg_group FOREIGN KEY ( role_group ) REFERENCES devel.role_group( role_group ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE  TABLE devel.role_privilege ( 
	role                 BINARY(3)   NOT NULL    ,
	privilege            BINARY(3)   NOT NULL    ,
	task                 BINARY(3)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	CONSTRAINT pk_role_privilege PRIMARY KEY ( role, privilege, task ),
	CONSTRAINT fk_rp_privilege FOREIGN KEY ( privilege ) REFERENCES devel.privilege( privilege ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_rp_task FOREIGN KEY ( task ) REFERENCES devel.task( task ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_rp_role FOREIGN KEY ( role ) REFERENCES devel.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_rp_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_rp_privilege ON devel.role_privilege ( privilege );

CREATE INDEX fk_rp_task ON devel.role_privilege ( task );

CREATE INDEX fk_rp_state ON devel.role_privilege ( state );

CREATE  TABLE devel.stop_request ( 
	stop_request         BINARY(5)   NOT NULL    PRIMARY KEY,
	instrument_position  BINARY(6)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	margin_mode          VARCHAR(10)   NOT NULL    ,
	action               CHAR(4)   NOT NULL    ,
	size                 DOUBLE       ,
	reduce_only          BOOLEAN   NOT NULL DEFAULT (_utf8mb4'1')   ,
	broker_id            VARCHAR(16)       ,
	memo                 VARCHAR(100)       ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	CONSTRAINT fk_sr_instrument_position FOREIGN KEY ( instrument_position ) REFERENCES devel.instrument_position( instrument_position ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sr_margin_mode FOREIGN KEY ( margin_mode ) REFERENCES devel.margin_mode( margin_mode ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

ALTER TABLE devel.stop_request ADD CONSTRAINT ck_sr_action CHECK ( action in (_utf8mb4'buy',_utf8mb4'sell') );

CREATE INDEX fk_sr_instrument_position ON devel.stop_request ( instrument_position );

CREATE INDEX fk_sr_state ON devel.stop_request ( state );

CREATE INDEX ie_sr_update_time ON devel.stop_request ( stop_request, update_time );

CREATE INDEX fk_sr_margin_mode ON devel.stop_request ( margin_mode );

CREATE  TABLE devel.user ( 
	user               BINARY(3)   NOT NULL    PRIMARY KEY,
	state                BINARY(3)   NOT NULL    ,
	role                 BINARY(3)   NOT NULL    ,
	email                VARCHAR(80)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	username             VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	password             BINARY(32)   NOT NULL    ,
	hash                 BINARY(16)   NOT NULL    ,
	image_url            VARCHAR(60)   NOT NULL    ,
	create_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	update_time          DATETIME(3)   NOT NULL DEFAULT (now(3))   ,
	logon_time           DATETIME(3)       ,
	CONSTRAINT ak_user UNIQUE ( username, email ) ,
	CONSTRAINT fk_u_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_u_role FOREIGN KEY ( role ) REFERENCES devel.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_u_state ON devel.user ( state );

CREATE INDEX fk_u_role ON devel.user ( role );

CREATE  TABLE devel.user_account ( 
	user               BINARY(3)   NOT NULL    ,
	account              BINARY(3)   NOT NULL    ,
	role                 BINARY(3)   NOT NULL    ,
	state                BINARY(3)   NOT NULL    ,
	alias                VARCHAR(30)  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL    ,
	CONSTRAINT pk_user_account PRIMARY KEY ( user, account ),
	CONSTRAINT fk_ua_user FOREIGN KEY ( user ) REFERENCES devel.user( user ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_account FOREIGN KEY ( account ) REFERENCES devel.account( account ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_role FOREIGN KEY ( role ) REFERENCES devel.role( role ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_ua_state FOREIGN KEY ( state ) REFERENCES devel.state( state ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_ua_account ON devel.user_account ( account );

CREATE INDEX fk_ua_role ON devel.user_account ( role );

CREATE INDEX fk_ua_state ON devel.user_account ( state );

CREATE  TABLE devel.candle ( 
	instrument           BINARY(3)   NOT NULL    ,
	period               BINARY(3)   NOT NULL    ,
	timestamp            BIGINT   NOT NULL    ,
	open                 DOUBLE   NOT NULL    ,
	high                 DOUBLE   NOT NULL    ,
	low                  DOUBLE   NOT NULL    ,
	close                DOUBLE   NOT NULL    ,
	volume               INT   NOT NULL    ,
	vol_currency         DECIMAL(24,12)   NOT NULL    ,
	vol_currency_quote   DECIMAL(24,12)   NOT NULL    ,
	completed            BOOLEAN   NOT NULL    ,
	CONSTRAINT pk_candle PRIMARY KEY ( instrument, period, timestamp ),
	CONSTRAINT fk_c_instrument FOREIGN KEY ( instrument ) REFERENCES devel.instrument( instrument ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_c_period FOREIGN KEY ( period ) REFERENCES devel.period( period ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

CREATE INDEX fk_c_period ON devel.candle ( period );

CREATE  TABLE devel.stop_price ( 
	stop_request         BINARY(5)   NOT NULL    ,
	stop_type            BINARY(1)   NOT NULL    ,
	trigger_price        DOUBLE       ,
	order_price          DOUBLE       ,
	CONSTRAINT pk_stop_price PRIMARY KEY ( stop_request, stop_type ),
	CONSTRAINT fk_sp_stop_request FOREIGN KEY ( stop_request ) REFERENCES devel.stop_request( stop_request ) ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT fk_sp_stop_type FOREIGN KEY ( stop_type ) REFERENCES devel.stop_type( stop_type ) ON DELETE NO ACTION ON UPDATE NO ACTION
 ) engine=InnoDB;

CREATE INDEX fk_sp_stop_type ON devel.stop_price ( stop_type );

CREATE VIEW devel.vw_account_config AS
select
	ac.account AS account,
	ac.config_param AS config_param,
	ac.priority AS priority,
	coalesce(ac.param_value, cp.default_param_value) AS param_value,
	cp.value_type AS value_type,
	cp.state AS state,
	ac.create_time AS create_time,
	ac.update_time AS update_time
from
	(devel.account_config ac
join devel.config_param cp on
	((cp.config_param = ac.config_param)));

CREATE VIEW devel.vw_accounts AS
select
	a.account AS account,
	a.alias AS alias,
	a.state AS state,
	s.status AS status,
	ba.broker AS broker,
	ba.broker_api AS broker_api,
	ba.ident AS ident,
	ba.environment AS environment,
	ba.description AS description,
	a.margin_mode AS margin_mode,
	a.hedging AS hedging,
	b.name AS broker_name,
	b.image_url AS broker_image_url,
	b.website_url AS broker_website_url,
	a.total_equity AS total_equity,
	a.isolated_equity AS isolated_equity,
	ba.rest_api_url AS rest_api_url,
	ba.private_wss_url AS private_wss_url,
	ba.public_wss_url AS public_wss_url,
	c.currency AS currency,
	c.symbol AS account_currency,
	c.image_url AS currency_image_url,
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
	(((((devel.account a
left join devel.account_detail ad on
	((ad.account = a.account)))
left join devel.currency c on
	((c.currency = ad.currency)))
join devel.broker_api ba on
	((ba.broker_api = a.broker_api)))
join devel.broker b on
	((b.broker = ba.broker)))
join devel.state s on
	((s.state = a.state)));

CREATE VIEW devel.vw_api_requests AS
select
	i.account AS account,
	conv(hex(o.order_id), 16, 10) AS orderId,
	if((rs.status = 'Queued'), 'Queued', ifnull(os.status, rs.status)) AS status,
	concat(b.symbol, '-', q.symbol) AS instId,
	r.margin_mode AS marginMode,
	ipos.position AS positionSide,
	r.action AS side,
	rt.source_ref AS orderType,
	replace(format(r.price, coalesce(length(substring_index(id.tick_size, '.',-(1))), 0)), ',', '') AS price,
	replace(format(r.size, coalesce(length(substring_index(id.tick_size, '.',-(1))), 0)), ',', '') AS size,
	cast(r.leverage as char charset utf8mb4) AS leverage,
	if((r.reduce_only = 0), 'false', 'true') AS reduceOnly,
	r.broker_id AS brokerId,
	cast(hex(r.request) as char charset utf8mb4) AS clientOrderId,
	r.memo AS memo,
	r.expiry_time AS expiry_time
from
	((((((((((devel.request r
left join (
	select
		max(devel.orders.order_id) AS order_id,
		devel.orders.client_order_id AS client_order_id
	from
		devel.orders
	where
		(devel.orders.client_order_id is not null)
	group by
		devel.orders.client_order_id
union
	select
		devel.orders.order_id AS order_id,
		devel.orders.order_id AS client_order_id
	from
		devel.orders
	where
		(devel.orders.client_order_id is null)) oreq on
	((oreq.client_order_id = r.request)))
left join devel.orders o on
	((o.order_id = oreq.order_id)))
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

CREATE VIEW devel.vw_api_stop_requests AS with Instruments as (
select
	i.instrument AS instrument,
	i.account AS account,
	concat(b.symbol, '-', q.symbol) AS symbol,
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits
from
	(((devel.instrument i
join devel.instrument_detail id on
	((id.instrument = i.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))),
StopPrice as (
select
	ipos.instrument_position AS instrument_position,
	i.account AS account,
	i.symbol AS symbol,
	sr.stop_request AS stop_request,
	max((case when (st.source_ref = 'tp') then replace(format(sp.trigger_price, i.digits, 'en_US'), ',', '') end)) AS tp_trigger_price,
	max((case when (st.source_ref = 'tp') then replace(format(sp.order_price, i.digits, 'en_US'), ',', '') end)) AS tp_order_price,
	max((case when (st.source_ref = 'sl') then replace(format(sp.trigger_price, i.digits, 'en_US'), ',', '') end)) AS sl_trigger_price,
	max((case when (st.source_ref = 'sl') then replace(format(sp.order_price, i.digits, 'en_US'), ',', '') end)) AS sl_order_price
from
	((((devel.stop_request sr
join devel.stop_price sp on
	((sp.stop_request = sr.stop_request)))
join devel.instrument_position ipos on
	((ipos.instrument_position = sr.instrument_position)))
join Instruments i on
	((i.instrument = ipos.instrument)))
join devel.stop_type st on
	((st.stop_type = sp.stop_type)))
group by
	ipos.instrument_position,
	i.account,
	sr.stop_request),
StopOrderKeys as (
select
	coalesce(so.client_order_id, max(so.tpsl_id)) AS stop_request,
	max(so.tpsl_id) AS tpsl_id
from
	devel.stop_order so
group by
	so.client_order_id)
select
	sp.account AS account,
	sr.stop_request AS stop_request,
	conv(hex(so.tpsl_id), 16, 10) AS tpslId,
	ps.status AS position_status,
	s.status AS status,
	sp.symbol AS instId,
	ipos.position AS positionSide,
	sr.margin_mode AS marginMode,
	sr.action AS side,
	sr.size AS size,
	sp.sl_trigger_price AS slTriggerPrice,
	sp.sl_order_price AS slOrderPrice,
	sp.tp_trigger_price AS tpTriggerPrice,
	sp.tp_order_price AS tpOrderPrice,
	if((sr.reduce_only = 0), 'false', 'true') AS reduceOnly,
	conv(hex(so.client_order_id), 16, 10) AS clientOrderId,
	sr.broker_id AS brokerId,
	sr.memo AS memo,
	sr.update_time AS update_time
from
	((((((devel.stop_request sr
join StopPrice sp on
	((sp.stop_request = sr.stop_request)))
left join StopOrderKeys sok on
	((sok.stop_request = sr.stop_request)))
left join devel.stop_order so on
	((so.tpsl_id = sok.tpsl_id)))
join devel.instrument_position ipos on
	((ipos.instrument_position = sr.instrument_position)))
join devel.state ps on
	((ps.state = ipos.state)))
join devel.state s on
	((s.state = sr.state)));

CREATE VIEW devel.vw_audit_requests AS
select
	i.account AS account,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	ipos.position AS position,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	summary.state AS state,
	summary.status AS status,
	summary.occurs AS occurs
from
	((((devel.instrument_position ipos
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join (
	select
		ipos.instrument_position AS instrument_position,
		r.state AS state,
		rs.status AS status,
		count(r.state) AS occurs
	from
		((devel.instrument_position ipos
	join devel.request r on
		((r.instrument_position = ipos.instrument_position)))
	join devel.state rs on
		((rs.state = r.state)))
	group by
		ipos.instrument_position,
		r.state,
		rs.status) summary on
	((summary.instrument_position = ipos.instrument_position)));

CREATE VIEW devel.vw_audit_role_privs AS
select
	r.role AS role,
	auth.privilege AS privilege,
	t.task AS task,
	s.state AS state
from
	(((devel.privilege auth
join devel.role r)
join devel.task t)
join devel.state s on
	((s.status = 'Disabled')))
where
	(r.role,
	auth.privilege,
	t.task) in (
	select
		r.role,
		auth.privilege,
		t.task
	from
		devel.role_privilege) is false;

CREATE VIEW devel.vw_audit_states AS
select
	i.account AS account,
	r.request AS request,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	ipos.position AS position,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	os.state AS old_state,
	os.status AS status,
	ns.state AS new_state,
	ns.status AS new_status,
	ar.update_time AS update_time
from
	(((((((devel.audit_request ar
join devel.request r on
	((r.request = ar.request)))
join devel.instrument_position ipos on
	((ipos.instrument_position = r.instrument_position)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.state os on
	((os.state = ar.old_state)))
join devel.state ns on
	((ns.state = ar.new_state)));

CREATE VIEW devel.vw_candles AS
select
	i.account AS account,
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_minutes AS timeframe_minutes,
	c.timestamp AS timestamp,
	from_unixtime((c.timestamp / 1000)) AS bar_time,
	c.open AS open,
	c.high AS high,
	c.low AS low,
	c.close AS close,
	c.volume AS volume,
	c.vol_currency AS vol_currency,
	c.vol_currency_quote AS vol_currency_quote,
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits,
	c.completed AS completed
from
	(((((devel.candle c
join devel.instrument i on
	((i.instrument = c.instrument)))
join devel.instrument_detail id on
	((id.instrument = i.instrument)))
join devel.period p on
	((p.period = c.period)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)));

CREATE VIEW devel.vw_currency AS
select
	c.currency AS currency,
	c.symbol AS symbol,
	c.image_url AS image_url
from
	devel.currency c;

CREATE VIEW devel.vw_instrument_candles AS
select
	i.account AS account,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_minutes AS timeframe_minutes,
	c.timestamp AS timestamp,
	cast(ac.param_value as unsigned) AS candle_max_fetch
from
	((((((devel.instrument_position ipos
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.account_config ac on
	(((ac.account = i.account) and (ac.config_param = 'candleMaxFetch'))))
join (
	select
		c.instrument AS instrument,
		c.period AS period,
		max(c.timestamp) AS timestamp
	from
		devel.candle c
	group by
		c.instrument,
		c.period) c on
	(((c.instrument = ipos.instrument) and (c.period = ipos.period))))
join devel.period p on
	((p.period = ipos.period)));

CREATE VIEW devel.vw_instrument_positions AS
select
	a.account AS account,
	a.alias AS alias,
	ipos.instrument_position AS instrument_position,
	i.instrument AS instrument,
	concat(bc.symbol, '-', qc.symbol) AS symbol,
	bc.currency AS base_currency,
	bc.symbol AS base_symbol,
	qc.currency AS quote_currency,
	qc.symbol AS quote_symbol,
	ipos.position AS position,
	ba.broker_api AS broker_api,
	ba.ident AS ident,
	ba.environment AS environment,
	a.hedging AS hedging,
	coalesce(ipos.state, disabled.state) AS state,
	coalesce(s.status, disabled.status) AS status,
	if((ipos.period is null), disabled.state, si.state) AS auto_state,
	if((ipos.period is null), disabled.status, si.status) AS auto_status,
	si.state AS instrument_state,
	si.status AS instrument_status,
	p.period AS period,
	p.timeframe AS timeframe,
	p.timeframe_minutes AS timeframe_minutes,
	a.margin_mode AS margin_mode,
	coalesce(nullif(ipos.leverage, 0), cast(devel.dleverage.param_value as unsigned)) AS leverage,
	id.max_leverage AS max_leverage,
	coalesce(ipos.lot_scale, 0) AS lot_scale,
	coalesce(ipos.martingale, 0) AS martingale,
	coalesce(nullif(ipos.sma, 0), cast(devel.dsma.param_value as unsigned)) AS sma,
	coalesce(ipos.strict_stops, 0) AS strict_stops,
	coalesce(ipos.strict_targets, 0) AS strict_targets,
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits,
	coalesce(r.open_request, 0) AS open_request,
	coalesce(tpsl.open_take_profit, 0) AS open_take_profit,
	coalesce(tpsl.open_stop_loss, 0) AS open_stop_loss,
	r.create_time AS create_time,
	ipos.close_time AS close_time,
	ipos.update_time AS update_time
from
	((((((((((((((devel.account a
join devel.instrument i on
	((i.account = a.account)))
join devel.instrument_position ipos on
	((ipos.instrument = i.instrument)))
join devel.vw_account_config dsma on
	(((devel.dsma.account = i.account) and (devel.dsma.config_param = 'defaultSma'))))
join devel.vw_account_config dleverage on
	(((devel.dleverage.account = i.account) and (devel.dleverage.config_param = 'defaultLeverage'))))
join devel.broker_api ba on
	((ba.broker_api = a.broker_api)))
join devel.instrument_detail id on
	((id.instrument = i.instrument)))
join devel.currency bc on
	((bc.currency = i.base_currency)))
join devel.currency qc on
	((qc.currency = i.quote_currency)))
left join devel.state s on
	((ipos.state = s.state)))
join devel.state si on
	((si.state = i.state)))
left join devel.period p on
	((p.period = ipos.period)))
join devel.state disabled on
	((disabled.status = 'Disabled')))
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
		count(tp.stop_type) AS open_take_profit,
		count(sl.stop_type) AS open_stop_loss
	from
		(((((devel.state s
	join devel.stop_request sr on
		(((sr.state = s.state) and (s.status in ('Pending', 'Queued')))))
	join devel.stop_type ttp on
		((ttp.source_ref = 'tp')))
	join devel.stop_type tsl on
		((tsl.source_ref = 'sl')))
	left join devel.stop_price tp on
		(((tp.stop_request = sr.stop_request) and (tp.stop_type = ttp.stop_type))))
	left join devel.stop_price sl on
		(((sl.stop_request = sr.stop_request) and (sl.stop_type = tsl.stop_type))))
	group by
		sr.instrument_position) tpsl on
	((tpsl.instrument_position = ipos.instrument_position)));

CREATE VIEW devel.vw_instruments AS
select
	a.account AS account,
	a.alias AS account_alias,
	b.broker AS broker,
	b.name AS broker_name,
	ua.alias AS user_alias,
	i.instrument AS instrument,
	concat(bc.symbol, '-', qc.symbol) AS symbol,
	bc.currency AS base_currency,
	bc.symbol AS base_symbol,
	qc.currency AS quote_currency,
	qc.symbol AS quote_symbol,
	ba.ident AS ident,
	ba.environment AS environment,
	it.source_ref AS instrument_type,
	ct.source_ref AS contract_type,
	id.contract_value AS contract_value,
	a.hedging AS hedging,
	a.margin_mode AS margin_mode,
	id.max_leverage AS max_leverage,
	id.min_size AS min_size,
	id.max_limit_size AS max_limit_size,
	id.max_market_size AS max_market_size,
	id.lot_size AS lot_size,
	id.tick_size AS tick_size,
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits,
	s.state AS state,
	s.status AS status,
	id.list_time AS list_time,
	id.expiry_time AS expiry_time,
	id.update_time AS update_time,
	i.create_time AS create_time
from
	((((((((((devel.instrument i
join devel.account a on
	((a.account = i.account)))
join devel.broker_api ba on
	((ba.broker_api = a.broker_api)))
join devel.broker b on
	((b.broker = ba.broker)))
join devel.user_account ua on
	((ua.account = i.account)))
join devel.currency bc on
	((bc.currency = i.base_currency)))
join devel.currency qc on
	((qc.currency = i.quote_currency)))
join devel.state s on
	((s.state = i.state)))
left join devel.instrument_detail id on
	((id.instrument = i.instrument)))
left join devel.instrument_type it on
	((it.instrument_type = id.instrument_type)))
left join devel.contract_type ct on
	((ct.contract_type = id.contract_type)));

CREATE VIEW devel.vw_job_control AS
select
	ipos.instrument_position AS instrument_position,
	ua.account AS account,
	a.alias AS alias,
	(case
		when (a.account = b.prod_account) then 'Prod'
		when (a.account = b.demo_account) then 'Demo'
		else 'Test'
	end) AS environ,
	if((ua.nickname = ''), a.alias, ua.nickname) AS nickname,
	(case
		when (jc.instrument_position is null) then 'Unprovisioned'
		when (ipos.period is null) then 'Unprovisioned'
		when (qs.status = 'Suspended') then 'Suspended'
		else bs.status
	end) AS job_status,
	jc.process_master AS process_master,
	pm.pid AS master_pid,
	pm.process_state AS master_state,
	prm.process_status AS master_status,
	ps.pid AS process_pid,
	ps.process_state AS process_state,
	prs.process_status AS process_status,
	ua.user AS user,
	r.role AS role,
	r.title AS title,
	r.auth_rank AS auth_rank,
	ipos.instrument AS instrument,
	concat(bc.symbol, '-', qc.symbol) AS symbol,
	ipos.position AS position,
	p.period AS period,
	p.timeframe AS timeframe,
	jc.command AS command,
	c.execute AS execute,
	(case
		when (jc.instrument_position is null) then false
		when (ipos.period is null) then false
		when (qs.status = 'Suspended') then false
		when (bs.status = 'Enabled') then true
		else false
	end) AS auto_start,
	jc.message AS message,
	pm.start_time AS start_time,
	pm.stop_time AS stop_time,
	if((pm.stop_time > pm.start_time),(pm.stop_time - pm.start_time),(now(3) - pm.start_time)) AS system_up_time
from
	(((((((((((((((((((devel.instrument_position ipos
join devel.user_account ua on
	((ua.account = ipos.account)))
join devel.account a on
	((a.account = ua.account)))
join devel.broker b on
	((b.broker = a.broker)))
join devel.role r on
	((r.role = ua.role)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.currency bc on
	((bc.currency = i.base_currency)))
join devel.currency qc on
	((qc.currency = i.quote_currency)))
join devel.state bs on
	((bs.state = bc.state)))
join devel.state qs on
	((qs.state = qc.state)))
join devel.state disabled on
	((disabled.status = 'Disabled')))
join devel.vw_app_config vac on
	(((devel.vac.config_param = 'defaultTimeframe') and (devel.vac.account = ua.account))))
join devel.period defaultPeriod on
	((defaultPeriod.timeframe = devel.vac.param_value)))
left join devel.period p on
	((p.period = coalesce(ipos.period, defaultPeriod.period))))
left join devel.job_control jc on
	((jc.instrument_position = ipos.instrument_position)))
left join devel.command c on
	((c.command = jc.command)))
left join devel.process_master pm on
	((pm.process_master = jc.process_master)))
left join devel.process_slave ps on
	((ps.process_master = jc.process_master)))
left join devel.process_state prs on
	((prs.process_state = ps.process_state)))
left join devel.process_state prm on
	((prm.process_state = pm.process_state)));

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
	r.request AS request,
	o.order_id AS order_id,
	i.account AS account,
	ipos.instrument AS instrument,
	ipos.instrument_position AS instrument_position,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	s.state AS state,
	s.status AS status,
	coalesce(rs.state, s.state) AS request_state,
	coalesce(os.status, s.status) AS request_status,
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
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits,
	cat.order_category AS order_category,
	cat.source_ref AS category,
	can.cancel_source AS cancel_source,
	can.source_ref AS canceled_by,
	id.contract_type AS contract_type,
	id.instrument_type AS instrument_type,
	r.reduce_only AS reduce_only,
	r.broker_id AS broker_id,
	ipos.period AS trade_period,
	p.timeframe AS trade_timeframe,
	p.timeframe_minutes AS timeframe_minutes,
	r.memo AS memo,
	r.create_time AS create_time,
	r.expiry_time AS expiry_time,
	r.update_time AS update_time
from
	((((((((((((((devel.request r
left join (
	select
		max(devel.orders.order_id) AS order_id,
		devel.orders.client_order_id AS client_order_id
	from
		devel.orders
	where
		(devel.orders.client_order_id is not null)
	group by
		devel.orders.client_order_id
union
	select
		devel.orders.order_id AS order_id,
		devel.orders.order_id AS client_order_id
	from
		devel.orders
	where
		(devel.orders.client_order_id is null)) oreq on
	((oreq.client_order_id = r.request)))
join devel.instrument_position ipos on
	((ipos.instrument_position = r.instrument_position)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.instrument_detail id on
	((id.instrument = i.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.state s on
	((r.state = s.state)))
join devel.request_type rt on
	((r.request_type = rt.request_type)))
left join devel.period p on
	((p.period = ipos.period)))
left join devel.orders o on
	((o.order_id = oreq.order_id)))
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
	i.account AS account,
	p.positions AS positions,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	ipos.position AS position,
	s.state AS state,
	s.status AS status,
	it.source_ref AS instrument_type,
	if((p.size > 0), 'buy', 'sell') AS action,
	if((p.size < 0), 'buy', 'sell') AS counter_action,
	p.size AS size,
	p.size_available AS size_available,
	p.leverage AS leverage,
	p.margin_mode AS margin_mode,
	p.margin_used AS margin_used,
	p.margin_ratio AS margin_ratio,
	p.margin_initial AS margin_initial,
	p.margin_maint AS margin_maint,
	p.average_price AS average_price,
	p.liquidation_price AS liquidation_price,
	p.mark_price AS mark_price,
	p.unrealized_pnl AS unrealized_pnl,
	p.unrealized_pnl_ratio AS unrealized_pnl_ratio,
	p.adl AS adl,
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

CREATE VIEW devel.vw_role_privs AS
select
	r.role AS role,
	r.title AS title,
	t.task AS task,
	auth.privilege AS privilege,
	concat(auth.name, ' ', t.name) AS activity,
	t.description AS description,
	auth.priority AS priority,
	r.auth_rank AS auth_rank,
	t.section AS section,
	t.icon AS icon,
	t.sequence AS sequence
from
	(((devel.role_privilege rp
join devel.role r on
	((r.role = rp.role)))
join devel.task t on
	((t.task = rp.task)))
join devel.privilege auth on
	((auth.privilege = rp.privilege)));

CREATE VIEW devel.vw_roles AS
select
	r.role AS role,
	r.title AS title,
	r.description AS description,
	r.auth_rank AS auth_rank,
	rg.role_group AS role_group,
	rg.group_name AS group_name,
	rg.short_name AS short_name
from
	(devel.role r
join devel.role_group rg on
	((rg.role_group = r.role_group)));

CREATE VIEW devel.vw_stop_orders AS with Instruments as (
select
	i.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS instId,
	coalesce(length(substring_index(id.tick_size, '.',-(1))), 0) AS digits
from
	(((devel.instrument i
join devel.instrument_detail id on
	((id.instrument = i.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))),
StopPrice as (
select
	ipos.instrument_position AS instrument_position,
	sr.stop_request AS stop_request,
	max((case when (st.source_ref = 'tp') then replace(format(sp.trigger_price, i.digits, 'en_US'), ',', '') end)) AS tp_trigger_price,
	max((case when (st.source_ref = 'tp') then replace(format(sp.order_price, i.digits, 'en_US'), ',', '') end)) AS tp_order_price,
	max((case when (st.source_ref = 'sl') then replace(format(sp.trigger_price, i.digits, 'en_US'), ',', '') end)) AS sl_trigger_price,
	max((case when (st.source_ref = 'sl') then replace(format(sp.order_price, i.digits, 'en_US'), ',', '') end)) AS sl_order_price
from
	((((devel.stop_request sr
join devel.stop_price sp on
	((sp.stop_request = sr.stop_request)))
join devel.instrument_position ipos on
	((ipos.instrument_position = sr.instrument_position)))
join Instruments i on
	((i.instrument = ipos.instrument)))
join devel.stop_type st on
	((st.stop_type = sp.stop_type)))
group by
	ipos.instrument_position,
	sr.stop_request),
StopOrderKeys as (
select
	coalesce(so.client_order_id, max(so.tpsl_id)) AS stop_request,
	max(so.tpsl_id) AS tpsl_id
from
	devel.stop_order so
group by
	so.client_order_id)
select
	i.account AS account,
	sr.stop_request AS stop_request,
	so.tpsl_id AS tpsl_id,
	so.client_order_id AS client_order_id,
	ipos.instrument_position AS instrument_position,
	ipos.instrument AS instrument,
	concat(b.symbol, '-', q.symbol) AS symbol,
	b.currency AS base_currency,
	b.symbol AS base_symbol,
	q.currency AS quote_currency,
	q.symbol AS quote_symbol,
	ipos.position AS position,
	ps.state AS position_state,
	ps.status AS position_status,
	s.state AS state,
	s.status AS status,
	coalesce(if((s.status = 'Expired'), s.state, NULL), rs.state, s.state) AS request_state,
	coalesce(if((s.status = 'Expired'), s.status, NULL), rs.status, s.status) AS request_status,
	os.order_state AS order_state,
	os.source_ref AS order_status,
	sr.action AS action,
	sr.size AS size,
	so.actual_size AS actual_size,
	sp.sl_trigger_price AS sl_trigger_price,
	sp.sl_order_price AS sl_order_price,
	sp.tp_trigger_price AS tp_trigger_price,
	sp.tp_order_price AS tp_order_price,
	sr.margin_mode AS margin_mode,
	oc.order_category AS order_category,
	oc.source_ref AS category,
	sr.reduce_only AS reduce_only,
	sr.broker_id AS broker_id,
	sr.memo AS memo,
	sr.create_time AS create_time,
	sr.update_time AS update_time
from
	((((((((((((devel.stop_request sr
join StopPrice sp on
	((sp.stop_request = sr.stop_request)))
left join StopOrderKeys sok on
	((sok.stop_request = sr.stop_request)))
left join devel.stop_order so on
	((so.tpsl_id = sok.tpsl_id)))
join devel.instrument_position ipos on
	((ipos.instrument_position = sr.instrument_position)))
join devel.instrument i on
	((i.instrument = ipos.instrument)))
join devel.currency b on
	((b.currency = i.base_currency)))
join devel.currency q on
	((q.currency = i.quote_currency)))
join devel.state ps on
	((ps.state = ipos.state)))
join devel.state s on
	((s.state = sr.state)))
left join devel.order_state os on
	((os.order_state = so.order_state)))
left join devel.state rs on
	((rs.status = os.status)))
left join devel.order_category oc on
	((oc.order_category = so.order_category)));

CREATE VIEW devel.vw_user_accounts AS
select
	ua.account AS account,
	ifnull(ua.alias, a.alias) AS alias,
	ba.broker_api AS ba_broker_api,
	ba.environment AS environment,
	ba.ident AS ident,
	ua.user AS user,
	u.username AS username,
	u.email AS user_email,
	ba.auth_rank AS auth_rank,
	uar.title AS auth_role,
	(case
		when ((us.status = 'Enabled')
			and (uas.status = 'Enabled')
				and (s.status = 'Enabled')) then 'Authorized'
		else 'Unauthorized'
	end) AS auth_status
from
	((((((((devel.user_account ua
join devel.account a on
	((a.account = ua.account)))
join devel.state s on
	((s.state = a.state)))
join devel.broker_api ba on
	((ba.broker_api = a.broker_api)))
join devel.user u on
	((u.user = ua.user)))
join devel.state us on
	((us.state = ua.state)))
join devel.role r on
	((r.role = ua.role)))
join devel.state uas on
	((uas.state = ua.state)))
join devel.role uar on
	((uar.role = ua.role)));

CREATE VIEW devel.vw_user_privs AS
select
	u.user AS user,
	u.username AS username,
	rg.role_group AS role_group,
	rg.group_name AS group_name,
	rg.short_name AS short_name,
	r.role AS role,
	r.title AS title,
	s.state AS state,
	s.status AS status,
	auth.privilege AS privilege,
	t.task AS task,
	concat(auth.name, ' ', t.name) AS activity,
	r.auth_rank AS auth_rank,
	auth.priority AS priority,
	t.description AS description
from
	((((((devel.role_privilege rp
join devel.state s on
	((s.state = rp.state)))
join devel.role r on
	((r.role = rp.role)))
join devel.task t on
	((t.task = rp.task)))
join devel.user u on
	((u.role = rp.role)))
join devel.role_group rg on
	((rg.role_group = r.role_group)))
join devel.privilege auth on
	((auth.privilege = rp.privilege)));

CREATE VIEW devel.vw_user_role_privs AS
select
	u.user AS user,
	u.username AS username,
	r.role AS role,
	r.title AS title,
	t.task AS task,
	s.state AS state,
	s.status AS status,
	auth.privilege AS privilege,
	concat(auth.name, ' ', t.name) AS activity,
	t.description AS description,
	auth.priority AS priority,
	r.auth_rank AS auth_rank
from
	(((((devel.role_privilege rp
join devel.state s on
	((s.state = rp.state)))
join devel.role r on
	((r.role = rp.role)))
join devel.task t on
	((t.task = rp.task)))
join devel.user u on
	((u.role = rp.role)))
join devel.privilege auth on
	((auth.privilege = rp.privilege)));

CREATE VIEW devel.vw_user_tasks AS
select
	u.user AS user,
	u.username AS username,
	u.email AS email,
	u.role AS role,
	r.title AS title,
	r.auth_rank AS auth_rank,
	t.task AS task,
	t.name AS name,
	t.section AS section,
	t.icon AS icon,
	t.sequence AS sequence
from
	(((devel.user u
join devel.role r on
	((r.role = u.role)))
join (
	select
		distinct rpi.role AS role,
		rpi.task AS task
	from
		(devel.role_privilege rpi
	join devel.state si on
		((si.state = rpi.state)))
	where
		(si.status = 'Enabled')) rp on
	((rp.role = u.role)))
join devel.task t on
	((t.task = rp.task)));

CREATE VIEW devel.vw_users AS
select
	u.user AS user,
	u.username AS username,
	u.email AS email,
	rg.role_group AS role_group,
	rg.group_name AS group_name,
	rg.short_name AS short_name,
	r.role AS role,
	r.title AS title,
	r.auth_rank AS auth_rank,
	u.state AS state,
	s.status AS status,
	(case
		when (s.status = 'Disabled') then 'Disabled'
		when (u.password = 0x0000feed0000feed0000feed0000feed) then 'Reset'
		when ((to_days(now()) - to_days(u.update_time)) > 120) then 'Disabled'
		when ((to_days(now()) - to_days(u.update_time)) > 90) then 'Reset'
		else s.status
	end) AS effective_status,
	u.image_url AS image_url,
	u.password AS password,
	u.hash AS hash,
	u.create_time AS create_time,
	u.update_time AS update_time,
	u.logon_time AS logon_time
from
	(((devel.user u
join devel.role r on
	((r.role = u.role)))
join devel.role_group rg on
	((rg.role_group = r.role_group)))
join devel.state s on
	((s.state = u.state)));

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
		cast(date_format(from_unixtime((devel.vc.timestamp / 1000)), '%Y-%m-%d %k:00:00') as datetime) AS hour,
		count(0) AS entries
	from
		devel.vw_candles vc
	group by
		devel.vc.instrument,
		devel.vc.symbol,
		devel.vc.period,
		devel.vc.timeframe,
		cast(date_format(from_unixtime((devel.vc.timestamp / 1000)), '%Y-%m-%d %k:00:00') as datetime)
	having
		(entries < 4)) audit
join (
	select
		c.instrument AS instrument,
		c.period AS period,
		min(cast(date_format(from_unixtime((c.timestamp / 1000)), '%Y-%m-%d %k:00:00') as datetime)) AS hour
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
CREATE TRIGGER devel.trig_audit_request AFTER UPDATE ON request FOR EACH ROW BEGIN
	IF (OLD.state != NEW.state) THEN
       INSERT INTO devel.audit_request VALUES (NEW.request, OLD.state, NEW.state, NEW.update_time);
    END IF;
END;

CREATE TRIGGER devel.trig_insert_audit_request AFTER INSERT ON request FOR EACH ROW BEGIN
	INSERT INTO	devel.full_audit_request
      VALUES (NEW.request,
              NEW.instrument_position,
              NEW.action,
              NEW.state,
              NEW.price,
              NEW.size,
              NEW.leverage,
              NEW.request_type,
              NEW.margin_mode,
              NEW.reduce_only,
              NEW.memo,
              NEW.broker_id,
              NEW.create_time,
              NEW.expiry_time,
              NEW.update_time
             );
END;

CREATE TRIGGER devel.trig_update_audit_request AFTER UPDATE ON request FOR EACH ROW BEGIN
	INSERT INTO	devel.full_audit_request
      VALUES (NEW.request,
              NEW.instrument_position,
              NEW.action,
              NEW.state,
              NEW.price,
              NEW.size,
              NEW.leverage,
              NEW.request_type,
              NEW.margin_mode,
              NEW.reduce_only,
              NEW.memo,
              NEW.broker_id,
              NEW.create_time,
              NEW.expiry_time,
              NEW.update_time
             );
END;

