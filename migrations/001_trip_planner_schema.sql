-- Trip Planner schema — new schema on shared tos_integration_hub DB
-- Run: psql postgres://postgres:postgres@127.0.0.1:5433/tos_integration_hub -f migrations/001_trip_planner_schema.sql

CREATE SCHEMA IF NOT EXISTS trip_planner;

CREATE TABLE IF NOT EXISTS trip_planner.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_planner.otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES trip_planner.users(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_planner.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES trip_planner.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_planner.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES trip_planner.users(id) ON DELETE CASCADE,
    local_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    destination VARCHAR(255),
    vibes TEXT[],
    passengers JSONB,
    start_date DATE,
    end_date DATE,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_planner.trip_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trip_planner.trips(id) ON DELETE CASCADE,
    local_id VARCHAR(255),
    title VARCHAR(255),
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trip_planner.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trip_planner.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES trip_planner.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'editor',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS trip_planner.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id UUID REFERENCES trip_planner.trip_legs(id) ON DELETE CASCADE,
    day_date DATE NOT NULL,
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    image_url TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(10),
    duration VARCHAR(100),
    location VARCHAR(255),
    rating DECIMAL(3,1),
    booking_status VARCHAR(50) DEFAULT 'none',
    booking_ref VARCHAR(255),
    is_best_seller BOOLEAN DEFAULT false,
    raw_data JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
