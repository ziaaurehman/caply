-- Migration: Complete Kanban Board System (Trello-like)
-- This migration adds all tables needed for a full-featured Kanban board system

-- =====================================================
-- KANBAN CORE TABLES
-- =====================================================

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  background_color VARCHAR(7) DEFAULT '#0079bf',
  background_image VARCHAR(500),
  is_closed BOOLEAN DEFAULT FALSE,
  visibility VARCHAR(20) DEFAULT 'project', -- private, project, public
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lists table (columns in Kanban)
CREATE TABLE IF NOT EXISTS lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table (tickets/tasks)
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  cover_color VARCHAR(7),
  cover_image VARCHAR(500),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card members (assigned users)
CREATE TABLE IF NOT EXISTS card_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card labels (many-to-many)
CREATE TABLE IF NOT EXISTS card_labels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);

-- Checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist items
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table (for tracking changes)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL, -- create, update, delete, move, archive, restore
  entity_type VARCHAR(20) NOT NULL, -- board, list, card, comment, attachment, member
  entity_id UUID NOT NULL,
  details JSONB, -- Store additional details about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS board_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- card_assigned, card_due, card_comment, card_moved, mention
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  related_board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Boards indexes
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_by ON boards(created_by);
CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(position);

-- Lists indexes
CREATE INDEX IF NOT EXISTS idx_lists_board ON lists(board_id);
CREATE INDEX IF NOT EXISTS idx_lists_position ON lists(position);

-- Cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(list_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(position);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date) WHERE due_date IS NOT NULL;

-- Card members indexes
CREATE INDEX IF NOT EXISTS idx_card_members_card ON card_members(card_id);
CREATE INDEX IF NOT EXISTS idx_card_members_user ON card_members(user_id);

-- Labels indexes
CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);

-- Card labels indexes
CREATE INDEX IF NOT EXISTS idx_card_labels_card ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);

-- Checklists indexes
CREATE INDEX IF NOT EXISTS idx_checklists_card ON checklists(card_id);
CREATE INDEX IF NOT EXISTS idx_checklists_position ON checklists(position);

-- Checklist items indexes
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_assigned_to ON checklist_items(assigned_to);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_board ON activities(board_id);
CREATE INDEX IF NOT EXISTS idx_activities_card ON activities(card_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_board_notifications_user ON board_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_board_notifications_read ON board_notifications(is_read);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all Kanban tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Boards policies
CREATE POLICY "Project members can view boards" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = boards.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Project members can create boards" ON boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = boards.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Project members can update boards" ON boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = boards.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Project members can delete boards" ON boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = boards.project_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Lists policies (inherit from boards)
CREATE POLICY "Board members can manage lists" ON lists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE b.id = lists.board_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Cards policies (inherit from lists)
CREATE POLICY "Board members can manage cards" ON cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lists l
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE l.id = cards.list_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Card members policies
CREATE POLICY "Board members can manage card assignments" ON card_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = card_members.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Labels policies
CREATE POLICY "Board members can manage labels" ON labels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE b.id = labels.board_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Card labels policies
CREATE POLICY "Board members can manage card labels" ON card_labels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = card_labels.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Checklists policies
CREATE POLICY "Board members can manage checklists" ON checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = checklists.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Checklist items policies
CREATE POLICY "Board members can manage checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE cl.id = checklist_items.checklist_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Comments policies
CREATE POLICY "Board members can manage comments" ON comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = comments.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Attachments policies
CREATE POLICY "Board members can manage attachments" ON attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE c.id = attachments.card_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Activities policies
CREATE POLICY "Board members can view activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE b.id = activities.board_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Board notifications policies
CREATE POLICY "Users can view their own notifications" ON board_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON board_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE boards IS 'Kanban boards associated with projects';
COMMENT ON TABLE lists IS 'Kanban board columns/lists';
COMMENT ON TABLE cards IS 'Kanban cards/tasks within lists';
COMMENT ON TABLE card_members IS 'Users assigned to specific cards';
COMMENT ON TABLE labels IS 'Color-coded labels for organizing cards';
COMMENT ON TABLE card_labels IS 'Many-to-many relationship between cards and labels';
COMMENT ON TABLE checklists IS 'Checklists within cards for task breakdown';
COMMENT ON TABLE checklist_items IS 'Individual items within checklists';
COMMENT ON TABLE comments IS 'Comments on cards for collaboration';
COMMENT ON TABLE attachments IS 'File attachments on cards';
COMMENT ON TABLE activities IS 'Activity log for tracking all board/card changes';
COMMENT ON TABLE board_notifications IS 'Notifications for board activities'; 