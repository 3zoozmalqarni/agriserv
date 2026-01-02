/*
  # إضافة قيد الحذف المتسلسل للتقييمات
  
  1. التعديلات
    - إضافة مفتاح خارجي (foreign key) لربط `shipment_ratings.procedure_number` مع `vet_procedures.procedure_number`
    - تفعيل الحذف المتسلسل (ON DELETE CASCADE) بحيث يتم حذف التقييمات تلقائياً عند حذف الإجراء البيطري
  
  2. الغرض
    - منع ظهور تقييمات للإجراءات المحذوفة
    - ضمان سلامة البيانات عند إعادة استخدام رقم الإجراء
    - تنظيف تلقائي للتقييمات عند حذف الإجراء
  
  3. ملاحظات مهمة
    - عند حذف إجراء بيطري، يتم حذف جميع التقييمات المرتبطة به تلقائياً
    - هذا يمنع ظهور التقييم القديم للإجراء الجديد الذي يحمل نفس الرقم
*/

-- إضافة مفتاح خارجي مع الحذف المتسلسل
DO $$
BEGIN
  -- التحقق من عدم وجود قيد مفتاح خارجي مسبقاً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_shipment_ratings_procedure_number'
    AND table_name = 'shipment_ratings'
  ) THEN
    ALTER TABLE shipment_ratings
      ADD CONSTRAINT fk_shipment_ratings_procedure_number
      FOREIGN KEY (procedure_number)
      REFERENCES vet_procedures(procedure_number)
      ON DELETE CASCADE;
  END IF;
END $$;
