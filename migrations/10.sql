-- Migration 10: Create proper many-to-many relationship between jobs and chip_templates

-- Create new junction table for jobs and chip templates
CREATE TABLE IF NOT EXISTS job_chip_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  chip_template_id INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  FOREIGN KEY (chip_template_id) REFERENCES chip_templates (id) ON DELETE CASCADE,
  UNIQUE(job_id, chip_template_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_chip_templates_job_id ON job_chip_templates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_chip_templates_chip_template_id ON job_chip_templates(chip_template_id);
CREATE INDEX IF NOT EXISTS idx_job_chip_templates_display_order ON job_chip_templates(job_id, display_order);

-- Migrate existing data from job_offer_chips to new structure
-- First, we'll try to match existing chip_key values to chip_templates
INSERT INTO job_chip_templates (job_id, chip_template_id, display_order)
SELECT 
  joc.job_id,
  ct.id as chip_template_id,
  joc.display_order
FROM job_offer_chips joc
INNER JOIN chip_templates ct ON joc.chip_key = ct.chip_key
WHERE joc.is_active = 1
ORDER BY joc.job_id, joc.display_order;

-- Note: The old job_offer_chips table is kept for now in case rollback is needed
-- It can be dropped in a future migration after verifying the new structure works
