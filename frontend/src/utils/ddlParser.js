const MULTI_TYPES = [
  'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITHOUT TIME ZONE',
  'TIME WITH TIME ZONE', 'TIME WITHOUT TIME ZONE', 'DOUBLE PRECISION',
];

const splitStatements = (body) => {
  const items = [];
  let depth = 0, inSingle = false, inDouble = false, cur = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) {
        if (cur.trim()) items.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += c;
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
};

const extractPks = (items) => {
  const pks = new Set();
  items.forEach((item) => {
    const m = item.match(/(?:CONSTRAINT\s+[`"'\w]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (m) m[1].split(',').forEach((c) => pks.add(c.trim().replace(/[`"']/g, '').toLowerCase()));
  });
  return pks;
};

const isTableConstraint = (item) => {
  const u = item.trim().toUpperCase();
  return u.startsWith('CONSTRAINT') || u.startsWith('PRIMARY KEY') ||
         u.startsWith('UNIQUE') || u.startsWith('FOREIGN KEY') ||
         u.startsWith('CHECK') || u.startsWith('KEY ') || u.startsWith('INDEX ');
};

const extractCol = (item, pks) => {
  if (isTableConstraint(item)) return null;
  const match = item.match(/^([`"']?[\w.-]+[`"']?)\s+(.+)$/s);
  if (!match) return null;
  const name = match[1].replace(/[`"']/g, '');
  const rest = match[2].trim();
  const multi = MULTI_TYPES.find((t) => rest.toUpperCase().startsWith(t));
  let type = multi;
  if (!type) {
    const tm = rest.match(/^([a-zA-Z0-9_]+(?:\s*\([^)]*\))?)/);
    type = tm ? tm[1].trim() : 'VARCHAR';
  }
  const nullable = !/\bNOT\s+NULL\b/i.test(rest);
  const primaryKey = /\bPRIMARY\s+KEY\b/i.test(rest) || pks.has(name.toLowerCase());
  return { name, type, dataType: type, nullable, primaryKey };
};

export const parseDdlColumns = (ddlSql) => {
  if (!ddlSql || typeof ddlSql !== 'string') return [];
  const start = ddlSql.indexOf('(');
  const end = ddlSql.lastIndexOf(')');
  if (start === -1 || end === -1 || end <= start) return [];
  const body = ddlSql.slice(start + 1, end).trim();
  const items = splitStatements(body);
  const pks = extractPks(items);
  return items.map((it) => extractCol(it, pks)).filter(Boolean);
};

export const parseDdlTableName = (ddlSql) => {
  if (!ddlSql) return '';
  const m = ddlSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?[\w.-]+[`"']?)/i);
  return m ? m[1].replace(/[`"']/g, '') : '';
};
