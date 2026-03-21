import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';

export const EventLogPage = () => {
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState(null);
  
    useEffect(() => {
      let active = true;
      const load = async () => {
        try {
          const [evs, st] = await Promise.all([
            api.get("/events?limit=50"),
            api.get("/events/stats")
          ]);
          if (active) {
            setEvents(evs.events || []);
            setStats(st);
          }
        } catch (e) { console.error(e); }
      };
      load();
      return () => { active = false; };
    }, []);
  
    return (
      <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader 
          title="System Event Log" 
          subtitle="Immutable audit trail of all actions and transactions" 
        />
        
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <Card style={{ padding: "16px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, marginBottom: "4px" }}>Total Events</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats.totalEvents}</div>
            </Card>
            {stats.byType?.slice(0, 3).map(t => (
              <Card key={t.event_type} style={{ padding: "16px" }}>
                <div style={{ fontSize: "12px", color: THEME.textMuted, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.event_type}</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{t.count}</div>
              </Card>
            ))}
          </div>
        )}
  
        <Card style={{ padding: 0, flex: 1, overflow: "auto" }}>
          {events.length === 0 ? (
            <EmptyState icon="activity" title="No events found" desc="System activity will be logged here." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Entity ID</th>
                  <th>User</th>
                  <th>Payload Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => {
                  const isCreate = ev.event_type.endsWith("_CREATED");
                  const isUpdate = ev.event_type.endsWith("_UPDATED");
                  return (
                    <tr key={ev.id}>
                      <td style={{ color: THEME.textMuted, fontSize: "13px" }}>{new Date(ev.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: isCreate ? THEME.success : isUpdate ? THEME.warning : THEME.accent }}><Icon name="activity" size={14} /></span>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: THEME.text }}>{ev.event_type}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: THEME.textDim }}>{ev.entity_id}</td>
                      <td style={{ fontSize: "13px" }}>{ev.user_id}</td>
                      <td style={{ fontSize: "12px", color: THEME.textMuted, maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {JSON.stringify(ev.payload)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    );
  };

export default EventLogPage;
