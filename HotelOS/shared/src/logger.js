function createLogger(serviceName) {
  const prefix = { service: serviceName };

  const log = (level, message, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...prefix,
      message,
      ...meta,
    };
    
    // NASA Standard: Telemetry should be machine-readable (JSON)
    if (level === 'ERROR') {
      console.error(JSON.stringify(entry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  return {
    info: (msg, meta) => log('INFO', msg, meta),
    warn: (msg, meta) => log('WARN', msg, meta),
    error: (msg, meta) => {
      if (meta instanceof Error) {
        log('ERROR', msg, { 
          error: meta.message, 
          stack: meta.stack,
          ...meta 
        });
      } else {
        log('ERROR', msg, meta);
      }
    },
    // NASA Mission Critical: Audit log for security events
    audit: (action, actor, details) => log('AUDIT', action, { actor, ...details })
  };
}

module.exports = { createLogger };
