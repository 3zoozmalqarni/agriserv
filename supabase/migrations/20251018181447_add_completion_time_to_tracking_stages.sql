-- Add completion time tracking to shipment tracking stages
-- 1. Modifications
--    - Add completed_at column to track when all stages are completed
-- 2. Notes
--    - This timestamp is set once when all stages reach completed status
--    - Used to calculate total time taken for shipment processing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipment_tracking_stages' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE shipment_tracking_stages ADD COLUMN completed_at timestamptz;
  END IF;
END $$;
