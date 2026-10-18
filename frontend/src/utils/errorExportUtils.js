export const exportFormats = {
  csv: {
    label: 'CSV',
    icon: 'fa-solid fa-file-csv',
    mime: 'text/csv',
    ext: 'csv',
    serialize: (errors) => {
      const headers = ['id', 'type', 'sourceTable', 'targetTable', 'chunk', 'row', 'message', 'sourceData', 'timestamp'];
      const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
      const rows = errors.map((e) => headers.map((h) => escape(e[h])).join(','));
      return [headers.join(','), ...rows].join('\n');
    },
  },
  json: {
    label: 'JSON',
    icon: 'fa-solid fa-file-code',
    mime: 'application/json',
    ext: 'json',
    serialize: (errors, pipelineName) => JSON.stringify({
      pipeline: pipelineName,
      exportedAt: new Date().toISOString(),
      totalErrors: errors.length,
      errors: errors.map((e) => ({
        id: e.id, type: e.type, sourceTable: e.sourceTable, targetTable: e.targetTable,
        chunk: e.chunk, row: e.row, message: e.message, sourceData: e.sourceData,
        timestamp: e.timestamp,
      })),
    }, null, 2),
  },
  txt: {
    label: 'Plain Text',
    icon: 'fa-solid fa-file-lines',
    mime: 'text/plain',
    ext: 'txt',
    serialize: (errors, pipelineName) => {
      const divider = '─'.repeat(60);
      const lines = [
        `Error Log Export — ${pipelineName}`,
        `Exported: ${new Date().toISOString()}`,
        `Total errors: ${errors.length}`,
        divider, '',
      ];
      errors.forEach((e, i) => {
        lines.push(`[${i + 1}] ${e.type} — ${e.sourceTable} → ${e.targetTable}`);
        lines.push(`    Chunk #${e.chunk}, Row #${e.row}`);
        lines.push(`    ${e.message}`);
        if (e.sourceData) lines.push(`    Data: ${e.sourceData}`);
        lines.push('');
      });
      return lines.join('\n');
    },
  },
};

export const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
