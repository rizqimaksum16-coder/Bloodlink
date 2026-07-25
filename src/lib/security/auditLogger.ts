interface AuditLogEntry {
  action: string;
  userId?: string;
  userEmail?: string;
  details?: Record<string, any>;
  success?: boolean;
  timestamp?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private isEnabled: boolean = true;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.isEnabled) return;

    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    console.log('📋 [AUDIT LOG]', logEntry);
  }

  async logLoginAttempt(email: string, success: boolean, details?: any): Promise<void> {
    await this.log({
      action: 'LOGIN_ATTEMPT',
      userEmail: email,
      success,
      details: { email, ...details }
    });
  }

  async logSecurityEvent(event: string, details: any): Promise<void> {
    await this.log({
      action: 'SECURITY_EVENT',
      details: { event, ...details }
    });
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

export const auditLogger = AuditLogger.getInstance();