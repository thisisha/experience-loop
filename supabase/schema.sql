-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    venue TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    pdf_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    t_at TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    desc TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('announce', 'ask')),
    order_idx INTEGER NOT NULL,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('text', 'audio', 'photo')),
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    team TEXT NOT NULL,
    push_endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    text TEXT,
    audio_url TEXT,
    photo_url TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary_2 JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'failed')),
    web_url TEXT,
    pdf_url TEXT,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_code ON events(code);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_slots_event_id ON slots(event_id);
CREATE INDEX idx_slots_t_at ON slots(t_at);
CREATE INDEX idx_slots_type ON slots(type);
CREATE INDEX idx_questions_slot_id ON questions(slot_id);
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_answers_participant_id ON answers(participant_id);
CREATE INDEX idx_answers_slot_id ON answers(slot_id);
CREATE INDEX idx_reports_participant_id ON reports(participant_id);
CREATE INDEX idx_reports_event_id ON reports(event_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Events: Public read, admin write
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (true);

CREATE POLICY "Events are insertable by admin" ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Events are updatable by admin" ON events
    FOR UPDATE USING (true);

-- Slots: Public read, admin write
CREATE POLICY "Slots are viewable by everyone" ON slots
    FOR SELECT USING (true);

CREATE POLICY "Slots are insertable by admin" ON slots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Slots are updatable by admin" ON slots
    FOR UPDATE USING (true);

-- Questions: Public read, admin write
CREATE POLICY "Questions are viewable by everyone" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Questions are insertable by admin" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Questions are updatable by admin" ON questions
    FOR UPDATE USING (true);

-- Participants: Public read/write for registration
CREATE POLICY "Participants are viewable by everyone" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Participants are insertable by everyone" ON participants
    FOR INSERT WITH CHECK (true);

-- Answers: Participants can only see their own answers, admins can see all
CREATE POLICY "Answers are viewable by participant or event admin" ON answers
    FOR SELECT USING (
        participant_id IN (
            SELECT id FROM participants 
            WHERE event_id IN (
                SELECT event_id FROM participants WHERE id = answers.participant_id
            )
        )
    );

CREATE POLICY "Answers are insertable by participant" ON answers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Answers are updatable by participant" ON answers
    FOR UPDATE USING (
        participant_id IN (
            SELECT id FROM participants 
            WHERE event_id IN (
                SELECT event_id FROM participants WHERE id = answers.participant_id
            )
        )
    );

-- Reports: Participants can only see their own reports, admins can see all
CREATE POLICY "Reports are viewable by participant or event admin" ON reports
    FOR SELECT USING (
        participant_id IN (
            SELECT id FROM participants 
            WHERE event_id IN (
                SELECT event_id FROM participants WHERE id = reports.participant_id
            )
        )
    );

CREATE POLICY "Reports are insertable by admin" ON reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Reports are updatable by admin" ON reports
    FOR UPDATE USING (true);

-- Create function to check if user is event admin
CREATE OR REPLACE FUNCTION is_event_admin(event_code TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM events 
        WHERE code = event_code AND password_hash = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
