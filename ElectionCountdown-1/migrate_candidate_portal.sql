-- Add candidate portal fields to existing candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS campaign_bio TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS campaign_phone TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create candidate positions table
CREATE TABLE IF NOT EXISTS candidate_positions (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    position TEXT NOT NULL,
    detailed_statement TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    source_url TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create candidate Q&A table
CREATE TABLE IF NOT EXISTS candidate_qa (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_priority BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voter interactions table
CREATE TABLE IF NOT EXISTS voter_interactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    election_id INTEGER REFERENCES elections(id),
    content_id INTEGER,
    sentiment TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create real-time polling table
CREATE TABLE IF NOT EXISTS real_time_polling (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    poll_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    support_level NUMERIC(5,2),
    confidence NUMERIC(5,2),
    sample_size INTEGER,
    methodology TEXT,
    demographics JSONB,
    trend_direction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign content table
CREATE TABLE IF NOT EXISTS campaign_content (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMP WITH TIME ZONE,
    views INTEGER DEFAULT 0,
    engagement_score NUMERIC(5,2) DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create candidate subscriptions table
CREATE TABLE IF NOT EXISTS candidate_subscriptions (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    payment_status TEXT DEFAULT 'pending',
    features JSONB,
    monthly_price NUMERIC(10,2),
    total_paid NUMERIC(10,2) DEFAULT 0,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_positions_candidate_id ON candidate_positions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_positions_category ON candidate_positions(category);
CREATE INDEX IF NOT EXISTS idx_candidate_qa_candidate_id ON candidate_qa(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_qa_public ON candidate_qa(is_public);
CREATE INDEX IF NOT EXISTS idx_voter_interactions_candidate_id ON voter_interactions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_voter_interactions_type ON voter_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_real_time_polling_candidate_id ON real_time_polling(candidate_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_candidate_id ON campaign_content(candidate_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_published ON campaign_content(is_published);
CREATE INDEX IF NOT EXISTS idx_candidate_subscriptions_candidate_id ON candidate_subscriptions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_subscriptions_active ON candidate_subscriptions(is_active);

-- Insert sample subscription tiers for existing candidates (basic tier for all)
INSERT INTO candidate_subscriptions (candidate_id, subscription_tier, end_date, features)
SELECT 
    id,
    'basic',
    NOW() + INTERVAL '30 days',
    '{"basic_qa": true, "position_management": true, "basic_analytics": true}'::jsonb
FROM candidates
WHERE id NOT IN (SELECT candidate_id FROM candidate_subscriptions);

-- Update existing candidates with default values
UPDATE candidates 
SET 
    subscription_tier = 'basic',
    is_verified = FALSE
WHERE subscription_tier IS NULL;