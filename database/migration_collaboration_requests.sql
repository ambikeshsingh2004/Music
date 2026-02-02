-- Collaboration Requests Table
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collab_requests_project ON collaboration_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_sender ON collaboration_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_recipient ON collaboration_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_status ON collaboration_requests(status);
