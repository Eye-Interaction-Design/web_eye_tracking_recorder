import React, { useEffect, useRef } from 'react';

interface LogDisplayProps {
  logs: string[];
}

export const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-section">
      <h3>System Log:</h3>
      <div className="log" ref={logRef}>
        {logs.length === 0 ? (
          <div>Ready to start...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
};