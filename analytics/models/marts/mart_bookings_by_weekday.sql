select
    departure_weekday,
    departure_day_name,
    count(*)                       as rides,
    sum(seats_booked)              as seats_booked,
    round(avg(seats_booked), 2)    as avg_seats_per_ride
from {{ ref('int_ride_bookings') }}
where ride_status <> 'CANCELLED'
group by departure_weekday, departure_day_name