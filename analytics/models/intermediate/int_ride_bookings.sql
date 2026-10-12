with rides as (

    select * from {{ ref('stg_rides') }}

),

bookings as (

    select * from {{ ref('stg_bookings') }}

),

holidays as (

    select * from {{ ref('pt_holidays') }}

),

booking_totals as (

    select
        ride_id,
        count(*)                                                     as bookings_count,
        sum(case when status <> 'CANCELLED' then seats else 0 end)   as seats_booked,
        sum(case when status = 'COMPLETED' then seats else 0 end)    as seats_completed
    from bookings
    group by ride_id

)

select
    r.ride_id,
    r.driver_id,
    r.route,
    r.origin,
    r.destination,
    r.departure_at,
    dayofweekiso(r.departure_at)          as departure_weekday,
    dayname(r.departure_at)               as departure_day_name,
    h.holiday_date is not null            as is_holiday,
    h.holiday_name,
    r.status                              as ride_status,
    r.available_seats,
    r.price_cents,
    coalesce(r.platform_fee_cents, 0)     as platform_fee_cents,
    coalesce(bt.bookings_count, 0)        as bookings_count,
    coalesce(bt.seats_booked, 0)          as seats_booked,
    coalesce(bt.seats_completed, 0)       as seats_completed
from rides r
left join booking_totals bt
    on bt.ride_id = r.ride_id
left join holidays h
    on h.holiday_date = r.departure_at::date