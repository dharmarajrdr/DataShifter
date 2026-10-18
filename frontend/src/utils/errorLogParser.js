/**
 * Smart error log diagnostic parser.
 * Decomposes raw database and pipeline error messages into structured diagnostics.
 */
export const parseErrorDetails = (rawMessage, errorType) => {
  const msg = rawMessage || '';

  const oraMatch = msg.match(/ORA-\d{5}/i);
  const oraCode = oraMatch ? oraMatch[0].toUpperCase() : null;

  const docMatch = msg.match(/https?:\/\/[^\s)]+/);
  const docUrl = docMatch ? docMatch[0] : null;

  const constraintMatch = msg.match(/(?:unique|foreign key|check)?\s*constraint\s*\(([^)]+)\)/i);
  const constraint = constraintMatch ? constraintMatch[1] : null;

  const conflictMatch = msg.match(/(?:column values|columns)\s*\(([^)]+)\)/i);
  const conflict = conflictMatch ? conflictMatch[1] : null;

  let remediation = null;
  if (msg.includes(' — ')) {
    remediation = msg.split(' — ')[1].trim();
  } else if (msg.includes('ENGINE_OFFLINE')) {
    remediation = 'Start the execution-engine container (e.g. docker compose up -d execution-engine).';
  } else if (errorType === 'PK_DUPLICATE') {
    remediation = 'Switch write mode to UPSERT or truncate the target table before re-running.';
  } else if (errorType === 'NULL_CONSTRAINT') {
    remediation = 'Provide a default value or map a non-null source column in column mapping.';
  }

  return {
    code: oraCode || (msg.includes('ENGINE_OFFLINE') ? 'ENGINE_OFFLINE' : errorType || 'ERROR'),
    constraint,
    conflict,
    docUrl,
    remediation,
    cleanMessage: msg.split(' — ')[0].trim(),
    rawMessage: msg,
  };
};

export const formatErrorTimestamp = (isoDate) => {
  if (!isoDate) return 'Just now';
  try {
    const d = new Date(isoDate);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return String(isoDate);
  }
};
