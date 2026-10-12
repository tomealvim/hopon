with source as (

    select * from {{ source('raw', 'rides') }}

),

renamed as (

    select
        id                                as ride_id,
        driverid                          as driver_id,
        vehicleid                         as vehicle_id,
        trim(split_part(origin, ',', 1))       as origin,
        trim(split_part(destination, ',', 1))  as destination,
        trim(split_part(origin, ',', 1)) || ' - ' || trim(split_part(destination, ',', 1)) as route,
        departuretime                     as departure_at,
        availableseats                    as available_seats,
        pricecents                        as price_cents,
        platformfeecents                  as platform_fee_cents,
        coalesce(routetollcostcents, 0)   as route_toll_cost_cents,
        routedistancekm                   as route_distance_km,
        routedurationmin                  as route_duration_min,
        instantbooking                    as is_instant_booking,
        status,
        cancelledat                       as cancelled_at,
        createdat                         as created_at,
        updatedat                         as updated_at
    from source

)

select * from renamed