export interface AnimalData {
  animal_type: string;
  animal_gender: string;
  animal_count: string;
  death_count: string;
  final_decision?: 'فسح' | 'حجر' | 'إرجاع' | '';
  quarantine_locations?: string[];
  quarantine_traders?: string[];
  return_category?: 'A1' | 'A2' | 'B' | '';
  return_reason?: string;
}

export interface LabResult {
  id: string;
  sample_number: string;
  test_type: string;
  positive_samples: number;
  result: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  name: string;
  data: string;
  type: 'scanner' | 'upload';
  size: number;
  uploadedAt: string;
}

export { requiredTestOptions } from '../../../lib/shared-constants';
