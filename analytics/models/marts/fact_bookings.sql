{{
    config(
        materialized='incremental',
        unique_key='booking_id',
        incremental_strategy='merge'
    )
}}

with bookings as (

    select * from {{ ref('stg_bookings') }}

    {% if is_incremental() %}
    where updated_at > (select max(updated_at) from {{ this }})
    {% endif %}

),

rides as (

    select * from {{ ref('stg_rides') }}

)

select
    b.booking_id,
    b.ride_id,
    b.passenger_id,
    r.driver_id,
    r.route,
    r.departure_at,
    b.seats,
    b.status                              as booking_status,
    b.payment_method,
    r.price_cents,
    coalesce(r.platform_fee_cents, 0)     as platform_fee_cents,
    b.seats * r.price_cents               as gross_cents,
    b.created_at                          as booked_at,
    b.updated_at
from bookings b
join rides r
    on r.ride_id = b.ride_id