import React from 'react';
import { renderInline } from './markdownInline';

const BULLET_REGEX = /^\s*•\s*(.*)$/;

const flushBulletGroup = (bullets, elements, keyPrefix, isUser) => {
  if (bullets.length === 0) return;
  elements.push(
    <ul key={`${keyPrefix}-ul`} className="list-disc pl-4 space-y-1 my-0.5">
      {bullets.map((item, idx) => (
        <li key={idx} className="leading-relaxed pl-0.5">
          {renderInline(item, isUser)}
        </li>
      ))}
    </ul>
  );
  bullets.length = 0;
};

export const renderTableCell = (cell, isUser) => {
  if (!cell) return null;
  const rawText = String(cell);
  const lines = rawText.split(/<br\s*\/?>/gi);

  if (lines.length === 1 && !BULLET_REGEX.test(lines[0])) {
    return renderInline(cell, isUser);
  }

  const elements = [];
  const currentBullets = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(BULLET_REGEX);

    if (bulletMatch) {
      currentBullets.push(bulletMatch[1]);
    } else {
      flushBulletGroup(currentBullets, elements, `b-${idx}`, isUser);
      if (trimmed) {
        elements.push(
          <div key={`line-${idx}`} className="leading-normal">
            {renderInline(trimmed, isUser)}
          </div>
        );
      }
    }
  });

  flushBulletGroup(currentBullets, elements, 'b-end', isUser);
  return elements.length > 0 ? elements : renderInline(cell, isUser);
};
