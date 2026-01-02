export interface AnimalShipment {
  id: string;
  procedure_number: string;
  procedure_date?: string;
  transport_method: string;
  origin_country: string;
  importer_name: string;
  arrival_time: string;
  animals: any[];
  temperature_status: string;
  temperature_details: string;
  disease_symptoms: string;
  disease_symptoms_details: string;
  skeleton_symptoms: string;
  skeleton_symptoms_details: string;
  skin_symptoms: string;
  skin_symptoms_details: string;
  anatomical_features: string;
  anatomical_features_details: string;
  general_diagnosis: string;
  final_action: string;
  doctors: string[];
  created_at: string;
  attachments?: any[];
  final_decision?: string;
  arrival_date?: string;
}

export interface TraderEntry {
  id: string;
  importer_name: string;
  permit_number: string;
  statement_number: string;
  animal_count: string;
  animal_type: string;
  quarantine_location: string;
  quarantine_location_custom?: string;
  notes: string;
  reasons?: string[];
}

export interface TruckEntry {
  id: string;
  driver_name: string;
  plate_number: string;
  animal_count: number;
}

export interface SingleTruckData {
  driverName: string;
  plateNumber: string;
  departureDateTime: string;
  trucksCount: string;
  animalCount: string;
  animalType: string;
}
