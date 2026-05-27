-- Migration 002: Add unique constraint on (user_id, local_id) for proper upsert support
-- Run: psql postgres://postgres:postgres@127.0.0.1:5433/tos_integration_hub -f migrations/002_add_trips_unique_constraint.sql

-- Deduplicate: keep the earliest row for each (user_id, local_id) pair
DELETE FROM trip_planner.trips
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, local_id) id
    FROM trip_planner.trips
    WHERE local_id IS NOT NULL
    ORDER BY user_id, local_id, created_at ASC
)
AND local_id IS NOT NULL;

-- Add unique constraint so ON CONFLICT (user_id, local_id) works in upserts
ALTER TABLE trip_planner.trips
    ADD CONSTRAINT trips_user_local_unique UNIQUE (user_id, local_id);
