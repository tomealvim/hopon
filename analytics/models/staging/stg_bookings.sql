with source as (

    select * from {{ source('raw', 'bookings') }}

),

renamed as (

    select
        id                   as booking_id,
        rideid               as ride_id,
        userid               as passenger_id,
        seats,
        status,
        paymentmethod        as payment_method,
        detourmeters         as detour_meters,
        passengerconfirmed   as is_passenger_confirmed,
        createdat            as created_at,
        updatedat            as updated_at
    from source

)

select * from renamed