-- RMGaaS Database Initialization
-- This script runs on first database creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE rmgaas TO rmgaas;

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'RMGaaS database initialized successfully';
END $$;


