with source as (

    select * from {{ source('raw', 'wallet_transactions') }}

),

renamed as (

    select
        id                as transaction_id,
        walletid          as wallet_id,
        type              as transaction_type,
        amountcents       as amount_cents,
        case
            when type in ('DEBIT', 'PAYOUT') then -amountcents
            else amountcents
        end               as signed_amount_cents,
        reference         as reference_id,
        stripeeventid     as stripe_event_id,
        createdat         as created_at
    from source

)

select * from renamed