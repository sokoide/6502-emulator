
import React from 'react';
import { LogEntry } from '../types';

interface LogViewProps {
  logs: LogEntry[];
}

const LogView: React.FC<LogViewProps> = ({ logs }) => {
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'info':
      default: return 'text-blue-300';
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Execution Log</h2>
      <div className="font-mono text-xs overflow-y-auto h-40 bg-gray-900 p-2 rounded custom-scrollbar">
        {logs.length === 0 && <p className="text-gray-500">No log entries yet.</p>}
        {logs.map(log => (
          <div key={log.id} className={`mb-1 ${getLogColor(log.type)}`}>
            <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}: </span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogView;
