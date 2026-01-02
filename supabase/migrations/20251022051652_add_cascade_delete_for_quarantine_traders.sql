/*
  # إضافة حذف تلقائي لبيانات التجار عند حذف الإجراءات البيطرية

  1. التغييرات
    - إضافة دالة trigger لحذف بيانات quarantine_traders تلقائياً عند حذف الإجراء البيطري المرتبط
    - إضافة trigger على جدول vet_procedures

  2. الأمان
    - هذا التغيير يحافظ على سلامة البيانات
    - يمنع وجود بيانات يتيمة في جدول quarantine_traders
*/

-- إنشاء دالة لحذف بيانات التجار المرتبطة
CREATE OR REPLACE FUNCTION delete_related_quarantine_traders()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM quarantine_traders
  WHERE shipment_id = OLD.procedure_number;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إضافة trigger على جدول vet_procedures
DROP TRIGGER IF EXISTS trigger_delete_quarantine_traders ON vet_procedures;

CREATE TRIGGER trigger_delete_quarantine_traders
  BEFORE DELETE ON vet_procedures
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_quarantine_traders();