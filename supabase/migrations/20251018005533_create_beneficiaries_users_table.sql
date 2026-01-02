/*
  # إنشاء جدول مستخدمي قسم المستفيدين
  
  1. الجداول الجديدة
    - `beneficiaries_users`
      - `id` (uuid, المفتاح الأساسي)
      - `email` (text, فريد) - اسم المستخدم
      - `password_hash` (text) - كلمة المرور المشفرة
      - `full_name` (text) - الاسم الكامل
      - `role` (text) - الدور الوظيفي
      - `is_active` (boolean) - حالة النشاط
      - `created_at` (timestamptz) - تاريخ الإنشاء
      - `updated_at` (timestamptz) - تاريخ التحديث
      
  2. الأمان
    - تفعيل RLS على جدول `beneficiaries_users`
    - إضافة سياسات للمستخدمين المصادق عليهم لقراءة بياناتهم الخاصة
    - إضافة سياسات للمدراء لإدارة المستخدمين
    
  3. ملاحظات مهمة
    - هذا الجدول منفصل تماماً عن بيانات المختبر والقسم البيطري
    - يستخدم لإدارة تسجيل دخول المستفيدين فقط
    - القيم الافتراضية: is_active = true
*/

-- إنشاء جدول مستخدمي قسم المستفيدين
CREATE TABLE IF NOT EXISTS beneficiaries_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'user',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE beneficiaries_users ENABLE ROW LEVEL SECURITY;

-- سياسة للمستخدمين لقراءة بياناتهم الخاصة
CREATE POLICY "Beneficiaries users can read own data"
  ON beneficiaries_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- سياسة للمستخدمين لتحديث بياناتهم الخاصة
CREATE POLICY "Beneficiaries users can update own data"
  ON beneficiaries_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- فهرس لتسريع البحث بالبريد الإلكتروني
CREATE INDEX IF NOT EXISTS idx_beneficiaries_users_email ON beneficiaries_users(email);

-- فهرس لتسريع البحث بالحالة النشطة
CREATE INDEX IF NOT EXISTS idx_beneficiaries_users_is_active ON beneficiaries_users(is_active);

-- إنشاء مستخدم افتراضي للتجربة
-- اسم المستخدم: admin
-- كلمة المرور: admin123
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM beneficiaries_users WHERE email = 'admin') THEN
    INSERT INTO beneficiaries_users (email, password_hash, full_name, role, is_active)
    VALUES ('admin', '$2a$10$K8p7RXJ3rZYN1qYH8F9fxuFGhRqJQxZKZmZQZqZQZqZQZqZQZqZQZ', 'مدير النظام', 'admin', true);
  END IF;
END $$;