import { VetProcedureAlert } from '../types';
import { localDB } from './localDatabase';

const isElectron = !!(window as any).electron;

export function getAllAlerts(): VetProcedureAlert[] {
  if (isElectron) {
    try {
      const alerts = (window as any).electron.getAllVetAlerts();
      return alerts.map((alert: any) => ({
        ...alert,
        dismissed: !!alert.dismissed
      }));
    } catch (error) {
      console.error('Error reading alerts from Electron:', error);
      return [];
    }
  } else {
    try {
      const data = localStorage.getItem('vet_procedure_alerts');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading alerts from localStorage:', error);
      return [];
    }
  }
}

function saveAlert(alert: VetProcedureAlert): void {
  if (isElectron) {
    try {
      const existing = (window as any).electron.getAlertByTypeForProcedure(alert.vet_procedure_number, alert.action_type);
      if (existing) {
        (window as any).electron.updateVetAlert(alert.vet_procedure_number, {
          action_type: alert.action_type,
          action_timestamp: alert.action_timestamp,
          dismissed: alert.dismissed,
          target_action_type: alert.action_type
        });
      } else {
        (window as any).electron.createVetAlert(alert);
      }
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error saving alert to Electron:', error);
    }
  } else {
    try {
      const alerts = getAllAlerts();
      const existingIndex = alerts.findIndex(
        a => a.vet_procedure_number === alert.vet_procedure_number &&
        a.action_type === alert.action_type
      );

      if (existingIndex >= 0) {
        alerts[existingIndex] = alert;
      } else {
        alerts.push(alert);
      }

      localStorage.setItem('vet_procedure_alerts', JSON.stringify(alerts));
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error saving alert to localStorage:', error);
    }
  }
}

export async function createAlertForNew(
  vetProcedureNumber: string
): Promise<void> {
  const newAlert: VetProcedureAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vet_procedure_number: vetProcedureNumber,
    action_type: 'new',
    action_timestamp: new Date().toISOString(),
    dismissed: false,
    created_at: new Date().toISOString()
  };

  saveAlert(newAlert);
}

export async function createAlertForUpdate(
  vetProcedureNumber: string
): Promise<void> {
  const hasLinkedProcedure = await checkLinkedLabProcedure(vetProcedureNumber);

  if (!hasLinkedProcedure) {
    console.log(`No linked lab procedure found for ${vetProcedureNumber}, skipping alert creation`);
    return;
  }

  const newAlert: VetProcedureAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vet_procedure_number: vetProcedureNumber,
    action_type: 'updated',
    action_timestamp: new Date().toISOString(),
    dismissed: false,
    created_at: new Date().toISOString()
  };

  saveAlert(newAlert);
}

export async function createAlertForDelete(
  vetProcedureNumber: string
): Promise<void> {
  const hasLinkedProcedure = await checkLinkedLabProcedure(vetProcedureNumber);

  if (!hasLinkedProcedure) {
    console.log(`No linked lab procedure found for ${vetProcedureNumber}, skipping alert creation`);
    return;
  }

  const newAlert: VetProcedureAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vet_procedure_number: vetProcedureNumber,
    action_type: 'deleted',
    action_timestamp: new Date().toISOString(),
    dismissed: false,
    created_at: new Date().toISOString()
  };

  saveAlert(newAlert);
}

export function dismissAlert(
  vetProcedureNumber: string,
  actionType?: 'new' | 'updated' | 'deleted' | 'results_completed'
): void {
  if (isElectron) {
    try {
      (window as any).electron.dismissVetAlert(vetProcedureNumber, actionType);
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error dismissing alert in Electron:', error);
    }
  } else {
    const alerts = getAllAlerts();
    const alertsToUpdate = actionType
      ? alerts.filter(a => a.vet_procedure_number === vetProcedureNumber && a.action_type === actionType)
      : alerts.filter(a => a.vet_procedure_number === vetProcedureNumber);

    if (alertsToUpdate.length > 0) {
      alertsToUpdate.forEach(alert => {
        alert.dismissed = true;
      });
      localStorage.setItem('vet_procedure_alerts', JSON.stringify(alerts));
      window.dispatchEvent(new Event('alerts-updated'));
    }
  }
}

export function isAlertDismissed(
  vetProcedureNumber: string
): boolean {
  const alerts = getAllAlerts();
  const alert = alerts.find(
    a => a.vet_procedure_number === vetProcedureNumber
  );

  if (!alert) return true;
  return alert.dismissed || false;
}

export function getAlertForProcedure(
  vetProcedureNumber: string
): VetProcedureAlert | null {
  if (isElectron) {
    try {
      const alert = (window as any).electron.getAlertForProcedure(vetProcedureNumber);
      if (alert) {
        return {
          ...alert,
          dismissed: !!alert.dismissed
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting alert from Electron:', error);
      return null;
    }
  } else {
    const alerts = getAllAlerts();
    const procedureAlerts = alerts.filter(
      a => a.vet_procedure_number === vetProcedureNumber && !a.dismissed
    );

    if (procedureAlerts.length === 0) return null;

    const priorityOrder: Record<string, number> = {
      'deleted': 1,
      'updated': 2,
      'new': 3,
      'results_completed': 4
    };

    procedureAlerts.sort((a, b) => {
      return (priorityOrder[a.action_type] || 999) - (priorityOrder[b.action_type] || 999);
    });

    return procedureAlerts[0];
  }
}

export function getActiveAlertsCount(): number {
  if (isElectron) {
    try {
      return (window as any).electron.getActiveVetAlertsCount();
    } catch (error) {
      console.error('Error getting active alerts count from Electron:', error);
      return 0;
    }
  } else {
    const alerts = getAllAlerts();
    return alerts.filter(a => !a.dismissed).length;
  }
}

export function getDeletedAlertsCount(): number {
  if (isElectron) {
    try {
      const alerts = (window as any).electron.getVetAlertsByType('deleted');
      return alerts.length;
    } catch (error) {
      console.error('Error getting deleted alerts count from Electron:', error);
      return 0;
    }
  } else {
    const alerts = getAllAlerts();
    return alerts.filter(a => !a.dismissed && a.action_type === 'deleted').length;
  }
}

export function getUpdatedAlertsCount(): number {
  if (isElectron) {
    try {
      const alerts = (window as any).electron.getVetAlertsByType('updated');
      return alerts.length;
    } catch (error) {
      console.error('Error getting updated alerts count from Electron:', error);
      return 0;
    }
  } else {
    const alerts = getAllAlerts();
    return alerts.filter(a => !a.dismissed && a.action_type === 'updated').length;
  }
}

export function getNewAlertsCount(): number {
  if (isElectron) {
    try {
      const alerts = (window as any).electron.getVetAlertsByType('new');
      return alerts.length;
    } catch (error) {
      console.error('Error getting new alerts count from Electron:', error);
      return 0;
    }
  } else {
    const alerts = getAllAlerts();
    return alerts.filter(a => !a.dismissed && a.action_type === 'new').length;
  }
}

export async function createAlertForResultsCompleted(
  vetProcedureNumber: string
): Promise<void> {
  const newAlert: VetProcedureAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vet_procedure_number: vetProcedureNumber,
    action_type: 'results_completed',
    action_timestamp: new Date().toISOString(),
    dismissed: false,
    created_at: new Date().toISOString()
  };

  saveAlert(newAlert);
}

export function getResultsCompletedAlertsCount(): number {
  if (isElectron) {
    try {
      const alerts = (window as any).electron.getVetAlertsByType('results_completed');
      return alerts.length;
    } catch (error) {
      console.error('Error getting results completed alerts count from Electron:', error);
      return 0;
    }
  } else {
    const alerts = getAllAlerts();
    return alerts.filter(a => !a.dismissed && a.action_type === 'results_completed').length;
  }
}

export function clearOldAlerts(daysOld: number = 30): void {
  const alerts = getAllAlerts();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const recentAlerts = alerts.filter(alert => {
    const alertDate = new Date(alert.created_at);
    return alertDate > cutoffDate;
  });

  const oldAlerts = alerts.filter(alert => {
    const alertDate = new Date(alert.created_at);
    return alertDate <= cutoffDate;
  });

  if (isElectron) {
    try {
      oldAlerts.forEach(alert => {
        (window as any).electron.deleteVetAlert(alert.vet_procedure_number);
      });
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error clearing old alerts in Electron:', error);
    }
  } else {
    localStorage.setItem('vet_procedure_alerts', JSON.stringify(recentAlerts));
    window.dispatchEvent(new Event('alerts-updated'));
  }
}

export function deleteAlertForProcedure(
  vetProcedureNumber: string
): void {
  if (isElectron) {
    try {
      (window as any).electron.deleteVetAlert(vetProcedureNumber);
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error deleting alert in Electron:', error);
    }
  } else {
    const alerts = getAllAlerts();
    const filteredAlerts = alerts.filter(
      a => a.vet_procedure_number !== vetProcedureNumber
    );
    localStorage.setItem('vet_procedure_alerts', JSON.stringify(filteredAlerts));
    window.dispatchEvent(new Event('alerts-updated'));
  }
}

export function clearAllAlerts(): void {
  if (isElectron) {
    try {
      (window as any).electron.clearAllVetAlerts();
      window.dispatchEvent(new Event('alerts-updated'));
    } catch (error) {
      console.error('Error clearing all alerts in Electron:', error);
    }
  } else {
    localStorage.setItem('vet_procedure_alerts', JSON.stringify([]));
    window.dispatchEvent(new Event('alerts-updated'));
  }
}

async function checkLinkedLabProcedure(vetProcedureNumber: string): Promise<boolean> {
  try {
    const procedures = await localDB.getSavedSamples();

    const linkedProcedure = procedures.find(
      p => p.external_procedure_number === vetProcedureNumber
    );

    return !!linkedProcedure;
  } catch (error) {
    console.error('Error checking linked lab procedure:', error);
    return false;
  }
}

export async function cleanupOrphanedAlerts(): Promise<void> {
  try {
    const alerts = getAllAlerts();
    const procedures = await localDB.getSavedSamples();

    const linkedProcedureNumbers = new Set(
      procedures
        .filter(p => p.external_procedure_number)
        .map(p => p.external_procedure_number)
    );

    const alertsToDelete = alerts.filter(alert => {
      const hasLinkedProcedure = linkedProcedureNumbers.has(alert.vet_procedure_number);

      if (alert.action_type === 'updated') {
        return false;
      }

      if (alert.action_type === 'deleted') {
        return !hasLinkedProcedure;
      }

      return false;
    });

    if (alertsToDelete.length > 0) {
      alertsToDelete.forEach(alert => {
        deleteAlertForProcedure(alert.vet_procedure_number);
      });
      console.log(`Cleaned up ${alertsToDelete.length} orphaned alerts`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned alerts:', error);
  }
}
