with source as (

    select * from {{ source('raw', 'wallets') }}

),

renamed as (

    select
        id              as wallet_id,
        userid          as user_id,
        balancecents    as balance_cents,
        currency,
        createdat       as created_at,
        updatedat       as updated_at
    from source

)

select * from renamed