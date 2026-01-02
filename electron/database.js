const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'agriserv-lab.db');

  console.log('Database path:', dbPath);

  // التحقق من صحة قاعدة البيانات وإعادة إنشائها إذا لزم الأمر
  const fs = require('fs');
  let needsRecreate = false;

  try {
    if (fs.existsSync(dbPath)) {
      // محاولة فتح قاعدة البيانات والتحقق من بنية الجدول
      const testDb = new Database(dbPath);

      try {
        // التحقق من وجود جدول vet_procedures وأعمدته الأساسية
        const columns = testDb.prepare(`
          SELECT name FROM pragma_table_info('vet_procedures')
        `).all();

        const columnNames = columns.map(c => c.name);
        const requiredColumns = ['id', 'procedure_number'];
        const hasAllColumns = requiredColumns.every(col => columnNames.includes(col));

        if (!hasAllColumns) {
          console.log('⚠️  قاعدة البيانات تحتوي على بنية قديمة أو غير صحيحة');
          needsRecreate = true;
        } else {
          console.log('✅ بنية قاعدة البيانات صحيحة');
        }
      } catch (error) {
        console.log('⚠️  خطأ في قراءة بنية قاعدة البيانات:', error.message);
        needsRecreate = true;
      }

      testDb.close();

      if (needsRecreate) {
        console.log('🔄 إعادة إنشاء قاعدة البيانات...');
        fs.unlinkSync(dbPath);
        console.log('✅ تم حذف قاعدة البيانات القديمة');
      }
    }
  } catch (error) {
    console.error('خطأ في التحقق من قاعدة البيانات:', error);
  }

  db = new Database(dbPath);

  // إنشاء الجداول
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      profile_image TEXT,
      last_login TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_samples (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      reception_date TEXT NOT NULL,
      internal_procedure_number TEXT UNIQUE NOT NULL,
      external_procedure_number TEXT,
      external_procedure_date TEXT,
      vet_procedure_id TEXT,
      country_port TEXT,
      sample_origin TEXT,
      civil_record TEXT,
      receiver_name TEXT NOT NULL,
      quality_check TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS samples (
      id TEXT PRIMARY KEY,
      saved_sample_id TEXT NOT NULL,
      sample_number TEXT,
      department TEXT NOT NULL,
      requested_test TEXT NOT NULL,
      sample_type TEXT NOT NULL,
      animal_type TEXT NOT NULL,
      sample_count INTEGER NOT NULL,
      notes TEXT,
      external_procedure_number TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (saved_sample_id) REFERENCES saved_samples(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL,
      test_date TEXT NOT NULL,
      test_method TEXT NOT NULL,
      test_result TEXT NOT NULL,
      positive_samples INTEGER NOT NULL,
      is_vaccination_efficiency_test INTEGER DEFAULT 0,
      vaccination_efficiency_percentage TEXT,
      specialists TEXT NOT NULL,
      approved_by TEXT,
      confirmatory_test TEXT,
      notes TEXT,
      approval_status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL,
      unit TEXT NOT NULL,
      size TEXT,
      section TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      expiry_date TEXT,
      serial_number TEXT,
      batch_number TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL,
      specialist_name TEXT,
      transaction_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vet_procedures (
      id TEXT PRIMARY KEY,
      procedure_number TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      reception_date TEXT NOT NULL,
      country_port TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      sampling_doctors TEXT NOT NULL,
      sample_groups TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS vet_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      profile_image TEXT,
      last_login TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS animal_shipments (
      id TEXT PRIMARY KEY,
      procedure_number TEXT NOT NULL,
      shipment_data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vet_alerts (
      id TEXT PRIMARY KEY,
      vet_procedure_number TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_timestamp TEXT NOT NULL,
      dismissed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beneficiaries_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      profile_image TEXT,
      last_login TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shipment_tracking_stages (
      id TEXT PRIMARY KEY,
      procedure_number TEXT UNIQUE NOT NULL,
      paper_reception TEXT DEFAULT 'pending',
      inspection_sampling TEXT DEFAULT 'pending',
      lab_testing TEXT DEFAULT 'pending',
      clearance_procedures TEXT DEFAULT 'pending',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shipment_ratings (
      id TEXT PRIMARY KEY,
      procedure_number TEXT NOT NULL,
      service_satisfaction INTEGER NOT NULL CHECK (service_satisfaction >= 1 AND service_satisfaction <= 5),
      experience_satisfaction INTEGER NOT NULL CHECK (experience_satisfaction >= 1 AND experience_satisfaction <= 5),
      transaction_completion INTEGER NOT NULL CHECK (transaction_completion >= 1 AND transaction_completion <= 5),
      procedures_clarity INTEGER NOT NULL CHECK (procedures_clarity >= 1 AND procedures_clarity <= 5),
      comment TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS quarantine_traders (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      importer_name TEXT NOT NULL,
      permit_number TEXT NOT NULL,
      statement_number TEXT NOT NULL,
      animal_count TEXT NOT NULL,
      animal_type TEXT NOT NULL,
      quarantine_location TEXT NOT NULL,
      notes TEXT,
      reasons TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS vet_importers (
      id TEXT PRIMARY KEY,
      importer_name TEXT NOT NULL,
      farm_location TEXT,
      phone_number TEXT,
      technical_report_expiry_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'نشط',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // إضافة الأعمدة الجديدة إلى الجداول الموجودة
  try {
    // التحقق من وجود الأعمدة في test_results
    const testResultsColumns = db.prepare("PRAGMA table_info(test_results)").all();
    const hasVaccinationColumn = testResultsColumns.some(col => col.name === 'is_vaccination_efficiency_test');
    const hasPercentageColumn = testResultsColumns.some(col => col.name === 'vaccination_efficiency_percentage');
    const hasApprovalStatusColumn = testResultsColumns.some(col => col.name === 'approval_status');
    const hasApprovedByColumn = testResultsColumns.some(col => col.name === 'approved_by');

    if (!hasVaccinationColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN is_vaccination_efficiency_test INTEGER DEFAULT 0');
      console.log('تم إضافة عمود is_vaccination_efficiency_test');
    }

    if (!hasPercentageColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN vaccination_efficiency_percentage TEXT');
      console.log('تم إضافة عمود vaccination_efficiency_percentage');
    }

    if (!hasApprovalStatusColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN approval_status TEXT DEFAULT "draft"');
      console.log('تم إضافة عمود approval_status');
    }

    if (!hasApprovedByColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN approved_by TEXT');
      console.log('تم إضافة عمود approved_by');
    }

    // التحقق من وجود عمود quarantine_location_custom في quarantine_traders
    const quarantineTradersColumns = db.prepare("PRAGMA table_info(quarantine_traders)").all();
    const hasQuarantineLocationCustom = quarantineTradersColumns.some(col => col.name === 'quarantine_location_custom');

    if (!hasQuarantineLocationCustom) {
      db.exec('ALTER TABLE quarantine_traders ADD COLUMN quarantine_location_custom TEXT');
      console.log('تم إضافة عمود quarantine_location_custom');
    }

    // التحقق من وجود أعمدة النتائج التأكيدية
    const hasConfirmedPositiveColumn = testResultsColumns.some(col => col.name === 'confirmed_positive_samples');
    const hasConfirmatoryMethodColumn = testResultsColumns.some(col => col.name === 'confirmatory_test_method');

    if (!hasConfirmedPositiveColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN confirmed_positive_samples INTEGER');
      console.log('تم إضافة عمود confirmed_positive_samples');
    }

    if (!hasConfirmatoryMethodColumn) {
      db.exec('ALTER TABLE test_results ADD COLUMN confirmatory_test_method TEXT');
      console.log('تم إضافة عمود confirmatory_test_method');
    }

    // التحقق من وجود عمود completed_at في shipment_tracking_stages
    const trackingColumns = db.prepare("PRAGMA table_info(shipment_tracking_stages)").all();
    const hasCompletedAtColumn = trackingColumns.some(col => col.name === 'completed_at');

    if (!hasCompletedAtColumn) {
      db.exec('ALTER TABLE shipment_tracking_stages ADD COLUMN completed_at TEXT');
      console.log('تم إضافة عمود completed_at');
    }

    // التحقق من وجود عمود stage_status في vet_procedures
    const vetProceduresColumns = db.prepare("PRAGMA table_info(vet_procedures)").all();
    const hasStageStatusColumn = vetProceduresColumns.some(col => col.name === 'stage_status');

    if (!hasStageStatusColumn) {
      db.exec('ALTER TABLE vet_procedures ADD COLUMN stage_status TEXT');
      console.log('تم إضافة عمود stage_status إلى جدول vet_procedures');
    }

    // التحقق من وجود عمود reasons في quarantine_traders
    const hasReasonsColumn = quarantineTradersColumns.some(col => col.name === 'reasons');

    if (!hasReasonsColumn) {
      db.exec('ALTER TABLE quarantine_traders ADD COLUMN reasons TEXT');
      console.log('تم إضافة عمود reasons إلى جدول quarantine_traders');
    }
  } catch (error) {
    console.error('خطأ في إضافة الأعمدة:', error);
  }

  // حذف جدول transaction_tracking القديم
  try {
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='transaction_tracking'
    `).get();

    if (tableExists) {
      console.log('حذف جدول transaction_tracking القديم...');
      db.exec('DROP TABLE IF EXISTS transaction_tracking');
      console.log('تم حذف جدول transaction_tracking بنجاح');
    }
  } catch (error) {
    console.error('خطأ في حذف جدول transaction_tracking:', error);
  }

  // إضافة عمود external_procedure_number إلى جدول samples
  try {
    const hasExternalProcedureColumn = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('samples')
      WHERE name='external_procedure_number'
    `).get().count > 0;

    if (!hasExternalProcedureColumn) {
      console.log('إضافة عمود external_procedure_number إلى جدول samples...');
      db.exec('ALTER TABLE samples ADD COLUMN external_procedure_number TEXT');
      console.log('تم إضافة عمود external_procedure_number بنجاح');

      // تحديث العينات الموجودة بناءً على saved_samples
      db.exec(`
        UPDATE samples
        SET external_procedure_number = (
          SELECT ss.external_procedure_number
          FROM saved_samples ss
          WHERE ss.id = samples.saved_sample_id
        )
        WHERE EXISTS (
          SELECT 1 FROM saved_samples ss
          WHERE ss.id = samples.saved_sample_id
          AND ss.external_procedure_number IS NOT NULL
        )
      `);
      console.log('تم تحديث العينات الموجودة برقم الإجراء الخارجي');
    } else {
      // تحديث العينات التي ليس لها external_procedure_number
      const needsUpdate = db.prepare(`
        SELECT COUNT(*) as count FROM samples s
        INNER JOIN saved_samples ss ON s.saved_sample_id = ss.id
        WHERE ss.external_procedure_number IS NOT NULL
        AND (s.external_procedure_number IS NULL OR s.external_procedure_number = '')
      `).get();

      if (needsUpdate.count > 0) {
        console.log(`تحديث ${needsUpdate.count} عينة بدون رقم إجراء خارجي...`);
        db.exec(`
          UPDATE samples
          SET external_procedure_number = (
            SELECT ss.external_procedure_number
            FROM saved_samples ss
            WHERE ss.id = samples.saved_sample_id
          )
          WHERE EXISTS (
            SELECT 1 FROM saved_samples ss
            WHERE ss.id = samples.saved_sample_id
            AND ss.external_procedure_number IS NOT NULL
          )
          AND (samples.external_procedure_number IS NULL OR samples.external_procedure_number = '')
        `);
        console.log('تم تحديث العينات بنجاح');
      }
    }
  } catch (error) {
    console.error('خطأ في إضافة عمود external_procedure_number:', error);
  }

  // إضافة عمود external_procedure_number إلى جدول test_results
  try {
    const hasExternalProcedureInResults = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('test_results')
      WHERE name='external_procedure_number'
    `).get().count > 0;

    if (!hasExternalProcedureInResults) {
      console.log('إضافة عمود external_procedure_number إلى جدول test_results...');
      db.exec('ALTER TABLE test_results ADD COLUMN external_procedure_number TEXT');
      console.log('تم إضافة عمود external_procedure_number إلى test_results بنجاح');

      // تحديث النتائج الموجودة بناءً على العينات
      db.exec(`
        UPDATE test_results
        SET external_procedure_number = (
          SELECT s.external_procedure_number
          FROM samples s
          WHERE s.id = test_results.sample_id
        )
        WHERE EXISTS (
          SELECT 1 FROM samples s
          WHERE s.id = test_results.sample_id
          AND s.external_procedure_number IS NOT NULL
        )
      `);
      console.log('تم تحديث النتائج الموجودة برقم الإجراء الخارجي');
    } else {
      // تحديث النتائج التي ليس لها external_procedure_number
      const needsUpdateResults = db.prepare(`
        SELECT COUNT(*) as count FROM test_results tr
        INNER JOIN samples s ON tr.sample_id = s.id
        WHERE s.external_procedure_number IS NOT NULL
        AND (tr.external_procedure_number IS NULL OR tr.external_procedure_number = '')
      `).get();

      if (needsUpdateResults.count > 0) {
        console.log(`🔄 تحديث ${needsUpdateResults.count} نتيجة بدون رقم إجراء خارجي...`);
        db.exec(`
          UPDATE test_results
          SET external_procedure_number = (
            SELECT s.external_procedure_number
            FROM samples s
            WHERE s.id = test_results.sample_id
          )
          WHERE EXISTS (
            SELECT 1 FROM samples s
            WHERE s.id = test_results.sample_id
            AND s.external_procedure_number IS NOT NULL
          )
          AND (test_results.external_procedure_number IS NULL OR test_results.external_procedure_number = '')
        `);
        console.log('✅ تم تحديث النتائج بنجاح');

        // طباعة عينة من النتائج المحدثة
        const updatedSample = db.prepare(`
          SELECT id, external_procedure_number, sample_id
          FROM test_results
          WHERE external_procedure_number IS NOT NULL
          LIMIT 3
        `).all();
        console.log('عينة من النتائج المحدثة:', updatedSample);
      } else {
        console.log('✅ جميع النتائج لها رقم إجراء خارجي');
      }
    }
  } catch (error) {
    console.error('خطأ في إضافة عمود external_procedure_number لجدول test_results:', error);
  }

  // إضافة عمود vet_procedure_id إلى جدول saved_samples
  try {
    const hasVetProcedureId = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('saved_samples')
      WHERE name='vet_procedure_id'
    `).get().count > 0;

    if (!hasVetProcedureId) {
      console.log('إضافة عمود vet_procedure_id إلى جدول saved_samples...');
      db.exec('ALTER TABLE saved_samples ADD COLUMN vet_procedure_id TEXT');
      console.log('تم إضافة عمود vet_procedure_id بنجاح');
    }
  } catch (error) {
    console.error('خطأ في إضافة عمود vet_procedure_id:', error);
  }

  // إزالة عمود latest_stage من جدول vet_procedures إذا كان موجوداً
  try {
    const hasLatestStageColumn = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('vet_procedures')
      WHERE name='latest_stage'
    `).get().count > 0;

    if (hasLatestStageColumn) {
      console.log('🔄 إزالة عمود latest_stage من جدول vet_procedures...');

      // لم يعد هناك حاجة لهذا الكود
    }
  } catch (error) {
    console.error('خطأ في إزالة عمود latest_stage:', error);
  }

  // إنشاء مستخدم افتراضي للمختبر إذا لم يكن موجود
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (users.count === 0) {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, username, email, password, role, is_active, profile_image, last_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'مدير البرنامج',
      'admin',
      null,
      '123456',
      'program_manager',
      1,
      null,
      null,
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log('تم إنشاء مستخدم افتراضي للمختبر: admin / 123456');
  }

  // إنشاء مستخدم افتراضي للقسم البيطري إذا لم يكن موجود
  const quarantineUsers = db.prepare('SELECT COUNT(*) as count FROM vet_users').get();
  if (quarantineUsers.count === 0) {
    const qStmt = db.prepare(`
      INSERT INTO vet_users (id, name, username, email, password, role, is_active, profile_image, last_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    qStmt.run(
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'مدير البرنامج',
      'admin',
      null,
      '123456',
      'quarantine_manager',
      1,
      null,
      null,
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log('تم إنشاء مستخدم افتراضي للقسم البيطري: admin / 123456');
  }

  // إنشاء مستخدم افتراضي لقسم المستفيدين
  initializeBeneficiariesDefaultUser();

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Helper functions
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Users
function getUsers() {
  return getDatabase().prepare('SELECT * FROM users').all();
}

function getUserById(id) {
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByUsername(username) {
  return getDatabase().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function createUser(user) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (id, name, username, email, password, role, is_active, profile_image, last_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();
  const now = getCurrentTimestamp();

  stmt.run(
    id,
    user.name,
    user.username,
    user.email || null,
    user.password,
    user.role,
    user.is_active ? 1 : 0,
    user.profile_image || null,
    user.last_login || null,
    now,
    now
  );

  return getUserById(id);
}

function updateUser(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });

  fields.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUserById(id);
}

function deleteUser(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function authenticateUser(usernameOrEmail, password) {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ? AND is_active = 1')
    .get(usernameOrEmail, usernameOrEmail, password);

  if (user) {
    updateUser(user.id, { last_login: getCurrentTimestamp() });
  }

  return user;
}

// Saved Samples
function getSavedSamples() {
  return getDatabase().prepare('SELECT * FROM saved_samples ORDER BY created_at DESC').all();
}

function getSavedSampleById(id) {
  return getDatabase().prepare('SELECT * FROM saved_samples WHERE id = ?').get(id);
}

function createSavedSample(sample) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO saved_samples (
      id, client_name, reception_date, internal_procedure_number,
      external_procedure_number, external_procedure_date, vet_procedure_id,
      country_port, sample_origin, civil_record, receiver_name, quality_check,
      created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();
  const now = getCurrentTimestamp();

  stmt.run(
    id,
    sample.client_name,
    sample.reception_date,
    sample.internal_procedure_number,
    sample.external_procedure_number || null,
    sample.external_procedure_date || null,
    sample.vet_procedure_id || null,
    sample.country_port || null,
    sample.sample_origin || null,
    sample.civil_record || null,
    sample.receiver_name,
    sample.quality_check ? JSON.stringify(sample.quality_check) : null,
    now,
    now,
    sample.created_by || null
  );

  // تحديث حالة التتبع في المحجر عند إضافة الإجراء
  if (sample.external_procedure_number) {
    console.log(`[Electron] تحديث حالة التتبع بعد إضافة الإجراء: ${sample.external_procedure_number}`);

    const stageStatus = {
      transaction_received: 'completed',
      inspection_sampling: 'completed',
      samples_delivered: 'completed',
      testing: 'in_progress',
      clearance_procedures: 'pending'
    };

    const updateStmt = db.prepare(`
      UPDATE vet_procedures
      SET stage_status = ?, updated_at = ?
      WHERE procedure_number = ?
    `);

    const updateResult = updateStmt.run(
      JSON.stringify(stageStatus),
      getCurrentTimestamp(),
      sample.external_procedure_number
    );

    console.log(`[Electron] تم تحديث ${updateResult.changes} إجراء في المحجر`);
  }

  return getSavedSampleById(id);
}

function updateSavedSample(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  // القائمة البيضاء للحقول المسموح بتعديلها
  const allowedFields = [
    'client_name', 'reception_date', 'internal_procedure_number',
    'external_procedure_number', 'external_procedure_date', 'vet_procedure_id',
    'country_port', 'sample_origin', 'civil_record', 'receiver_name', 'quality_check', 'created_by'
  ];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at' && allowedFields.includes(key)) {
      if (key === 'quality_check' && updates[key]) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }
  });

  if (fields.length === 0) return getSavedSampleById(id);

  fields.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE saved_samples SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getSavedSampleById(id);
}

function deleteSavedSample(id) {
  const db = getDatabase();

  // الحصول على معلومات الإجراء قبل الحذف
  const savedSample = db.prepare('SELECT external_procedure_number FROM saved_samples WHERE id = ?').get(id);

  // الحصول على جميع العينات المرتبطة بالإجراء
  const samples = db.prepare('SELECT id FROM samples WHERE saved_sample_id = ?').all(id);
  const sampleIds = samples.map(s => s.id);

  // حذف النتائج المرتبطة بالعينات
  if (sampleIds.length > 0) {
    const placeholders = sampleIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM test_results WHERE sample_id IN (${placeholders})`).run(...sampleIds);
  }

  // حذف العينات المرتبطة بالإجراء
  db.prepare('DELETE FROM samples WHERE saved_sample_id = ?').run(id);

  // حذف الإجراء نفسه
  const stmt = db.prepare('DELETE FROM saved_samples WHERE id = ?');
  const result = stmt.run(id);

  // تحديث حالة التتبع في المحجر بعد الحذف
  if (result.changes > 0 && savedSample?.external_procedure_number) {
    console.log(`[Electron] تحديث حالة التتبع بعد حذف الإجراء: ${savedSample.external_procedure_number}`);

    const stageStatus = {
      transaction_received: 'completed',
      inspection_sampling: 'completed',
      samples_delivered: 'in_progress',
      testing: 'in_progress',
      clearance_procedures: 'pending'
    };

    const updateStmt = db.prepare(`
      UPDATE vet_procedures
      SET stage_status = ?, updated_at = ?
      WHERE procedure_number = ?
    `);

    const updateResult = updateStmt.run(
      JSON.stringify(stageStatus),
      getCurrentTimestamp(),
      savedSample.external_procedure_number
    );

    console.log(`[Electron] تم تحديث ${updateResult.changes} إجراء في المحجر`);
  }

  return result.changes > 0;
}

// Samples
function getSamples() {
  return getDatabase().prepare('SELECT * FROM samples').all();
}

function getSampleById(id) {
  return getDatabase().prepare('SELECT * FROM samples WHERE id = ?').get(id);
}

function getSamplesBySavedSampleId(savedSampleId) {
  return getDatabase().prepare('SELECT * FROM samples WHERE saved_sample_id = ?').all(savedSampleId);
}

function createSample(sample) {
  const db = getDatabase();

  // الحصول على external_procedure_number من saved_sample
  const savedSample = db.prepare('SELECT external_procedure_number FROM saved_samples WHERE id = ?')
    .get(sample.saved_sample_id);

  const stmt = db.prepare(`
    INSERT INTO samples (
      id, saved_sample_id, sample_number, department, requested_test,
      sample_type, animal_type, sample_count, notes, external_procedure_number, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();

  stmt.run(
    id,
    sample.saved_sample_id,
    sample.sample_number || null,
    sample.department,
    sample.requested_test,
    sample.sample_type,
    sample.animal_type,
    sample.sample_count,
    sample.notes || null,
    savedSample?.external_procedure_number || null,
    getCurrentTimestamp()
  );

  return getSampleById(id);
}

function updateSample(id, updates, deleteResults = true) {
  const db = getDatabase();

  // الحصول على بيانات العينة القديمة
  const oldSample = getSampleById(id);

  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at' && key !== 'saved_sample_id') {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });

  if (fields.length === 0) return getSampleById(id);

  // التحقق من وجود تغييرات في بيانات العينة الأساسية
  const hasChanges =
    (updates.department && updates.department !== oldSample.department) ||
    (updates.requested_test && updates.requested_test !== oldSample.requested_test) ||
    (updates.sample_type && updates.sample_type !== oldSample.sample_type) ||
    (updates.animal_type && updates.animal_type !== oldSample.animal_type);

  values.push(id);

  const stmt = db.prepare(`UPDATE samples SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  // حذف النتائج فقط إذا تغيرت بيانات العينة الأساسية
  if (deleteResults && hasChanges) {
    const deleteResultsStmt = db.prepare('DELETE FROM test_results WHERE sample_id = ?');
    deleteResultsStmt.run(id);
  }

  return getSampleById(id);
}

function deleteSample(id) {
  const db = getDatabase();

  // حذف النتائج المرتبطة بالعينة
  const deleteResults = db.prepare('DELETE FROM test_results WHERE sample_id = ?');
  deleteResults.run(id);

  const stmt = db.prepare('DELETE FROM samples WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Test Results
function getTestResults() {
  return getDatabase().prepare('SELECT * FROM test_results').all().map(row => ({
    ...row,
    is_vaccination_efficiency_test: row.is_vaccination_efficiency_test === 1,
    specialists: JSON.parse(row.specialists),
    confirmatory_test: row.confirmatory_test ? JSON.parse(row.confirmatory_test) : null,
    confirmed_positive_samples: row.confirmed_positive_samples !== null && row.confirmed_positive_samples !== undefined ? row.confirmed_positive_samples : null,
    confirmatory_test_method: row.confirmatory_test_method || null
  }));
}

function getTestResultsWithSampleInfo() {
  const db = getDatabase();
  const testResults = db.prepare(`
    SELECT
      tr.*,
      s.sample_number,
      s.department,
      s.external_procedure_number as sample_external_procedure_number,
      ss.client_name,
      ss.reception_date,
      ss.internal_procedure_number,
      ss.external_procedure_number
    FROM test_results tr
    LEFT JOIN samples s ON tr.sample_id = s.id
    LEFT JOIN saved_samples ss ON s.saved_sample_id = ss.id
    ORDER BY
      CASE
        WHEN ss.internal_procedure_number IS NULL THEN 1
        ELSE 0
      END,
      CAST(SUBSTR(ss.internal_procedure_number, 1, INSTR(ss.internal_procedure_number, '-') - 1) AS INTEGER) DESC
  `).all();

  return testResults.map(row => ({
    ...row,
    is_vaccination_efficiency_test: row.is_vaccination_efficiency_test === 1,
    specialists: JSON.parse(row.specialists),
    confirmatory_test: row.confirmatory_test ? JSON.parse(row.confirmatory_test) : null,
    confirmed_positive_samples: row.confirmed_positive_samples !== null && row.confirmed_positive_samples !== undefined ? row.confirmed_positive_samples : null,
    confirmatory_test_method: row.confirmatory_test_method || null,
    sample_number: row.sample_number || 'غير معروف',
    department: row.department || 'غير معروف',
    client_name: row.client_name || 'غير معروف',
    reception_date: row.reception_date || null,
    internal_procedure_number: row.internal_procedure_number || null,
    external_procedure_number: row.external_procedure_number || null,
    sample_external_procedure_number: row.sample_external_procedure_number || null
  }));
}

function getTestResultById(id) {
  const row = getDatabase().prepare('SELECT * FROM test_results WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    is_vaccination_efficiency_test: row.is_vaccination_efficiency_test === 1,
    specialists: JSON.parse(row.specialists),
    confirmatory_test: row.confirmatory_test ? JSON.parse(row.confirmatory_test) : null,
    confirmed_positive_samples: row.confirmed_positive_samples !== null && row.confirmed_positive_samples !== undefined ? row.confirmed_positive_samples : null,
    confirmatory_test_method: row.confirmatory_test_method || null
  };
}

function createTestResult(result) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO test_results (
      id, sample_id, test_date, test_method, test_result,
      positive_samples, is_vaccination_efficiency_test, vaccination_efficiency_percentage,
      specialists, confirmatory_test, notes, approval_status,
      external_procedure_number, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();

  stmt.run(
    id,
    result.sample_id,
    result.test_date || getCurrentTimestamp(),
    result.test_method,
    result.test_result,
    result.positive_samples,
    result.is_vaccination_efficiency_test ? 1 : 0,
    result.vaccination_efficiency_percentage || null,
    JSON.stringify(result.specialists),
    result.confirmatory_test ? JSON.stringify(result.confirmatory_test) : null,
    result.notes || null,
    result.approval_status || 'draft',
    result.external_procedure_number || null,
    getCurrentTimestamp(),
    result.created_by || null
  );

  return getTestResultById(id);
}

function updateTestResult(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      if (key === 'specialists') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updates[key]));
      } else if (key === 'confirmatory_test') {
        fields.push(`${key} = ?`);
        values.push(updates[key] ? JSON.stringify(updates[key]) : null);
      } else if (key === 'is_vaccination_efficiency_test') {
        fields.push(`${key} = ?`);
        values.push(updates[key] ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }
  });

  if (fields.length === 0) return getTestResultById(id);

  values.push(id);

  const stmt = db.prepare(`UPDATE test_results SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getTestResultById(id);
}

function deleteTestResult(id) {
  const db = getDatabase();

  // الحصول على معلومات النتيجة قبل حذفها
  const resultToDelete = db.prepare('SELECT sample_id FROM test_results WHERE id = ?').get(id);

  if (resultToDelete) {
    // الحصول على معلومات العينة والإجراء
    const sample = db.prepare('SELECT saved_sample_id, external_procedure_number FROM samples WHERE id = ?').get(resultToDelete.sample_id);

    if (sample && sample.external_procedure_number && sample.external_procedure_number.endsWith('-Q')) {
      // حذف النتيجة
      const deleteStmt = db.prepare('DELETE FROM test_results WHERE id = ?');
      const result = deleteStmt.run(id);

      // تحديث حالة المراحل في الإجراء البيطري
      // إرجاع حالة الفحص وإجراءات الفسح إلى "قيد الإجراء"
      const updateStageStmt = db.prepare(`
        UPDATE vet_procedures
        SET stage_status = ?, updated_at = ?
        WHERE procedure_number = ?
      `);

      const stageStatus = {
        transaction_received: 'completed',
        inspection_sampling: 'completed',
        samples_delivered: 'completed',
        testing: 'in_progress',
        clearance_procedures: 'in_progress'
      };

      updateStageStmt.run(
        JSON.stringify(stageStatus),
        getCurrentTimestamp(),
        sample.external_procedure_number
      );

      console.log(`✅ تم تحديث حالة التتبع بعد حذف النتيجة للإجراء ${sample.external_procedure_number}`);

      return result.changes > 0;
    }
  }

  // حذف عادي إذا لم يكن من إجراء بيطري
  const stmt = db.prepare('DELETE FROM test_results WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Inventory Items
function getInventoryItems() {
  return getDatabase().prepare('SELECT * FROM inventory_items').all();
}

function getInventoryItemById(id) {
  return getDatabase().prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
}

function createInventoryItem(item) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO inventory_items (
      id, name, quantity, type, unit, size, section,
      entry_date, expiry_date, serial_number, batch_number,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();
  const now = getCurrentTimestamp();

  stmt.run(
    id,
    item.name,
    item.quantity,
    item.type,
    item.unit,
    item.size || null,
    item.section,
    item.entry_date,
    item.expiry_date || null,
    item.serial_number || null,
    item.batch_number || null,
    item.created_by,
    now,
    now
  );

  return getInventoryItemById(id);
}

function updateInventoryItem(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });

  fields.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getInventoryItemById(id);
}

function deleteInventoryItem(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM inventory_items WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Inventory Transactions
function getInventoryTransactions() {
  return getDatabase().prepare('SELECT * FROM inventory_transactions').all();
}

function createInventoryTransaction(transaction) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO inventory_transactions (
      id, item_id, quantity, type, specialist_name,
      transaction_date, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();

  stmt.run(
    id,
    transaction.item_id,
    transaction.quantity,
    transaction.type,
    transaction.specialist_name || null,
    transaction.transaction_date,
    transaction.created_by,
    getCurrentTimestamp()
  );

  return id;
}

function deleteInventoryTransaction(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM inventory_transactions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Helper queries
function getAllSavedSamplesWithSamples() {
  const savedSamples = getSavedSamples();
  return savedSamples.map(savedSample => ({
    ...savedSample,
    quality_check: savedSample.quality_check ? JSON.parse(savedSample.quality_check) : null,
    samples: getSamplesBySavedSampleId(savedSample.id)
  }));
}

function getNextProcedureNumber() {
  const currentYear = new Date().getFullYear();
  const result = getDatabase().prepare(`
    SELECT internal_procedure_number
    FROM saved_samples
    WHERE internal_procedure_number LIKE ?
    ORDER BY internal_procedure_number DESC
    LIMIT 1
  `).get(`%-${currentYear}-L`);

  if (!result) {
    return `0001-${currentYear}-L`;
  }

  const match = result.internal_procedure_number.match(/^(\d{4})-(\d{4})-L$/);
  if (!match) {
    return `0001-${currentYear}-L`;
  }

  const lastNumber = parseInt(match[1]) || 0;
  return `${(lastNumber + 1).toString().padStart(4, '0')}-${currentYear}-L`;
}

// Vet Procedures
function getVetProcedures() {
  return getDatabase().prepare('SELECT * FROM vet_procedures ORDER BY created_at DESC').all().map(row => {
    let stageData = null;
    try {
      stageData = row.stage_status ? JSON.parse(row.stage_status) : null;
    } catch (e) {
      stageData = null;
    }

    // إذا كان stageData يحتوي على stage_status و stage_timings
    if (stageData && stageData.stage_status) {
      return {
        ...row,
        sampling_doctors: JSON.parse(row.sampling_doctors),
        sample_groups: JSON.parse(row.sample_groups),
        stage_status: stageData.stage_status,
        stage_timings: stageData.stage_timings || null
      };
    }

    // التنسيق القديم - stage_status مباشرة
    return {
      ...row,
      sampling_doctors: JSON.parse(row.sampling_doctors),
      sample_groups: JSON.parse(row.sample_groups),
      stage_status: stageData,
      stage_timings: null
    };
  });
}

function getVetProcedureById(id) {
  const row = getDatabase().prepare('SELECT * FROM vet_procedures WHERE id = ?').get(id);
  if (!row) return null;

  let stageData = null;
  try {
    stageData = row.stage_status ? JSON.parse(row.stage_status) : null;
  } catch (e) {
    stageData = null;
  }

  // إذا كان stageData يحتوي على stage_status و stage_timings
  if (stageData && stageData.stage_status) {
    return {
      ...row,
      sampling_doctors: JSON.parse(row.sampling_doctors),
      sample_groups: JSON.parse(row.sample_groups),
      stage_status: stageData.stage_status,
      stage_timings: stageData.stage_timings || null
    };
  }

  // التنسيق القديم - stage_status مباشرة
  return {
    ...row,
    sampling_doctors: JSON.parse(row.sampling_doctors),
    sample_groups: JSON.parse(row.sample_groups),
    stage_status: stageData,
    stage_timings: null
  };
}

function createVetProcedure(procedure) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO vet_procedures (
      id, procedure_number, client_name, reception_date, country_port,
      receiver_name, sampling_doctors, sample_groups, stage_status,
      created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();
  const now = getCurrentTimestamp();

  const defaultStageStatus = {
    transaction_received: 'completed',
    inspection_sampling: 'in_progress',
    samples_delivered: 'pending',
    testing: 'pending',
    clearance_procedures: 'pending'
  };

  // إضافة stage_timings إلى vet_procedures
  // ملاحظة: نحفظه في stage_status كـ JSON يحتوي على المعلومات الجديدة
  const procedureData = {
    stage_status: defaultStageStatus,
    stage_timings: {
      inspection_sampling: {
        start_time: now
      }
    }
  };

  stmt.run(
    id,
    procedure.procedure_number,
    procedure.client_name,
    procedure.reception_date,
    procedure.country_port || '',
    procedure.receiver_name || '',
    JSON.stringify(procedure.sampling_doctors || []),
    JSON.stringify(procedure.sample_groups || []),
    JSON.stringify(procedureData),
    now,
    now,
    procedure.created_by || null
  );

  const newProcedure = getVetProcedureById(id);

  const alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vet_procedure_number: procedure.procedure_number,
    action_type: 'new',
    action_timestamp: now,
    dismissed: 0,
    created_at: now
  };
  createVetAlert(alert);

  return newProcedure;
}

function updateVetProcedure(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      if (key === 'sampling_doctors' || key === 'sample_groups' || key === 'stage_status') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }
  });

  fields.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE vet_procedures SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getVetProcedureById(id);
}

// دالة مساعدة لحساب الفترة الزمنية بالدقائق
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

// تم حذف دوال التتبع

function getVetProcedureByNumber(procedureNumber) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM vet_procedures WHERE procedure_number = ?');
  const procedure = stmt.get(procedureNumber);

  if (procedure) {
    procedure.sampling_doctors = JSON.parse(procedure.sampling_doctors || '[]');
    procedure.sample_groups = JSON.parse(procedure.sample_groups || '[]');
  }

  return procedure;
}

function deleteVetProcedure(id) {
  const db = getDatabase();

  console.log(`[DATABASE.JS deleteVetProcedure] 🗑️  بدء حذف الإجراء البيطري: ${id}`);

  // الحصول على رقم الإجراء قبل الحذف
  const procedure = db.prepare('SELECT procedure_number FROM vet_procedures WHERE id = ?').get(id);

  if (!procedure) {
    console.log(`[DATABASE.JS] ⚠️  لم يُعثر على الإجراء بالـ ID: ${id}`);
    return false;
  }

  console.log(`[DATABASE.JS]   - رقم الإجراء: ${procedure.procedure_number}`);

  // التحقق من وجود إجراء مختبر مرتبط
  const linkedProcedure = db.prepare('SELECT id FROM saved_samples WHERE external_procedure_number = ?').get(procedure.procedure_number);

  // حذف الإجراء
  const stmt = db.prepare('DELETE FROM vet_procedures WHERE id = ?');
  const result = stmt.run(id);

  console.log(`[DATABASE.JS]   - تم حذف ${result.changes} إجراء`);

  if (procedure && procedure.procedure_number) {
    // حذف الإرساليات الحيوانية المرتبطة بنفس رقم الإجراء
    console.log(`[DATABASE.JS]   - البحث عن إرساليات برقم: ${procedure.procedure_number}`);

    const deleteShipmentsStmt = db.prepare('DELETE FROM animal_shipments WHERE procedure_number = ?');
    const shipmentsResult = deleteShipmentsStmt.run(procedure.procedure_number);

    console.log(`[DATABASE.JS]   - تم حذف ${shipmentsResult.changes} إرسالية مرتبطة`);

    // حذف التتبع الدائم المرتبط بنفس رقم الإجراء
    const deleteTrackingStmt = db.prepare('DELETE FROM shipment_tracking_stages WHERE procedure_number = ?');
    const trackingResult = deleteTrackingStmt.run(procedure.procedure_number);

    console.log(`[DATABASE.JS]   - تم حذف ${trackingResult.changes} تتبع مرتبط`);

    // حذف التقييمات المرتبطة بنفس رقم الإجراء
    const deleteRatingsStmt = db.prepare('DELETE FROM shipment_ratings WHERE procedure_number = ?');
    const ratingsResult = deleteRatingsStmt.run(procedure.procedure_number);

    console.log(`[DATABASE.JS]   - تم حذف ${ratingsResult.changes} تقييم مرتبط`);

    // حذف بيانات التجار المرتبطة بنفس رقم الإجراء
    const deleteTradersStmt = db.prepare('DELETE FROM quarantine_traders WHERE shipment_id = ?');
    const tradersResult = deleteTradersStmt.run(procedure.procedure_number);

    console.log(`[DATABASE.JS]   - تم حذف ${tradersResult.changes} سجل تاجر مرتبط`);

    if (shipmentsResult.changes === 0) {
      console.log(`[DATABASE.JS] ⚠️  لم يتم العثور على إرساليات برقم ${procedure.procedure_number}`);
    } else {
      console.log(`[DATABASE.JS] ✅ تم حذف الإجراء والإرساليات والتتبع والتقييمات وبيانات التجار المرتبطة بنجاح`);
    }

    // إنشاء تنبيه حذف فقط إذا كان هناك إجراء مختبر مرتبط
    if (linkedProcedure) {
      console.log(`[DATABASE.JS]   - إنشاء تنبيه حذف للمختبر`);
      const now = getCurrentTimestamp();
      const alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        vet_procedure_number: procedure.procedure_number,
        action_type: 'deleted',
        action_timestamp: now,
        dismissed: 0,
        created_at: now
      };
      createVetAlert(alert);
      console.log(`[DATABASE.JS] ✅ تم إنشاء تنبيه حذف للإجراء ${procedure.procedure_number}`);
    }
  }

  return result.changes > 0;
}

function getNextVetProcedureNumber() {
  const currentYear = new Date().getFullYear();
  const result = getDatabase().prepare(`
    SELECT procedure_number
    FROM vet_procedures
    WHERE procedure_number LIKE ?
    ORDER BY procedure_number DESC
    LIMIT 1
  `).get(`%-${currentYear}-Q`);

  if (!result) {
    return `0001-${currentYear}-Q`;
  }

  const match = result.procedure_number.match(/^(\d{4})-(\d{4})-Q$/);
  if (!match) {
    return `0001-${currentYear}-Q`;
  }

  const lastNumber = parseInt(match[1]) || 0;
  return `${(lastNumber + 1).toString().padStart(4, '0')}-${currentYear}-Q`;
}

// Vet Users
function getVetUsers() {
  return getDatabase().prepare('SELECT * FROM vet_users').all();
}

function getVetUserById(id) {
  return getDatabase().prepare('SELECT * FROM vet_users WHERE id = ?').get(id);
}

function getVetUserByUsername(username) {
  return getDatabase().prepare('SELECT * FROM vet_users WHERE username = ?').get(username);
}

function createVetUser(user) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO vet_users (id, name, username, email, password, role, is_active, profile_image, last_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();
  const now = getCurrentTimestamp();

  stmt.run(
    id,
    user.name,
    user.username,
    user.email || null,
    user.password,
    user.role,
    user.is_active ? 1 : 0,
    user.profile_image || null,
    user.last_login || null,
    now,
    now
  );

  return getVetUserById(id);
}

function updateVetUser(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });

  fields.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE vet_users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getVetUserById(id);
}

function deleteVetUser(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM vet_users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function authenticateVetUser(usernameOrEmail, password) {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM vet_users WHERE (username = ? OR email = ?) AND password = ? AND is_active = 1')
    .get(usernameOrEmail, usernameOrEmail, password);

  if (user) {
    updateVetUser(user.id, { last_login: getCurrentTimestamp() });
  }

  return user;
}

function cleanupOrphanedResults() {
  const db = getDatabase();

  // حذف النتائج التي تشير إلى عينات غير موجودة
  const stmt = db.prepare(`
    DELETE FROM test_results
    WHERE sample_id NOT IN (SELECT id FROM samples)
  `);
  const result = stmt.run();

  return result.changes;
}

// Animal Shipments
function getAnimalShipments() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM animal_shipments ORDER BY created_at DESC').all();

  return rows.map(row => {
    try {
      return {
        id: row.id,
        procedure_number: row.procedure_number,
        ...JSON.parse(row.shipment_data),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error parsing shipment data:', error);
      return null;
    }
  }).filter(s => s !== null);
}

function getAnimalShipmentById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM animal_shipments WHERE id = ?').get(id);

  if (!row) return null;

  try {
    return {
      id: row.id,
      procedure_number: row.procedure_number,
      ...JSON.parse(row.shipment_data),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('Error parsing shipment data:', error);
    return null;
  }
}

function createAnimalShipment(shipment) {
  const db = getDatabase();

  // استخدام ID المُرسل من Frontend بدلاً من إنشاء واحد جديد
  const id = shipment.id || generateId();
  const now = getCurrentTimestamp();

  const { id: _, procedure_number, created_at, updated_at, ...shipmentData } = shipment;

  console.log(`[DATABASE.JS createAnimalShipment] 📦 إنشاء إرسالية جديدة`);
  console.log(`[DATABASE.JS]   - ID: ${id}`);
  console.log(`[DATABASE.JS]   - Procedure Number: ${procedure_number}`);

  const stmt = db.prepare(`
    INSERT INTO animal_shipments (id, procedure_number, shipment_data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, procedure_number, JSON.stringify(shipmentData), created_at || now, updated_at || now);

  console.log(`[DATABASE.JS] ✅ تم حفظ الإرسالية بنجاح في animal_shipments`);

  // التحقق من الحفظ
  const savedShipment = db.prepare(`SELECT id, procedure_number FROM animal_shipments WHERE id = ?`).get(id);
  console.log(`[DATABASE.JS] تأكيد: الإرسالية المحفوظة:`, savedShipment);

  return getAnimalShipmentById(id);
}

function deleteAnimalShipment(id) {
  const db = getDatabase();

  console.log(`[DATABASE.JS deleteAnimalShipment] 🗑️  حذف إرسالية: ID=${id}`);

  // التحقق من وجود الإرسالية قبل الحذف
  const shipmentBefore = db.prepare('SELECT id, procedure_number FROM animal_shipments WHERE id = ?').get(id);
  if (shipmentBefore) {
    console.log(`[DATABASE.JS] ✓ الإرسالية موجودة قبل الحذف: ${shipmentBefore.procedure_number}`);

    // حذف بيانات التجار المرتبطة بهذه الإرسالية
    try {
      const deleteTraders = db.prepare('DELETE FROM quarantine_traders WHERE shipment_id = ?');
      const tradersResult = deleteTraders.run(shipmentBefore.procedure_number);
      console.log(`[DATABASE.JS] ✓ تم حذف ${tradersResult.changes} سجل تاجر مرتبط`);
    } catch (error) {
      console.error(`[DATABASE.JS] ⚠️ خطأ في حذف بيانات التجار:`, error);
    }
  } else {
    console.log(`[DATABASE.JS] ✗ الإرسالية غير موجودة: ID=${id}`);
    return false;
  }

  const stmt = db.prepare('DELETE FROM animal_shipments WHERE id = ?');
  const result = stmt.run(id);

  console.log(`[DATABASE.JS] نتيجة الحذف: changes=${result.changes}`);

  // التحقق من الحذف
  const shipmentAfter = db.prepare('SELECT id FROM animal_shipments WHERE id = ?').get(id);
  if (!shipmentAfter) {
    console.log(`[DATABASE.JS] ✅ تم حذف الإرسالية بنجاح`);
  } else {
    console.log(`[DATABASE.JS] ❌ فشل حذف الإرسالية`);
  }

  return result.changes > 0;
}

function updateAnimalShipment(id, updates) {
  const db = getDatabase();

  console.log(`[DATABASE.JS updateAnimalShipment] 📝 تحديث إرسالية: ID=${id}`);

  // التحقق من وجود الإرسالية
  const existingShipment = db.prepare('SELECT * FROM animal_shipments WHERE id = ?').get(id);
  if (!existingShipment) {
    console.log(`[DATABASE.JS] ✗ الإرسالية غير موجودة: ID=${id}`);
    return false;
  }

  console.log(`[DATABASE.JS] ✓ الإرسالية موجودة: ${existingShipment.procedure_number}`);

  // دمج البيانات الحالية مع التحديثات
  const currentData = JSON.parse(existingShipment.shipment_data);
  const { id: _, procedure_number, created_at, updated_at, ...updateData } = updates;

  const updatedShipmentData = {
    ...currentData,
    ...updateData
  };

  const now = getCurrentTimestamp();

  // تحديث البيانات
  const stmt = db.prepare(`
    UPDATE animal_shipments
    SET shipment_data = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(JSON.stringify(updatedShipmentData), now, id);

  console.log(`[DATABASE.JS] نتيجة التحديث: changes=${result.changes}`);

  if (result.changes > 0) {
    console.log(`[DATABASE.JS] ✅ تم تحديث الإرسالية بنجاح`);
    return true;
  } else {
    console.log(`[DATABASE.JS] ❌ فشل تحديث الإرسالية`);
    return false;
  }
}

function checkShipmentByProcedureNumber(procedureNumber) {
  const db = getDatabase();

  console.log(`[DATABASE.JS checkShipmentByProcedureNumber] 🔍 البحث عن إرسالية برقم: ${procedureNumber}`);

  // البحث بالصيغة الأصلية
  let row = db.prepare('SELECT id, procedure_number FROM animal_shipments WHERE procedure_number = ?').get(procedureNumber);

  if (row) {
    console.log(`[DATABASE.JS] ✅ إرسالية موجودة: ID=${row.id}, Procedure=${row.procedure_number}`);
    return true;
  }

  // إذا لم يُعثر عليها، جرب الصيغة البديلة
  let altProcedureNumber = null;

  if (procedureNumber.match(/^\d{4}-\d{4}-[A-Z]$/)) {
    const parts = procedureNumber.split('-');
    altProcedureNumber = `${parts[2]}-${parts[0]}-${parts[1]}`;
  } else if (procedureNumber.match(/^[A-Z]-\d{4}-\d{4}$/)) {
    const parts = procedureNumber.split('-');
    altProcedureNumber = `${parts[1]}-${parts[2]}-${parts[0]}`;
  }

  if (altProcedureNumber) {
    console.log(`[DATABASE.JS] 🔄 البحث بالصيغة البديلة: ${altProcedureNumber}`);
    row = db.prepare('SELECT id, procedure_number FROM animal_shipments WHERE procedure_number = ?').get(altProcedureNumber);

    if (row) {
      console.log(`[DATABASE.JS] ✅ إرسالية موجودة بالصيغة البديلة: ID=${row.id}, Procedure=${row.procedure_number}`);
      return true;
    }
  }

  console.log(`[DATABASE.JS] ⚠️ لا توجد إرسالية برقم: ${procedureNumber}`);
  return false;
}

// Notifications
function getNotifications() {
  return getDatabase().prepare('SELECT * FROM notifications ORDER BY created_at DESC').all().map(row => ({
    ...row,
    read: row.read === 1
  }));
}

function createNotification(notification) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO notifications (id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const id = generateId();

  stmt.run(
    id,
    notification.title,
    notification.message,
    notification.type,
    0,
    getCurrentTimestamp()
  );

  return { id, ...notification, read: false, created_at: getCurrentTimestamp() };
}

function markNotificationAsRead(id) {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function deleteNotification(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function clearAllNotifications() {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM notifications');
  stmt.run();
  return true;
}

// Vet Alerts Functions
function getAllVetAlerts() {
  return getDatabase().prepare('SELECT * FROM vet_alerts ORDER BY created_at DESC').all();
}

function getAlertForProcedure(vetProcedureNumber) {
  const alerts = getDatabase().prepare('SELECT * FROM vet_alerts WHERE vet_procedure_number = ? AND dismissed = 0').all(vetProcedureNumber);

  if (alerts.length === 0) return null;

  const priorityOrder = {
    'deleted': 1,
    'updated': 2,
    'new': 3,
    'results_completed': 4
  };

  alerts.sort((a, b) => {
    return (priorityOrder[a.action_type] || 999) - (priorityOrder[b.action_type] || 999);
  });

  return alerts[0];
}

function getAlertByTypeForProcedure(vetProcedureNumber, actionType) {
  return getDatabase().prepare('SELECT * FROM vet_alerts WHERE vet_procedure_number = ? AND action_type = ?').get(vetProcedureNumber, actionType);
}

function createVetAlert(alert) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO vet_alerts (
      id, vet_procedure_number, action_type, action_timestamp, dismissed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    alert.id,
    alert.vet_procedure_number,
    alert.action_type,
    alert.action_timestamp,
    alert.dismissed ? 1 : 0,
    alert.created_at
  );

  return alert;
}

function updateVetAlert(vetProcedureNumber, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  if (updates.action_type !== undefined) {
    fields.push('action_type = ?');
    values.push(updates.action_type);
  }

  if (updates.action_timestamp !== undefined) {
    fields.push('action_timestamp = ?');
    values.push(updates.action_timestamp);
  }

  if (updates.dismissed !== undefined) {
    fields.push('dismissed = ?');
    values.push(updates.dismissed ? 1 : 0);
  }

  if (fields.length === 0) return getAlertForProcedure(vetProcedureNumber);

  values.push(vetProcedureNumber);

  let whereClause = 'vet_procedure_number = ?';
  if (updates.action_type !== undefined && updates.target_action_type) {
    whereClause += ' AND action_type = ?';
    values.push(updates.target_action_type);
  }

  const stmt = db.prepare(`UPDATE vet_alerts SET ${fields.join(', ')} WHERE ${whereClause}`);
  stmt.run(...values);

  return getAlertForProcedure(vetProcedureNumber);
}

function dismissVetAlert(vetProcedureNumber, actionType) {
  const db = getDatabase();

  let whereClause = 'vet_procedure_number = ?';
  const values = [vetProcedureNumber];

  if (actionType) {
    whereClause += ' AND action_type = ?';
    values.push(actionType);
  }

  const stmt = db.prepare(`UPDATE vet_alerts SET dismissed = 1 WHERE ${whereClause}`);
  stmt.run(...values);

  return true;
}

function deleteVetAlert(vetProcedureNumber) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM vet_alerts WHERE vet_procedure_number = ?');
  const result = stmt.run(vetProcedureNumber);
  return result.changes > 0;
}

function clearAllVetAlerts() {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM vet_alerts');
  stmt.run();
  return true;
}

function getActiveVetAlertsCount() {
  const result = getDatabase().prepare('SELECT COUNT(*) as count FROM vet_alerts WHERE dismissed = 0').get();
  return result.count;
}

function getVetAlertsByType(actionType) {
  return getDatabase().prepare('SELECT * FROM vet_alerts WHERE action_type = ? AND dismissed = 0 ORDER BY created_at DESC').all(actionType);
}

// =====================================
// Beneficiaries Users Functions
// =====================================

function getBeneficiariesUsers() {
  return getDatabase().prepare('SELECT * FROM beneficiaries_users ORDER BY created_at DESC').all();
}

function getBeneficiariesUserById(id) {
  return getDatabase().prepare('SELECT * FROM beneficiaries_users WHERE id = ?').get(id);
}

function getBeneficiariesUserByEmail(email) {
  return getDatabase().prepare('SELECT * FROM beneficiaries_users WHERE email = ?').get(email);
}

function createBeneficiariesUser(user) {
  const { id, email, password_hash, full_name, role, profile_image } = user;
  const now = new Date().toISOString();

  getDatabase().prepare(`
    INSERT INTO beneficiaries_users (id, email, password_hash, full_name, role, is_active, profile_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(id, email, password_hash, full_name, role, profile_image || null, now, now);

  return getBeneficiariesUserById(id);
}

function updateBeneficiariesUser(id, updates) {
  const user = getBeneficiariesUserById(id);
  if (!user) return null;

  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.password_hash);
  }
  if (updates.full_name !== undefined) {
    fields.push('full_name = ?');
    values.push(updates.full_name);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.profile_image !== undefined) {
    fields.push('profile_image = ?');
    values.push(updates.profile_image);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active);
  }
  if (updates.last_login !== undefined) {
    fields.push('last_login = ?');
    values.push(updates.last_login);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  getDatabase().prepare(`
    UPDATE beneficiaries_users
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);

  return getBeneficiariesUserById(id);
}

function deleteBeneficiariesUser(id) {
  getDatabase().prepare('DELETE FROM beneficiaries_users WHERE id = ?').run(id);
}

function authenticateBeneficiariesUser(email, password) {
  const user = getBeneficiariesUserByEmail(email);

  if (!user || !user.is_active) {
    return null;
  }

  if (user.password_hash === password) {
    const now = new Date().toISOString();
    getDatabase().prepare('UPDATE beneficiaries_users SET last_login = ? WHERE id = ?').run(now, user.id);
    return user;
  }

  return null;
}

function initializeBeneficiariesDefaultUser() {
  const existingUser = getBeneficiariesUserByEmail('admin');

  if (!existingUser) {
    const { randomUUID } = require('crypto');
    const now = new Date().toISOString();

    getDatabase().prepare(`
      INSERT INTO beneficiaries_users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(randomUUID(), 'admin', '123456', 'مدير البرنامج', 'program_manager', now, now);

    console.log('✅ تم إنشاء حساب المستفيدين الافتراضي: admin/123456 (مدير البرنامج)');
  }
}

// =====================================
// Vet Importers Functions
// =====================================

function getVetImporters() {
  return getDatabase().prepare('SELECT * FROM vet_importers ORDER BY created_at DESC').all();
}

function getVetImporterById(id) {
  return getDatabase().prepare('SELECT * FROM vet_importers WHERE id = ?').get(id);
}

function createVetImporter(importer) {
  const { id, importer_name, farm_location, phone_number, technical_report_expiry_date, notes, status } = importer;
  const now = new Date().toISOString();

  getDatabase().prepare(`
    INSERT INTO vet_importers (id, importer_name, farm_location, phone_number, technical_report_expiry_date, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    importer_name,
    farm_location || null,
    phone_number || null,
    technical_report_expiry_date || null,
    notes || null,
    status || 'نشط',
    now,
    now
  );

  return getVetImporterById(id);
}

function updateVetImporter(id, updates) {
  const importer = getVetImporterById(id);
  if (!importer) return null;

  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  if (updates.importer_name !== undefined) {
    fields.push('importer_name = ?');
    values.push(updates.importer_name);
  }
  if (updates.farm_location !== undefined) {
    fields.push('farm_location = ?');
    values.push(updates.farm_location);
  }
  if (updates.phone_number !== undefined) {
    fields.push('phone_number = ?');
    values.push(updates.phone_number);
  }
  if (updates.technical_report_expiry_date !== undefined) {
    fields.push('technical_report_expiry_date = ?');
    values.push(updates.technical_report_expiry_date);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) return importer;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  getDatabase().prepare(`
    UPDATE vet_importers
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);

  return getVetImporterById(id);
}

function deleteVetImporter(id) {
  const result = getDatabase().prepare('DELETE FROM vet_importers WHERE id = ?').run(id);
  return result.changes > 0;
}

// Shipment Tracking Stages functions
function getTrackingStages(procedureNumber) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM shipment_tracking_stages
      WHERE procedure_number = ?
    `);
    return stmt.get(procedureNumber);
  } catch (error) {
    console.error('خطأ في استرجاع حالة المراحل:', error);
    return null;
  }
}

function saveTrackingStages(procedureNumber, stages) {
  try {
    const now = new Date().toISOString();
    const existing = getTrackingStages(procedureNumber);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE shipment_tracking_stages
        SET paper_reception = ?,
            inspection_sampling = ?,
            lab_testing = ?,
            clearance_procedures = ?,
            completed_at = ?,
            updated_at = ?
        WHERE procedure_number = ?
      `);
      stmt.run(
        stages.paperReception,
        stages.inspectionSampling,
        stages.labTesting,
        stages.clearanceProcedures,
        stages.completedAt || null,
        now,
        procedureNumber
      );
    } else {
      const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');
      const stmt = db.prepare(`
        INSERT INTO shipment_tracking_stages (
          id, procedure_number, paper_reception, inspection_sampling,
          lab_testing, clearance_procedures, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        uuidv4(),
        procedureNumber,
        stages.paperReception,
        stages.inspectionSampling,
        stages.labTesting,
        stages.clearanceProcedures,
        stages.completedAt || null,
        now,
        now
      );
    }
    return true;
  } catch (error) {
    console.error('خطأ في حفظ حالة المراحل:', error);
    return false;
  }
}

function getAllShipmentRatings() {
  try {
    const stmt = db.prepare(`
      SELECT * FROM shipment_ratings
      ORDER BY created_at DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error('خطأ في جلب التقييمات:', error);
    return [];
  }
}

function createShipmentRating(rating) {
  try {
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO shipment_ratings (
        id, procedure_number, service_satisfaction, experience_satisfaction,
        transaction_completion, procedures_clarity, comment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      rating.procedure_number,
      rating.service_satisfaction,
      rating.experience_satisfaction,
      rating.transaction_completion,
      rating.procedures_clarity,
      rating.comment || null,
      now,
      now
    );

    return { id, ...rating, created_at: now, updated_at: now };
  } catch (error) {
    console.error('خطأ في إنشاء التقييم:', error);
    throw error;
  }
}

function getRatingByProcedureNumber(procedureNumber) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM shipment_ratings
      WHERE procedure_number = ?
      LIMIT 1
    `);
    return stmt.get(procedureNumber);
  } catch (error) {
    console.error('خطأ في جلب التقييم:', error);
    return null;
  }
}

// Quarantine Traders functions
function getQuarantineTradersByShipmentId(shipmentId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM quarantine_traders
      WHERE shipment_id = ?
      ORDER BY created_at ASC
    `);
    const traders = stmt.all(shipmentId);

    // تحويل reasons من JSON string إلى array
    return traders.map(trader => ({
      ...trader,
      reasons: trader.reasons ? JSON.parse(trader.reasons) : []
    }));
  } catch (error) {
    console.error('خطأ في جلب بيانات التجار:', error);
    return [];
  }
}

function getAllQuarantineTraders() {
  try {
    const stmt = db.prepare(`
      SELECT * FROM quarantine_traders
      ORDER BY created_at DESC
    `);
    const traders = stmt.all();

    // تحويل reasons من JSON string إلى array
    return traders.map(trader => {
      return {
        ...trader,
        reasons: trader.reasons ? JSON.parse(trader.reasons) : []
      };
    });
  } catch (error) {
    console.error('خطأ في جلب جميع بيانات التجار:', error);
    return [];
  }
}

function saveQuarantineTraders(shipmentId, traders) {
  try {
    const now = getCurrentTimestamp();

    // حذف البيانات القديمة
    const deleteStmt = db.prepare('DELETE FROM quarantine_traders WHERE shipment_id = ?');
    deleteStmt.run(shipmentId);

    // إدراج البيانات الجديدة
    const insertStmt = db.prepare(`
      INSERT INTO quarantine_traders (
        id, shipment_id, importer_name, permit_number, statement_number,
        animal_count, animal_type, quarantine_location, quarantine_location_custom,
        notes, reasons, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    traders.forEach(trader => {
      insertStmt.run(
        trader.id || crypto.randomUUID(),
        shipmentId,
        trader.importer_name,
        trader.permit_number,
        trader.statement_number,
        trader.animal_count,
        trader.animal_type,
        trader.quarantine_location,
        trader.quarantine_location_custom || null,
        trader.notes || null,
        trader.reasons ? JSON.stringify(trader.reasons) : null,
        now,
        now
      );
    });

    return { success: true };
  } catch (error) {
    console.error('خطأ في حفظ بيانات التجار:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  // Users
  getUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  authenticateUser,
  // Saved Samples
  getSavedSamples,
  getSavedSampleById,
  createSavedSample,
  updateSavedSample,
  deleteSavedSample,
  // Samples
  getSamples,
  getSampleById,
  getSamplesBySavedSampleId,
  createSample,
  updateSample,
  deleteSample,
  // Test Results
  getTestResults,
  getTestResultsWithSampleInfo,
  getTestResultById,
  createTestResult,
  updateTestResult,
  deleteTestResult,
  // Inventory
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  // Inventory Transactions
  getInventoryTransactions,
  createInventoryTransaction,
  deleteInventoryTransaction,
  // Vet Procedures
  getVetProcedures,
  getVetProcedureById,
  getVetProcedureByNumber,
  createVetProcedure,
  updateVetProcedure,
  deleteVetProcedure,
  getNextVetProcedureNumber,
  // Vet Users
  getVetUsers,
  getVetUserById,
  getVetUserByUsername,
  createVetUser,
  updateVetUser,
  deleteVetUser,
  authenticateVetUser,
  // Animal Shipments
  getAnimalShipments,
  getAnimalShipmentById,
  createAnimalShipment,
  updateAnimalShipment,
  deleteAnimalShipment,
  checkShipmentByProcedureNumber,
  // Helpers
  getAllSavedSamplesWithSamples,
  getNextProcedureNumber,
  cleanupOrphanedResults,
  // Notifications
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
  // Vet Alerts
  getAllVetAlerts,
  getAlertForProcedure,
  getAlertByTypeForProcedure,
  createVetAlert,
  updateVetAlert,
  dismissVetAlert,
  deleteVetAlert,
  clearAllVetAlerts,
  getActiveVetAlertsCount,
  getVetAlertsByType,
  // Beneficiaries Users
  getBeneficiariesUsers,
  getBeneficiariesUserById,
  getBeneficiariesUserByEmail,
  createBeneficiariesUser,
  updateBeneficiariesUser,
  deleteBeneficiariesUser,
  authenticateBeneficiariesUser,
  initializeBeneficiariesDefaultUser,
  // Shipment Tracking Stages
  getTrackingStages,
  saveTrackingStages,
  // Shipment Ratings
  getAllShipmentRatings,
  createShipmentRating,
  getRatingByProcedureNumber,
  // Quarantine Traders
  getQuarantineTradersByShipmentId,
  saveQuarantineTraders,
  getAllQuarantineTraders,
  // Vet Importers
  getVetImporters,
  getVetImporterById,
  createVetImporter,
  updateVetImporter,
  deleteVetImporter
};
