type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  message: string;
  level: LogLevel;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  private formatMessage(data: LogData): string {
    const { message, level, timestamp, context, error } = data;
    
    const logObj = {
      timestamp: timestamp.toISOString(),
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    return JSON.stringify(logObj, null, this.environment === 'development' ? 2 : 0);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const logData: LogData = {
      message,
      level,
      timestamp: new Date(),
      context,
      error
    };

    const formattedMessage = this.formatMessage(logData);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.environment === 'development') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  // Métodos específicos para domínios
  paymentLog(action: string, paymentId: string, data?: Record<string, unknown>): void {
    this.info(`Payment ${action}`, {
      domain: 'payment',
      paymentId,
      ...data
    });
  }

  profileLog(action: string, profileId: string, data?: Record<string, unknown>): void {
    this.info(`Profile ${action}`, {
      domain: 'profile',
      profileId,
      ...data
    });
  }

  qrCodeLog(action: string, profileId: string, data?: Record<string, unknown>): void {
    this.info(`QRCode ${action}`, {
      domain: 'qrcode',
      profileId,
      ...data
    });
  }

  webhookLog(action: string, source: string, data?: Record<string, unknown>): void {
    this.info(`Webhook ${action}`, {
      domain: 'webhook',
      source,
      ...data
    });
  }

  // Método para logging de performance
  performance(operation: string, duration: number, context?: Record<string, unknown>): void {
    this.info(`Performance: ${operation}`, {
      domain: 'performance',
      duration: `${duration}ms`,
      ...context
    });
  }

  // Método para logging de métricas
  metric(name: string, value: number, unit: string, context?: Record<string, unknown>): void {
    this.info(`Metric: ${name}`, {
      domain: 'metrics',
      value,
      unit,
      ...context
    });
  }
}

export const logger = new Logger();