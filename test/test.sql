CREATE VIEW
    vw_instruments AS
select
    i.instrument AS instrument,
    concat (b.symbol, '-', q.symbol) AS currency_pair,
    b.currency AS base_currency,
    b.symbol AS base_symbol,
    q.currency AS quote_currency,
    q.symbol AS quote_symbol,
    tp.period AS trade_period,
    tp.timeframe AS trade_timeframe,
    tp.units AS units,
    ti.period AS interval_period,
    ti.timeframe AS interval_timeframe,
    ip.bulk_collection_rate AS bulk_collection_rate,
    ip.interval_collection_rate AS interval_collection_rate,
    ip.sma_factor AS sma_factor,
    id.contract_value AS contract_value,
    id.max_leverage AS max_leverage,
    id.min_size AS min_size,
    id.lot_size AS lot_size,
    id.tick_size AS tick_size,
    (
        length (
            substring_index (
                cast(id.tick_size as char charset utf8mb4),
                '.',
                - (1)
            )
        ) + 1
    ) AS digits,
    id.max_limit_size AS max_limit_size,
    id.max_market_size AS max_market_size,
    ts.trade_state AS trade_state,
    ts.state AS state,
    b.suspense AS suspense
from
    (
        (
            (
                (
                    (
                        (
                            (
                                (
                                    blofin.instrument i
                                    left join blofin.instrument_period bip on (
                                        (
                                            (i.trade_period = ip.period)
                                            and (i.instrument = ip.instrument)
                                        )
                                    )
                                )
                            )
                            left join blofin.period tp on ((i.trade_period = tp.period))
                        )
                        left join blofin.period ti on ((i.interval_period = ti.period))
                    )
                    join blofin.instrument_detail id
                )
                join blofin.trade_state ts
            )
            join blofin.currency b
        )
        join blofin.currency q
    )
where
    (
        (i.instrument = id.instrument)
        and (i.trade_state = ts.trade_state)
        and (i.base_currency = b.currency)
        and (i.quote_currency = q.currency)
    )