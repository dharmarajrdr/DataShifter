import React, { useState, useEffect } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';
import { connectionApi } from '../../services/api';
import { ErrorPage } from '../../pages/ErrorPage';

const SchemaDrawer = ({ connectionId, connectionName, onClose }) => {
  const [tables, setTables] = useState([]);
  const [expandedTable, setExpandedTable] = useState(null);
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    connectionApi.listTables(connectionId).then(res => {
      setTables(res.data || []);
      setLoading(false);
    }).catch((err) => {
      setError(err.message || 'Failed to load tables');
      setErrorStatus(err.status || err?.response?.status || 500);
      setLoading(false);
    });
  }, [connectionId]);

  const toggleTable = async (tableName) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableName);
    if (!columns[tableName]) {
      try {
        const res = await connectionApi.getTableMetadata(connectionId, tableName);
        setColumns(prev => ({ ...prev, [tableName]: res.data?.columns || [] }));
      } catch {
        setColumns(prev => ({ ...prev, [tableName]: [] }));
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
      background: COLORS.background.primary, borderLeft: `1px solid ${COLORS.border.light}`,
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}`, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium }}>Schema browser</p>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>{connectionName}</p>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
      </div>

      {/* Search */}
      <div style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}`, flexShrink: 0 }}>
        <input
          placeholder={`Search ${tables.length} tables...`}
          onChange={e => {
            const q = e.target.value.toLowerCase();
            // Filter is handled inline below
            e.target.dataset.query = q;
            e.target.parentElement.parentElement.querySelector('[data-tablelist]')?.dispatchEvent(new Event('filter'));
          }}
          style={{
            width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm, boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table list */}
      <div style={{ flex: 1, overflow: 'auto', padding: `${SPACING.xs} 0` }}>
        {loading ? (
          <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.text.secondary }}>Loading schema...</div>
        ) : error ? (
          <ErrorPage
            status={errorStatus || 500}
            compact
            message={error}
            missingPermission={errorStatus === 403 ? 'connection:browse_schema' : undefined}
            showBack={false}
            showHome={false}
          />
        ) : tables.length === 0 ? (
          <div style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.text.tertiary }}>No tables found</div>
        ) : (
          tables.map(table => (
            <div key={table}>
              {/* Table row */}
              <div
                onClick={() => toggleTable(table)}
                style={{
                  ...FRBC, padding: `${SPACING.xs} ${SPACING.lg}`, cursor: 'pointer',
                  background: expandedTable === table ? COLORS.background.secondary : 'transparent',
                }}
                onMouseEnter={e => { if (expandedTable !== table) e.currentTarget.style.background = COLORS.background.secondary; }}
                onMouseLeave={e => { if (expandedTable !== table) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ ...FRSC, gap: SPACING.xs }}>
                  <span style={{ fontSize: '10px', color: COLORS.text.tertiary, width: '12px' }}>
                    {expandedTable === table ? '▼' : '▶'}
                  </span>
                  <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>{table}</span>
                </div>
                {columns[table] && (
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>{columns[table].length} cols</span>
                )}
              </div>

              {/* Expanded columns */}
              {expandedTable === table && columns[table] && (
                <div style={{ padding: `0 ${SPACING.lg} ${SPACING.xs} 40px` }}>
                  {columns[table].length === 0 ? (
                    <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, padding: SPACING.xxs }}>No column data available</p>
                  ) : (
                    columns[table].map(col => (
                      <div key={col.columnName} style={{
                        ...FRSC, gap: SPACING.xs, padding: '3px 0', fontSize: FONT.size.xs,
                      }}>
                        {col.primaryKey && (
                          <span style={{
                            background: COLORS.accent.purpleLight, color: COLORS.accent.purpleText,
                            padding: '0 4px', borderRadius: '3px', fontSize: '9px', fontWeight: FONT.weight.medium,
                          }}>PK</span>
                        )}
                        <span style={{ color: COLORS.text.primary }}>{col.columnName}</span>
                        <span style={{
                          background: COLORS.background.secondary, padding: '0 4px',
                          borderRadius: '3px', fontSize: '10px', color: COLORS.text.secondary,
                        }}>{col.dataType}</span>
                        {!col.nullable && (
                          <span style={{ fontSize: '9px', color: COLORS.status.warningDark }}>NOT NULL</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderTop: `1px solid ${COLORS.border.light}`, flexShrink: 0 }}>
        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>{tables.length} tables in schema</span>
      </div>
    </div>
  );
};

export default SchemaDrawer;