const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // App lifecycle events
  onBeforeQuit: (callback) => {
    ipcRenderer.on('app:before-quit', callback);
  },

  // Users
  getUsers: () => ipcRenderer.invoke('db:getUsers'),
  getUserById: (id) => ipcRenderer.invoke('db:getUserById', id),
  getUserByUsername: (username) => ipcRenderer.invoke('db:getUserByUsername', username),
  createUser: (user) => ipcRenderer.invoke('db:createUser', user),
  updateUser: (id, updates) => ipcRenderer.invoke('db:updateUser', id, updates),
  deleteUser: (id) => ipcRenderer.invoke('db:deleteUser', id),
  authenticateUser: (usernameOrEmail, password) =>
    ipcRenderer.invoke('db:authenticateUser', usernameOrEmail, password),

  // Saved Samples
  getSavedSamples: () => ipcRenderer.invoke('db:getSavedSamples'),
  getSavedSampleById: (id) => ipcRenderer.invoke('db:getSavedSampleById', id),
  createSavedSample: (sample) => ipcRenderer.invoke('db:createSavedSample', sample),
  updateSavedSample: (id, updates) => ipcRenderer.invoke('db:updateSavedSample', id, updates),
  deleteSavedSample: (id) => ipcRenderer.invoke('db:deleteSavedSample', id),
  getAllSavedSamplesWithSamples: () => ipcRenderer.invoke('db:getAllSavedSamplesWithSamples'),
  getNextProcedureNumber: () => ipcRenderer.invoke('db:getNextProcedureNumber'),

  // Samples
  getSamples: () => ipcRenderer.invoke('db:getSamples'),
  getSampleById: (id) => ipcRenderer.invoke('db:getSampleById', id),
  getSamplesBySavedSampleId: (savedSampleId) =>
    ipcRenderer.invoke('db:getSamplesBySavedSampleId', savedSampleId),
  createSample: (sample) => ipcRenderer.invoke('db:createSample', sample),
  updateSample: (id, updates) => ipcRenderer.invoke('db:updateSample', id, updates),
  deleteSample: (id) => ipcRenderer.invoke('db:deleteSample', id),

  // Test Results
  getTestResults: () => ipcRenderer.invoke('db:getTestResults'),
  getTestResultById: (id) => ipcRenderer.invoke('db:getTestResultById', id),
  createTestResult: (result) => ipcRenderer.invoke('db:createTestResult', result),
  updateTestResult: (id, updates) => ipcRenderer.invoke('db:updateTestResult', id, updates),
  deleteTestResult: (id) => ipcRenderer.invoke('db:deleteTestResult', id),

  // Inventory Items
  getInventoryItems: () => ipcRenderer.invoke('db:getInventoryItems'),
  getInventoryItemById: (id) => ipcRenderer.invoke('db:getInventoryItemById', id),
  createInventoryItem: (item) => ipcRenderer.invoke('db:createInventoryItem', item),
  updateInventoryItem: (id, updates) => ipcRenderer.invoke('db:updateInventoryItem', id, updates),
  deleteInventoryItem: (id) => ipcRenderer.invoke('db:deleteInventoryItem', id),

  // Inventory Transactions
  getInventoryTransactions: () => ipcRenderer.invoke('db:getInventoryTransactions'),
  createInventoryTransaction: (transaction) =>
    ipcRenderer.invoke('db:createInventoryTransaction', transaction),
  deleteInventoryTransaction: (id) => ipcRenderer.invoke('db:deleteInventoryTransaction', id),

  // Animal Shipments
  getAnimalShipments: () => ipcRenderer.invoke('db:getAnimalShipments'),
  getAnimalShipmentById: (id) => ipcRenderer.invoke('db:getAnimalShipmentById', id),
  createAnimalShipment: (shipment) => ipcRenderer.invoke('db:createAnimalShipment', shipment),
  updateAnimalShipment: (id, updates) => ipcRenderer.invoke('db:updateAnimalShipment', id, updates),
  deleteAnimalShipment: (id) => ipcRenderer.invoke('db:deleteAnimalShipment', id),
  checkShipmentByProcedureNumber: (procedureNumber) => ipcRenderer.invoke('db:checkShipmentByProcedureNumber', procedureNumber),

  // Quarantine Procedures
  getQuarantineProcedures: () => ipcRenderer.invoke('db:getQuarantineProcedures'),
  getQuarantineProcedureById: (id) => ipcRenderer.invoke('db:getQuarantineProcedureById', id),
  getQuarantineProcedureByNumber: (procedureNumber) => ipcRenderer.invoke('db:getQuarantineProcedureByNumber', procedureNumber),
  createQuarantineProcedure: (procedure) => ipcRenderer.invoke('db:createQuarantineProcedure', procedure),
  updateQuarantineProcedure: (id, updates) => ipcRenderer.invoke('db:updateQuarantineProcedure', id, updates),
  deleteQuarantineProcedure: (id) => ipcRenderer.invoke('db:deleteQuarantineProcedure', id),
  getNextQuarantineProcedureNumber: () => ipcRenderer.invoke('db:getNextQuarantineProcedureNumber'),

  // Quarantine Users
  getQuarantineUsers: () => ipcRenderer.invoke('db:getQuarantineUsers'),
  getQuarantineUserById: (id) => ipcRenderer.invoke('db:getQuarantineUserById', id),
  getQuarantineUserByUsername: (username) => ipcRenderer.invoke('db:getQuarantineUserByUsername', username),
  createQuarantineUser: (user) => ipcRenderer.invoke('db:createQuarantineUser', user),
  updateQuarantineUser: (id, updates) => ipcRenderer.invoke('db:updateQuarantineUser', id, updates),
  deleteQuarantineUser: (id) => ipcRenderer.invoke('db:deleteQuarantineUser', id),
  authenticateQuarantineUser: (usernameOrEmail, password) =>
    ipcRenderer.invoke('db:authenticateQuarantineUser', usernameOrEmail, password),

  // Test Results with info
  getTestResultsWithSampleInfo: () => ipcRenderer.invoke('db:getTestResultsWithSampleInfo'),

  // Notifications
  getNotifications: () => ipcRenderer.invoke('db:getNotifications'),
  createNotification: (notification) => ipcRenderer.invoke('db:createNotification', notification),
  markNotificationAsRead: (id) => ipcRenderer.invoke('db:markNotificationAsRead', id),
  deleteNotification: (id) => ipcRenderer.invoke('db:deleteNotification', id),
  clearAllNotifications: () => ipcRenderer.invoke('db:clearAllNotifications'),

  // Cleanup
  cleanupOrphanedResults: () => ipcRenderer.invoke('db:cleanupOrphanedResults'),

  // Vet Alerts
  getAllVetAlerts: () => ipcRenderer.invoke('db:getAllVetAlerts'),
  getAlertForProcedure: (vetProcedureNumber) => ipcRenderer.invoke('db:getAlertForProcedure', vetProcedureNumber),
  getAlertByTypeForProcedure: (vetProcedureNumber, actionType) => ipcRenderer.invoke('db:getAlertByTypeForProcedure', vetProcedureNumber, actionType),
  createVetAlert: (alert) => ipcRenderer.invoke('db:createVetAlert', alert),
  updateVetAlert: (vetProcedureNumber, updates) => ipcRenderer.invoke('db:updateVetAlert', vetProcedureNumber, updates),
  dismissVetAlert: (vetProcedureNumber, actionType) => ipcRenderer.invoke('db:dismissVetAlert', vetProcedureNumber, actionType),
  deleteVetAlert: (vetProcedureNumber) => ipcRenderer.invoke('db:deleteVetAlert', vetProcedureNumber),
  clearAllVetAlerts: () => ipcRenderer.invoke('db:clearAllVetAlerts'),
  getActiveVetAlertsCount: () => ipcRenderer.invoke('db:getActiveVetAlertsCount'),
  getVetAlertsByType: (actionType) => ipcRenderer.invoke('db:getVetAlertsByType', actionType),

  // Beneficiaries Users
  getBeneficiariesUsers: () => ipcRenderer.invoke('db:getBeneficiariesUsers'),
  getBeneficiariesUserById: (id) => ipcRenderer.invoke('db:getBeneficiariesUserById', id),
  createBeneficiariesUser: (user) => ipcRenderer.invoke('db:createBeneficiariesUser', user),
  updateBeneficiariesUser: (id, updates) => ipcRenderer.invoke('db:updateBeneficiariesUser', id, updates),
  deleteBeneficiariesUser: (id) => ipcRenderer.invoke('db:deleteBeneficiariesUser', id),
  authenticateBeneficiariesUser: (email, password) => ipcRenderer.invoke('db:authenticateBeneficiariesUser', email, password),

  // Shipment Tracking Stages
  getTrackingStages: (procedureNumber) => ipcRenderer.invoke('db:getTrackingStages', procedureNumber),
  saveTrackingStages: (procedureNumber, stages) => ipcRenderer.invoke('db:saveTrackingStages', procedureNumber, stages),

  // Shipment Ratings
  getAllShipmentRatings: () => ipcRenderer.invoke('db:getAllShipmentRatings'),
  createShipmentRating: (rating) => ipcRenderer.invoke('db:createShipmentRating', rating),
  getRatingByProcedureNumber: (procedureNumber) => ipcRenderer.invoke('db:getRatingByProcedureNumber', procedureNumber),

  // Quarantine Traders
  getQuarantineTradersByShipmentId: (shipmentId) => ipcRenderer.invoke('db:getQuarantineTradersByShipmentId', shipmentId),
  saveQuarantineTraders: (shipmentId, traders) => ipcRenderer.invoke('db:saveQuarantineTraders', shipmentId, traders),
  getAllQuarantineTraders: () => ipcRenderer.invoke('db:getAllQuarantineTraders'),

  // Vet Importers
  getVetImporters: () => ipcRenderer.invoke('db:getVetImporters'),
  getVetImporterById: (id) => ipcRenderer.invoke('db:getVetImporterById', id),
  createVetImporter: (importer) => ipcRenderer.invoke('db:createVetImporter', importer),
  updateVetImporter: (id, updates) => ipcRenderer.invoke('db:updateVetImporter', id, updates),
  deleteVetImporter: (id) => ipcRenderer.invoke('db:deleteVetImporter', id),

  // PDF Preview Helper
  createTempPdfFile: (base64Data, filename) => ipcRenderer.invoke('pdf:createTempFile', base64Data, filename),
  deleteTempPdfFile: (filePath) => ipcRenderer.invoke('pdf:deleteTempFile', filePath),
  openPdfExternal: (filePath) => ipcRenderer.invoke('pdf:openExternal', filePath),
});
