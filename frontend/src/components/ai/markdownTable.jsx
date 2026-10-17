import React from 'react';
import { renderInline } from './markdownInline';

export const isTableRow = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length > 2;
};

export const isTableDivider = (line) => {
  const trimmed = line.trim();
  return /^\|[\s:-]+(\|[\s:-]+)+\|?$/.test(trimmed);
};

export const parseTableCells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

export const parseTableBlock = (lines, startIdx) => {
  const headers = parseTableCells(lines[startIdx].trim());
  let i = startIdx + 2;
  const rows = [];
  while (i < lines.length && isTableRow(lines[i])) {
    rows.push(parseTableCells(lines[i]));
    i++;
  }
  return { headers, rows, nextIdx: i };
};

export const MarkdownTable = ({ headers, rows, isUser }) => (
  <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
    <table className="w-full text-xs text-left border-collapse bg-white">
      <thead>
        <tr
          className={
            isUser
              ? 'bg-indigo-100/70 text-indigo-950 font-bold border-b border-indigo-200'
              : 'bg-slate-50 text-slate-800 font-bold border-b border-slate-200'
          }
        >
          {headers.map((h, hIdx) => (
            <th
              key={hIdx}
              className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200 last:border-r-0"
            >
              {renderInline(h, isUser)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, rIdx) => (
          <tr key={rIdx} className="hover:bg-slate-50/50">
            {row.map((cell, cIdx) => (
              <td
                key={cIdx}
                className="px-3 py-2 text-slate-700 border-r border-slate-100 last:border-r-0"
              >
                {renderInline(cell, isUser)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

