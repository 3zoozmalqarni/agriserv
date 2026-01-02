export interface ElectronAPI {
  // Platform & Lifecycle
  platform: string;
  onBeforeQuit: (callback: () => void) => void;

  // Lab Users Management
  getUsers: () => Promise<any[]>;
  getUserById: (id: string) => Promise<any>;
  getUserByUsername: (username: string) => Promise<any>;
  createUser: (user: any) => Promise<any>;
  updateUser: (id: string, updates: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  authenticateUser: (usernameOrEmail: string, password: string) => Promise<any>;

  // Lab Saved Samples Management
  getSavedSamples: () => Promise<any[]>;
  getSavedSampleById: (id: string) => Promise<any>;
  createSavedSample: (sample: any) => Promise<any>;
  updateSavedSample: (id: string, updates: any) => Promise<void>;
  deleteSavedSample: (id: string) => Promise<void>;
  getAllSavedSamplesWithSamples: () => Promise<any[]>;
  getNextProcedureNumber: () => Promise<string>;

  // Lab Samples Management
  getSamples: () => Promise<any[]>;
  getSampleById: (id: string) => Promise<any>;
  getSamplesBySavedSampleId: (savedSampleId: string) => Promise<any[]>;
  createSample: (sample: any) => Promise<any>;
  updateSample: (id: string, updates: any) => Promise<void>;
  deleteSample: (id: string) => Promise<void>;

  // Lab Test Results Management
  getTestResults: () => Promise<any[]>;
  getTestResultById: (id: string) => Promise<any>;
  createTestResult: (result: any) => Promise<any>;
  updateTestResult: (id: string, updates: any) => Promise<void>;
  deleteTestResult: (id: string) => Promise<void>;

  // Lab Inventory Management
  getInventoryItems: () => Promise<any[]>;
  getInventoryItemById: (id: string) => Promise<any>;
  createInventoryItem: (item: any) => Promise<any>;
  updateInventoryItem: (id: string, updates: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  getInventoryTransactions: () => Promise<any[]>;
  createInventoryTransaction: (transaction: any) => Promise<any>;
  deleteInventoryTransaction: (id: string) => Promise<void>;

  // Transaction Progress Management
  getTransactionProgress: () => Promise<Record<string, any>>;
  saveTransactionProgress: (procedureNumber: string, progress: any) => Promise<void>;
  deleteTransactionProgress: (procedureNumber: string) => Promise<void>;

  // Vet Quarantine Procedures Management
  getQuarantineProcedures?: () => Promise<any[]>;
  getQuarantineProcedureByNumber?: (procedureNumber: string) => Promise<any>;
  getQuarantineProcedureById?: (id: string) => Promise<any>;
  updateQuarantineProcedure?: (id: string, updates: any) => Promise<any>;
  deleteQuarantineProcedure?: (id: string) => Promise<boolean>;
  checkShipmentByProcedureNumber?: (procedureNumber: string) => Promise<boolean>;
  getLastVetProcedureNumber?: () => Promise<string>;

  // Vet Animal Shipments Management
  getAnimalShipments: () => Promise<any[]>;
  getAnimalShipmentById?: (id: string) => Promise<any>;
  createAnimalShipment: (shipment: any) => Promise<any>;
  updateAnimalShipment?: (id: string, updates: any) => Promise<any>;
  deleteAnimalShipment: (id: string) => Promise<void>;

  // Vet Test Results Management
  getVetTestResults?: () => Promise<any[]>;
  getVetTestResultsByProcedureNumber?: (procedureNumber: string) => Promise<any[]>;
  getVetTestResultById?: (id: string) => Promise<any>;
  createVetTestResult?: (result: any) => Promise<any>;
  updateVetTestResult?: (id: string, updates: any) => Promise<any>;
  deleteVetTestResult?: (id: string) => Promise<boolean>;

  // Vet User Functions
  toggleVetUserStatus?: (id: string) => Promise<any>;
  changeVetUserPassword?: (id: string, newPassword: string) => Promise<boolean>;
  updateVetUserLastLogin?: (username: string) => Promise<boolean>;

  // Vet Alerts Management
  getAllVetAlerts?: () => Promise<any[]>;
  getAlertForProcedure?: (vetProcedureNumber: string) => Promise<any>;
  createVetAlert?: (alert: any) => Promise<any>;
  updateVetAlert?: (vetProcedureNumber: string, updates: any) => Promise<any>;
  dismissVetAlert?: (vetProcedureNumber: string) => Promise<any>;
  deleteVetAlert?: (vetProcedureNumber: string) => Promise<boolean>;
  clearAllVetAlerts?: () => Promise<boolean>;
  getActiveVetAlertsCount?: () => Promise<number>;
  getVetAlertsByType?: (actionType: string) => Promise<any[]>;

  // PDF Preview Helpers
  createTempPdfFile?: (base64Data: string, filename: string) => Promise<string>;
  deleteTempPdfFile?: (filePath: string) => Promise<void>;
  openPdfExternal?: (filePath: string) => Promise<boolean>;

  // Beneficiaries Users Management
  getBeneficiariesUsers?: () => Promise<any[]>;
  getBeneficiariesUserById?: (id: string) => Promise<any>;
  createBeneficiariesUser?: (user: any) => Promise<any>;
  updateBeneficiariesUser?: (id: string, updates: any) => Promise<any>;
  deleteBeneficiariesUser?: (id: string) => Promise<void>;
  authenticateBeneficiariesUser?: (email: string, password: string) => Promise<any>;

  // Beneficiaries Shipment Tracking
  getTrackingStages?: (procedureNumber: string) => Promise<any>;
  saveTrackingStages?: (procedureNumber: string, stages: any) => Promise<boolean>;

  // Beneficiaries Shipment Ratings
  getAllShipmentRatings?: () => Promise<any[]>;
  createShipmentRating?: (rating: any) => Promise<any>;
  getRatingByProcedureNumber?: (procedureNumber: string) => Promise<any>;

  // Quarantine Traders Management
  getQuarantineTradersByShipmentId?: (shipmentId: string) => Promise<any[]>;
  saveQuarantineTraders?: (shipmentId: string, traders: any[]) => Promise<any>;
  getAllQuarantineTraders?: () => Promise<any[]>;

  // Vet Importers Management
  getVetImporters?: () => Promise<any[]>;
  getVetImporterById?: (id: string) => Promise<any>;
  createVetImporter?: (importer: any) => Promise<any>;
  updateVetImporter?: (id: string, updates: any) => Promise<any>;
  deleteVetImporter?: (id: string) => Promise<boolean>;
}
