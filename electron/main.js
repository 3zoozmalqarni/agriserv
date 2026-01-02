const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./database');

const PROJECT_COPYRIGHT = 'هذا المشروع من افكار وتنفيذ برمجي : عبدالعزيز محمد القرني - وبدعم مادي من : فهد عبدالله الغامدي و شاكر سفر الثبيتي';

let mainWindow;

function createWindow() {
  // تحديد مسار الأيقونة بناءً على البيئة (development vs production)
  const isDev = process.env.NODE_ENV === 'development';
  const iconPath = isDev
    ? path.join(__dirname, '../public/horse-icon-256.png')
    : path.join(process.resourcesPath, 'public/horse-icon-256.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
  });

  // تطبيق Content Security Policy بشكل آمن في Electron
  // في وضع التطوير، نسمح بـ localhost لعمل Vite HMR
  if (isDev) {
    console.log('🔧 Development Mode: CSP relaxed for Vite HMR (includes unsafe-eval for localhost)');
    console.log('📝 Note: Electron CSP warning is expected in development mode');
    console.log('🔒 Production Mode will use strict CSP without unsafe-eval');
  } else {
    console.log('🔒 Production Mode: Strict CSP enabled (no unsafe-eval)');
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspDirectives = isDev
      ? [
          "default-src 'self' http://localhost:* ws://localhost:* blob:; " +
          "script-src 'self' http://localhost:* 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' http://localhost:* 'unsafe-inline'; " +
          "img-src 'self' http://localhost:* data: blob:; " +
          "font-src 'self' http://localhost:* data:; " +
          "object-src 'self' http://localhost:* data: blob:; " +
          "frame-src 'self' http://localhost:* data: blob:; " +
          "connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co"
        ]
      : [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self' data:; " +
          "object-src 'self' data: blob:; " +
          "frame-src 'self' data: blob:; " +
          "connect-src 'self' https://*.supabase.co"
        ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspDirectives
      }
    });
  });

  if (isDev) {
    // في وضع التطوير، نحاول تحميل الخادم المحلي
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // إذا فشل، نحمل ملف dist بدلاً من ذلك
      console.log('Dev server not running, loading from dist...');
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    // في الإنتاج، نحمل من dist
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading production build from:', indexPath);

    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
      // محاولة مسار بديل
      const altPath = path.join(process.resourcesPath, 'app.asar/dist/index.html');
      console.log('Trying alternative path:', altPath);
      mainWindow.loadFile(altPath).catch((err2) => {
        console.error('Failed alternative load:', err2);
      });
    });
  }

  // فتح DevTools باستخدام Ctrl+Shift+I أو F12
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    // إرسال إشارة للتطبيق لتسجيل الخروج قبل الإغلاق
    if (mainWindow) {
      mainWindow.webContents.send('app:before-quit');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// تهيئة قاعدة البيانات
app.whenReady().then(() => {
  console.log('========================================');
  console.log('AgriServ Lab System Starting...');
  console.log('Platform:', process.platform);
  console.log('Electron version:', process.versions.electron);
  console.log('Node version:', process.versions.node);
  console.log('App path:', app.getAppPath());
  console.log('User data path:', app.getPath('userData'));
  console.log('Resources path:', process.resourcesPath);
  console.log('Copyright:', PROJECT_COPYRIGHT);
  console.log('========================================');

  try {
    db.initDatabase();
    db.initializeBeneficiariesDefaultUser();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// IPC Handlers

// Users
ipcMain.handle('db:getUsers', () => db.getUsers());
ipcMain.handle('db:getUserById', (event, id) => db.getUserById(id));
ipcMain.handle('db:getUserByUsername', (event, username) => db.getUserByUsername(username));
ipcMain.handle('db:createUser', (event, user) => db.createUser(user));
ipcMain.handle('db:updateUser', (event, id, updates) => db.updateUser(id, updates));
ipcMain.handle('db:deleteUser', (event, id) => db.deleteUser(id));
ipcMain.handle('db:authenticateUser', (event, usernameOrEmail, password) =>
  db.authenticateUser(usernameOrEmail, password)
);

// Saved Samples
ipcMain.handle('db:getSavedSamples', () => db.getSavedSamples());
ipcMain.handle('db:getSavedSampleById', (event, id) => db.getSavedSampleById(id));
ipcMain.handle('db:createSavedSample', (event, sample) => db.createSavedSample(sample));
ipcMain.handle('db:updateSavedSample', (event, id, updates) => db.updateSavedSample(id, updates));
ipcMain.handle('db:deleteSavedSample', (event, id) => db.deleteSavedSample(id));
ipcMain.handle('db:getAllSavedSamplesWithSamples', () => db.getAllSavedSamplesWithSamples());
ipcMain.handle('db:getNextProcedureNumber', () => db.getNextProcedureNumber());

// Samples
ipcMain.handle('db:getSamples', () => db.getSamples());
ipcMain.handle('db:getSampleById', (event, id) => db.getSampleById(id));
ipcMain.handle('db:getSamplesBySavedSampleId', (event, savedSampleId) =>
  db.getSamplesBySavedSampleId(savedSampleId)
);
ipcMain.handle('db:createSample', (event, sample) => db.createSample(sample));
ipcMain.handle('db:updateSample', (event, id, updates) => db.updateSample(id, updates));
ipcMain.handle('db:deleteSample', (event, id) => db.deleteSample(id));

// Test Results
ipcMain.handle('db:getTestResults', () => db.getTestResults());
ipcMain.handle('db:getTestResultsWithSampleInfo', () => db.getTestResultsWithSampleInfo());
ipcMain.handle('db:getTestResultById', (event, id) => db.getTestResultById(id));
ipcMain.handle('db:createTestResult', (event, result) => db.createTestResult(result));
ipcMain.handle('db:updateTestResult', (event, id, updates) => db.updateTestResult(id, updates));
ipcMain.handle('db:deleteTestResult', (event, id) => db.deleteTestResult(id));

// Inventory Items
ipcMain.handle('db:getInventoryItems', () => db.getInventoryItems());
ipcMain.handle('db:getInventoryItemById', (event, id) => db.getInventoryItemById(id));
ipcMain.handle('db:createInventoryItem', (event, item) => db.createInventoryItem(item));
ipcMain.handle('db:updateInventoryItem', (event, id, updates) => db.updateInventoryItem(id, updates));
ipcMain.handle('db:deleteInventoryItem', (event, id) => db.deleteInventoryItem(id));

// Inventory Transactions
ipcMain.handle('db:getInventoryTransactions', () => db.getInventoryTransactions());
ipcMain.handle('db:createInventoryTransaction', (event, transaction) =>
  db.createInventoryTransaction(transaction)
);
ipcMain.handle('db:deleteInventoryTransaction', (event, id) => db.deleteInventoryTransaction(id));

// Animal Shipments
ipcMain.handle('db:getAnimalShipments', () => db.getAnimalShipments());
ipcMain.handle('db:getAnimalShipmentById', (event, id) => db.getAnimalShipmentById(id));
ipcMain.handle('db:createAnimalShipment', (event, shipment) => db.createAnimalShipment(shipment));
ipcMain.handle('db:updateAnimalShipment', (event, id, updates) => db.updateAnimalShipment(id, updates));
ipcMain.handle('db:deleteAnimalShipment', (event, id) => db.deleteAnimalShipment(id));
ipcMain.handle('db:checkShipmentByProcedureNumber', (event, procedureNumber) => db.checkShipmentByProcedureNumber(procedureNumber));

// Vet Procedures (Quarantine)
ipcMain.handle('db:getQuarantineProcedures', () => db.getVetProcedures());
ipcMain.handle('db:getQuarantineProcedureById', (event, id) => db.getVetProcedureById(id));
ipcMain.handle('db:getQuarantineProcedureByNumber', (event, procedureNumber) => db.getVetProcedureByNumber(procedureNumber));
ipcMain.handle('db:createQuarantineProcedure', (event, procedure) => db.createVetProcedure(procedure));
ipcMain.handle('db:updateQuarantineProcedure', (event, id, updates) => db.updateVetProcedure(id, updates));
ipcMain.handle('db:deleteQuarantineProcedure', (event, id) => db.deleteVetProcedure(id));
ipcMain.handle('db:getNextQuarantineProcedureNumber', () => db.getNextVetProcedureNumber());

// Vet Users (Quarantine)
ipcMain.handle('db:getQuarantineUsers', () => db.getVetUsers());
ipcMain.handle('db:getQuarantineUserById', (event, id) => db.getVetUserById(id));
ipcMain.handle('db:getQuarantineUserByUsername', (event, username) => db.getVetUserByUsername(username));
ipcMain.handle('db:createQuarantineUser', (event, user) => db.createVetUser(user));
ipcMain.handle('db:updateQuarantineUser', (event, id, updates) => db.updateVetUser(id, updates));
ipcMain.handle('db:deleteQuarantineUser', (event, id) => db.deleteVetUser(id));
ipcMain.handle('db:authenticateQuarantineUser', (event, usernameOrEmail, password) => db.authenticateVetUser(usernameOrEmail, password));

// Beneficiaries Users
ipcMain.handle('db:getBeneficiariesUsers', () => db.getBeneficiariesUsers());
ipcMain.handle('db:getBeneficiariesUserById', (event, id) => db.getBeneficiariesUserById(id));
ipcMain.handle('db:createBeneficiariesUser', (event, user) => db.createBeneficiariesUser(user));
ipcMain.handle('db:updateBeneficiariesUser', (event, id, updates) => db.updateBeneficiariesUser(id, updates));
ipcMain.handle('db:deleteBeneficiariesUser', (event, id) => db.deleteBeneficiariesUser(id));
ipcMain.handle('db:authenticateBeneficiariesUser', (event, email, password) => db.authenticateBeneficiariesUser(email, password));

// Shipment Tracking Stages
ipcMain.handle('db:getTrackingStages', (event, procedureNumber) => db.getTrackingStages(procedureNumber));
ipcMain.handle('db:saveTrackingStages', (event, procedureNumber, stages) => db.saveTrackingStages(procedureNumber, stages));

// Shipment Ratings
ipcMain.handle('db:getAllShipmentRatings', () => db.getAllShipmentRatings());
ipcMain.handle('db:createShipmentRating', (event, rating) => db.createShipmentRating(rating));
ipcMain.handle('db:getRatingByProcedureNumber', (event, procedureNumber) => db.getRatingByProcedureNumber(procedureNumber));

// Quarantine Traders
ipcMain.handle('db:getQuarantineTradersByShipmentId', (event, shipmentId) => db.getQuarantineTradersByShipmentId(shipmentId));
ipcMain.handle('db:saveQuarantineTraders', (event, shipmentId, traders) => db.saveQuarantineTraders(shipmentId, traders));
ipcMain.handle('db:getAllQuarantineTraders', () => db.getAllQuarantineTraders());

// Vet Importers
ipcMain.handle('db:getVetImporters', () => db.getVetImporters());
ipcMain.handle('db:getVetImporterById', (event, id) => db.getVetImporterById(id));
ipcMain.handle('db:createVetImporter', (event, importer) => db.createVetImporter(importer));
ipcMain.handle('db:updateVetImporter', (event, id, updates) => db.updateVetImporter(id, updates));
ipcMain.handle('db:deleteVetImporter', (event, id) => db.deleteVetImporter(id));

// Notifications
ipcMain.handle('db:getNotifications', () => db.getNotifications());
ipcMain.handle('db:createNotification', (event, notification) => db.createNotification(notification));
ipcMain.handle('db:markNotificationAsRead', (event, id) => db.markNotificationAsRead(id));
ipcMain.handle('db:deleteNotification', (event, id) => db.deleteNotification(id));
ipcMain.handle('db:clearAllNotifications', () => db.clearAllNotifications());

// Cleanup
ipcMain.handle('db:cleanupOrphanedResults', () => db.cleanupOrphanedResults());

// Vet Alerts
ipcMain.handle('db:getAllVetAlerts', () => db.getAllVetAlerts());
ipcMain.handle('db:getAlertForProcedure', (event, vetProcedureNumber) => db.getAlertForProcedure(vetProcedureNumber));
ipcMain.handle('db:getAlertByTypeForProcedure', (event, vetProcedureNumber, actionType) => db.getAlertByTypeForProcedure(vetProcedureNumber, actionType));
ipcMain.handle('db:createVetAlert', (event, alert) => db.createVetAlert(alert));
ipcMain.handle('db:updateVetAlert', (event, vetProcedureNumber, updates) => db.updateVetAlert(vetProcedureNumber, updates));
ipcMain.handle('db:dismissVetAlert', (event, vetProcedureNumber, actionType) => db.dismissVetAlert(vetProcedureNumber, actionType));
ipcMain.handle('db:deleteVetAlert', (event, vetProcedureNumber) => db.deleteVetAlert(vetProcedureNumber));
ipcMain.handle('db:clearAllVetAlerts', () => db.clearAllVetAlerts());
ipcMain.handle('db:getActiveVetAlertsCount', () => db.getActiveVetAlertsCount());
ipcMain.handle('db:getVetAlertsByType', (event, actionType) => db.getVetAlertsByType(actionType));

// PDF Preview Helpers
ipcMain.handle('pdf:createTempFile', async (event, base64Data, filename) => {
  try {
    console.log('[PDF Helper] Creating temporary PDF file:', filename);

    const tempDir = path.join(os.tmpdir(), 'agriserv-pdf-previews');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const base64Content = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const tempFilePath = path.join(tempDir, `${timestamp}_${sanitizedFilename}`);

    fs.writeFileSync(tempFilePath, buffer);

    console.log('[PDF Helper] ✅ PDF file created:', tempFilePath);
    console.log('[PDF Helper]   - Size:', buffer.length, 'bytes');

    return tempFilePath;
  } catch (error) {
    console.error('[PDF Helper] ❌ Error creating temp PDF:', error);
    throw error;
  }
});

ipcMain.handle('pdf:deleteTempFile', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[PDF Helper] 🗑️  Deleted temp PDF:', filePath);
    }
  } catch (error) {
    console.error('[PDF Helper] ⚠️  Error deleting temp PDF:', error);
  }
});

ipcMain.handle('pdf:openExternal', async (event, filePath) => {
  try {
    console.log('[PDF Helper] 📂 Opening PDF externally:', filePath);
    const result = await shell.openPath(filePath);
    if (result) {
      console.error('[PDF Helper] ❌ Failed to open PDF:', result);
      throw new Error(result);
    }
    console.log('[PDF Helper] ✅ PDF opened successfully');
    return true;
  } catch (error) {
    console.error('[PDF Helper] ❌ Error opening PDF:', error);
    throw error;
  }
});
