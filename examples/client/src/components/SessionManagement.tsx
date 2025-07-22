import React from 'react';
import type { SessionInfo } from 'eye-analysis/recorder/types';

interface SessionManagementProps {
  sessions: Map<string, SessionInfo>;
  currentSession: SessionInfo | null;
}

export const SessionManagement: React.FC<SessionManagementProps> = ({
  sessions,
  currentSession
}) => {
  const sessionArray = Array.from(sessions.values());

  return (
    <div className="config-section">
      <h3>Session Management</h3>
      
      <div className="session-info">
        <h4>Current Session</h4>
        {currentSession ? (
          <div className="session-details">
            <p><strong>ID:</strong> {currentSession.sessionId}</p>
            <p><strong>Participant:</strong> {currentSession.participantId}</p>
            <p><strong>Type:</strong> {currentSession.experimentType}</p>
            <p><strong>Started:</strong> {new Date(currentSession.startTime).toLocaleString()}</p>
          </div>
        ) : (
          <p>No active session</p>
        )}
      </div>

      <div className="sessions-list">
        {sessionArray.length === 0 ? (
          <p>No completed sessions yet</p>
        ) : (
          <>
            <h4>Completed Sessions ({sessionArray.length})</h4>
            {sessionArray.map((session) => (
              <div key={session.sessionId} className="session-item">
                <div className="session-header">
                  <strong>{session.sessionId}</strong>
                </div>
                <div className="session-meta">
                  <span>Participant: {session.participantId}</span>
                  <span>Type: {session.experimentType}</span>
                  <span>Started: {new Date(session.startTime).toLocaleString()}</span>
                  {session.endTime && (
                    <span>Ended: {new Date(session.endTime).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};