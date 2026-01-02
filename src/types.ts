export interface VetProcedureAlert {
  id: string;
  vet_procedure_number: string;
  action_type: 'new' | 'updated' | 'deleted' | 'results_completed';
  action_timestamp: string;
  dismissed: boolean;
  created_at: string;
}
