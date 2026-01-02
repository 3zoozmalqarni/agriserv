/*
  # إنشاء جدول الإجراءات البيطرية

  1. الجداول الجديدة
    - `vet_procedures`
      - `id` (uuid, primary key)
      - `procedure_number` (text, unique) - رقم الإجراء
      - `client_name` (text) - اسم العميل
      - `reception_date` (text) - تاريخ الاستلام
      - `country_port` (text) - البلد/الميناء
      - `receiver_name` (text) - اسم المستلم
      - `sampling_doctors` (jsonb) - أطباء سحب العينات
      - `sample_groups` (jsonb) - مجموعات العينات
      - `created_by` (uuid) - المستخدم الذي أنشأ الإجراء
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على الجدول
    - السماح للمستخدمين المصادق عليهم بالقراءة
    - السماح للمستخدمين المصادق عليهم بالإدراج والتحديث والحذف
*/

CREATE TABLE IF NOT EXISTS vet_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  reception_date text NOT NULL,
  country_port text NOT NULL,
  receiver_name text NOT NULL,
  sampling_doctors jsonb DEFAULT '[]'::jsonb,
  sample_groups jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vet_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read vet procedures"
  ON vet_procedures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert vet procedures"
  ON vet_procedures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update vet procedures"
  ON vet_procedures
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete vet procedures"
  ON vet_procedures
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_vet_procedures_procedure_number 
  ON vet_procedures(procedure_number);

CREATE INDEX IF NOT EXISTS idx_vet_procedures_created_at 
  ON vet_procedures(created_at DESC);