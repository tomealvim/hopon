with source as (

    select * from {{ source('raw', 'users') }}

),

renamed as (

    select
        id                   as user_id,
        isidentityverified   as is_identity_verified,
        isadmin              as is_admin,
        emailverifiedat      as email_verified_at,
        createdat            as created_at,
        updatedat            as updated_at
    from source

)

select * from renamed