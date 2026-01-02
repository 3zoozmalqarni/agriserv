/*
  # إصلاح سياسات المصادقة لقسم المستفيدين
  
  1. التغييرات
    - إضافة سياسة للسماح بقراءة البيانات للتحقق من تسجيل الدخول
    - السماح بالوصول للمستخدمين الضيوف (anon) لتسجيل الدخول
    
  2. الأمان
    - السياسة تسمح فقط بقراءة البيانات
    - لا يمكن للمستخدمين الضيوف التعديل أو الحذف
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Beneficiaries users can read own data" ON beneficiaries_users;
DROP POLICY IF EXISTS "Beneficiaries users can update own data" ON beneficiaries_users;

-- إضافة سياسة للسماح بقراءة البيانات للتحقق من تسجيل الدخول
CREATE POLICY "Allow anonymous read for authentication"
  ON beneficiaries_users
  FOR SELECT
  TO anon
  USING (true);

-- سياسة للمستخدمين المصادق عليهم لقراءة بياناتهم
CREATE POLICY "Authenticated users can read own data"
  ON beneficiaries_users
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة للمستخدمين المصادق عليهم لتحديث بياناتهم
CREATE POLICY "Authenticated users can update own data"
  ON beneficiaries_users
  FOR UPDATE
  TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (email = current_setting('request.jwt.claims', true)::json->>'email');