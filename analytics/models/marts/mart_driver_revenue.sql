select
    driver_id,
    count(*)                                                       as completed_rides,
    sum(seats_completed)                                           as seats_completed,
    sum(seats_completed * price_cents)                             as gross_cents,
    sum(seats_completed * platform_fee_cents)                      as platform_fee_cents,
    sum(seats_completed * (price_cents - platform_fee_cents))      as driver_net_cents,
    {{ cents_to_euros('sum(seats_completed * (price_cents - platform_fee_cents))') }} as driver_net_eur
from {{ ref('int_ride_bookings') }}
where ride_status = 'COMPLETED'
group by driver_id