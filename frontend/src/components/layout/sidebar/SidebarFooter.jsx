import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Tooltip from '../../common/Tooltip';

export const SidebarFooter = ({
  id = 'sidebar-footer',
  className = '',
  isCollapsed = false,
}) => {
  const navigate = useNavigate();
  const { user, organizations, switchOrg } = useAuth();
  const [showOrgSwitch, setShowOrgSwitch] = useState(false);
  const [switching, setSwitching] = useState(false);
  const orgRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (orgRef.current && !orgRef.current.contains(e.target)) setShowOrgSwitch(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSwitch = async (orgId) => {
    setSwitching(true);
    try {
      await switchOrg(orgId);
      setShowOrgSwitch(false);
      navigate('/pipelines');
    } finally {
      setSwitching(false);
    }
  };

  const content = (
    <div id={id} className={`p-2 border-t border-surface-200 bg-white relative ${className}`}>
      {organizations.length > 1 && !isCollapsed && (
        <div ref={orgRef} className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowOrgSwitch(!showOrgSwitch)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-surface-100 text-xs font-semibold text-content-secondary"
          >
            <span className="truncate">{user?.orgName || 'Select Org'}</span>
            <svg className="w-3.5 h-3.5 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showOrgSwitch && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-surface-200 rounded-lg shadow-elevated z-50 p-1.5">
              {organizations.map((org) => (
                <button
                  key={org.orgId}
                  onClick={() => handleSwitch(org.orgId)}
                  disabled={switching || org.orgId === user?.orgId}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${org.orgId === user?.orgId ? 'bg-brand-50 text-brand-700 font-semibold' : 'hover:bg-surface-100 text-content-primary'}`}
                >
                  {org.orgName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        id="sidebar-user-profile-btn"
        type="button"
        onClick={() => navigate('/profile')}
        className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-100 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
      >
        <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
          {user?.displayInitials || 'DR'}
        </div>
        {!isCollapsed && (
          <div className="min-w-0 text-left flex-1">
            <p className="text-xs font-semibold text-content-primary truncate leading-tight">{user?.fullName || 'User'}</p>
            <p className="text-[10px] text-content-tertiary truncate leading-tight">{user?.roleName || 'Member'}</p>
          </div>
        )}
      </button>
    </div>
  );

  return isCollapsed ? <Tooltip text={`${user?.fullName || 'User'} (${user?.orgName || 'Org'})`} position="right">{content}</Tooltip> : content;
};

export default SidebarFooter;
