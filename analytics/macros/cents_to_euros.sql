{% macro cents_to_euros(column_name, decimal_places=2) -%}
    ({{ column_name }} / 100)::number(16, {{ decimal_places }})
{%- endmacro %}