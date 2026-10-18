import React from 'react';
import ColumnMappingPage from './pipeline/ColumnMappingPage';

/**
 * ColumnMappingBoard forwarder component (<= 100 lines).
 * Retains exact existing node-port board design and UI behavior.
 */
export const ColumnMappingBoard = (props) => <ColumnMappingPage {...props} />;

export default ColumnMappingBoard;