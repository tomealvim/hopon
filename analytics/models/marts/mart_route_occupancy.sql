select
    route,
    origin,
    destination,
    count(*)                    as completed_rides,
    sum(available_seats)        as seats_offered,
    sum(seats_booked)           as seats_booked,
    round(sum(seats_booked) / nullif(sum(available_seats), 0) * 100, 1) as occupancy_pct
from {{ ref('int_ride_bookings') }}
where ride_status = 'COMPLETED'
group by route, origin, destination