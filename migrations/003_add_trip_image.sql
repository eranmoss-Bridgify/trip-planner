-- Migration 003: Add image column to trips table
-- Run: psql -d "postgres://postgres:postgres@127.0.0.1:5433/tos_integration_hub" -f migrations/003_add_trip_image.sql

ALTER TABLE trip_planner.trips ADD COLUMN IF NOT EXISTS image TEXT;
