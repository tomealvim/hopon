-- Falha se alguma boleia tiver mais lugares reservados do que os oferecidos
select
    ride_id,
    available_seats,
    seats_booked
from {{ ref('int_ride_bookings') }}
where seats_booked > available_seats