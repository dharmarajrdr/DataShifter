import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS, SIDEBAR_WIDTH } from '../../constants/design';
import { FCSS, FRSC, FRBC } from '../../constants/layouts';
import { APP, NAV } from '../../constants/literals';
import { PipelineIcon, ConnectionIcon, SettingsIcon, LogoIcon } from './Icons';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/authApi';

const NAV_ITEMS = [
  { label: NAV.pipelines, path: '/pipelines', icon: PipelineIcon },
  { label: NAV.connections, path: '/connections', icon: ConnectionIcon },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser, organizations, switchOrg, refreshOrganizations } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showOrgSwitch, setShowOrgSwitch] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [responding, setResponding] = useState(null);
  const notifRef = useRef(null);
  const orgRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Fetch pending invitations on mount
  useEffect(() => {
    if (user) authApi.myInvitations().then(r => setInvitations(r.data || [])).catch(() => {});
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (orgRef.current && !orgRef.current.contains(e.target)) setShowOrgSwitch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSwitchOrg = async (orgId) => {
    setSwitchingOrg(true);
    try {
      await switchOrg(orgId);
      setShowOrgSwitch(false);
      navigate('/pipelines');
    } catch (e) { console.error('Org switch failed:', e); }
    finally { setSwitchingOrg(false); }
  };

  const handleRespond = async (invId, action) => {
    setResponding(invId);
    try {
      await authApi.handleInvitation(invId, action);
      setInvitations(prev => prev.filter(i => i.id !== invId));
      if (action === 'ACCEPT') {
        authApi.me().then(r => updateUser(r.data)).catch(() => {});
        refreshOrganizations();
      }
    } catch (e) { console.error('Invitation response failed:', e); }
    finally { setResponding(null); }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: SIDEBAR_WIDTH,
      background: COLORS.background.primary,
      borderRight: `1px solid ${COLORS.border.light}`,
      padding: `${SPACING.md} 0`,
      height: '100vh',
      position: 'fixed', left: 0, top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ ...FRSC, gap: SPACING.xs, padding: `0 ${SPACING.md}`, marginBottom: SPACING.xl, cursor: 'pointer' }}
        onClick={() => navigate('/pipelines')}>
        <LogoIcon />
        <span style={{ fontWeight: FONT.weight.semibold, fontSize: FONT.size.lg, color: COLORS.text.primary }}>
          {APP.name}
        </span>
      </div>

      {/* Main Nav */}
      <div style={{ ...FCSS, gap: '2px', padding: `0 ${SPACING.xs}`, alignItems: 'stretch' }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <div key={item.path}
              onClick={() => navigate(item.path === '/settings' ? '/settings/org' : item.path)}
              style={{
                ...FRSC, gap: SPACING.xs,
                padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md,
                background: active ? COLORS.accent.purpleLight : 'transparent',
                color: active ? COLORS.accent.purpleText : COLORS.text.secondary,
                fontSize: FONT.size.md,
                fontWeight: active ? FONT.weight.medium : FONT.weight.regular,
                cursor: 'pointer', transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = COLORS.background.tertiary; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon color={active ? COLORS.accent.purpleText : COLORS.text.secondary} size={16} />
              {item.label}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Notification bell */}
      <div ref={notifRef} style={{ padding: `0 ${SPACING.sm}`, marginBottom: SPACING.xs, position: 'relative' }}>
        <div onClick={() => setShowNotif(!showNotif)}
          style={{
            ...FRSC, justifyContent: 'center', gap: '6px', padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md, cursor: 'pointer', position: 'relative',
            background: showNotif ? COLORS.background.secondary : 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary}
          onMouseLeave={e => { if (!showNotif) e.currentTarget.style.background = 'transparent'; }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6v2.5L2 10v1h12v-1l-1.5-1.5V6c0-2.5-2-4.5-4.5-4.5z" stroke={COLORS.text.secondary} strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M6 12a2 2 0 004 0" stroke={COLORS.text.secondary} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Notifications</span>
          {invitations.length > 0 && (
            <span style={{
              position: 'absolute', top: 4, left: 22, width: 16, height: 16, borderRadius: '50%',
              background: '#A32D2D', color: '#fff', fontSize: '9px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{invitations.length}</span>
          )}
        </div>

        {/* Notification dropdown */}
        {showNotif && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px',
            width: '280px', background: '#fff', border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.lg, boxShadow: '0 4px 16px rgba(0,0,0,.1)',
            zIndex: 100, maxHeight: '320px', overflow: 'auto',
          }}>
            <div style={{ padding: `${SPACING.sm} ${SPACING.md}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
              <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium }}>Notifications</p>
            </div>
            {invitations.length === 0 ? (
              <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.xs }}>
                No new notifications
              </div>
            ) : (
              invitations.map(inv => (
                <div key={inv.id} style={{ padding: `${SPACING.sm} ${SPACING.md}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Organization invitation
                  </p>
                  <p style={{ fontSize: '11px', color: COLORS.text.secondary, marginBottom: SPACING.xs }}>
                    <b>{inv.invitedByName || 'Admin'}</b> invited you to join <b>{inv.orgName}</b> as {inv.roleName || 'Member'}
                  </p>
                  <div style={{ ...FRSC, gap: '6px' }}>
                    <button onClick={() => handleRespond(inv.id, 'ACCEPT')} disabled={responding === inv.id}
                      style={{ padding: '3px 10px', borderRadius: '4px', border: 'none', background: COLORS.brand.primary, color: '#fff', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                      {responding === inv.id ? '...' : 'Accept'}
                    </button>
                    <button onClick={() => handleRespond(inv.id, 'REJECT')} disabled={responding === inv.id}
                      style={{ padding: '3px 10px', borderRadius: '4px', border: `1px solid ${COLORS.border.light}`, background: '#fff', color: COLORS.text.secondary, fontSize: '11px', cursor: 'pointer' }}>
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Docs link */}
      <div style={{ padding: `0 ${SPACING.sm}`, marginBottom: SPACING.xs }}>
        <div onClick={() => navigate('/docs')}
          style={{
            ...FRSC, justifyContent: 'center', gap: '6px', padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md, cursor: 'pointer',
            background: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2.5h7l3 3V13a.5.5 0 01-.5.5h-9A.5.5 0 013 13V3a.5.5 0 01.5-.5z" stroke={COLORS.text.secondary} strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M10 2.5V5.5h3" stroke={COLORS.text.secondary} strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M5.5 8h5M5.5 10.5h3.5" stroke={COLORS.text.secondary} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Documentation</span>
        </div>
      </div>

      {/* Profile + Org Switcher */}
      <div style={{ padding: `0 ${SPACING.xs}`, borderTop: `1px solid ${COLORS.border.light}`, paddingTop: SPACING.sm }}>

        {/* Org switcher — only show if multiple orgs */}
        {organizations.length > 1 && (
          <div ref={orgRef} style={{ position: 'relative', marginBottom: '4px' }}>
            <div onClick={() => setShowOrgSwitch(!showOrgSwitch)}
              style={{
                ...FRBC, padding: `5px ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md,
                cursor: 'pointer', background: showOrgSwitch ? COLORS.background.secondary : 'transparent',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary}
              onMouseLeave={e => { if (!showOrgSwitch) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.orgName || 'No org'}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3.5 5L6 7.5L8.5 5" stroke={COLORS.text.tertiary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {showOrgSwitch && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px',
                background: '#fff', border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md, boxShadow: '0 4px 16px rgba(0,0,0,.08)',
                zIndex: 110, overflow: 'hidden',
              }}>
                <div style={{ padding: `6px ${SPACING.xs}` }}>
                  <p style={{ fontSize: '10px', color: COLORS.text.tertiary, padding: `2px 6px`, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Switch organization
                  </p>
                  {organizations.map(org => {
                    const isCurrent = org.orgId === user?.orgId;
                    return (
                      <div key={org.orgId}
                        onClick={() => { if (!isCurrent && !switchingOrg) handleSwitchOrg(org.orgId); }}
                        style={{
                          ...FRBC, padding: `6px 8px`, borderRadius: BORDER_RADIUS.sm, marginTop: '2px',
                          cursor: isCurrent ? 'default' : 'pointer',
                          background: isCurrent ? COLORS.accent.purpleLight : 'transparent',
                          opacity: switchingOrg && !isCurrent ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = COLORS.background.tertiary; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? COLORS.accent.purpleLight : 'transparent'; }}>
                        <div>
                          <p style={{
                            fontSize: FONT.size.xs, margin: 0,
                            fontWeight: isCurrent ? 500 : 400,
                            color: isCurrent ? COLORS.accent.purpleText : COLORS.text.primary,
                          }}>{org.orgName}</p>
                          <p style={{ fontSize: '10px', color: COLORS.text.tertiary, margin: 0 }}>{org.roleName || 'Member'}</p>
                        </div>
                        {isCurrent && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7L6 10L11 4" stroke={COLORS.accent.purpleText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div onClick={() => navigate('/profile')}
          style={{
            ...FRSC, gap: SPACING.xs,
            padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md,
            background: isActive('/profile') ? COLORS.accent.purpleLight : 'transparent',
            cursor: 'pointer', transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { if (!isActive('/profile')) e.currentTarget.style.background = COLORS.background.tertiary; }}
          onMouseLeave={e => { if (!isActive('/profile')) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: user?.avatarColor || COLORS.brand.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: FONT.size.xs, fontWeight: 500, color: '#fff', flexShrink: 0,
          }}>{user?.displayInitials || '?'}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: FONT.size.sm, fontWeight: FONT.weight.medium,
              color: isActive('/profile') ? COLORS.accent.purpleText : COLORS.text.primary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.3, margin: 0,
            }}>{user?.fullName || 'User'}</p>
            <p style={{ fontSize: '10px', color: COLORS.text.tertiary, lineHeight: 1.3, margin: 0 }}>{user?.roleName || 'Member'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;