import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Workflows } from './pages/Workflows';
import { Analytics } from './pages/Analytics';
import { McpServers } from './pages/McpServers';
import { Context7 } from './pages/Context7';
import { Components } from './pages/Components';
import { Documentation } from './pages/Documentation';
import { Settings } from './pages/Settings';
import { Chat } from './pages/Chat';
import { ErrorBoundary } from './components/ErrorBoundary';

// Import our Cartrita design system styles
import './styles/aurora-design-system.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="agents" element={<Agents />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="mcp-servers" element={<McpServers />} />
              <Route path="context7" element={<Context7 />} />
              <Route path="components" element={<Components />} />
              <Route path="docs" element={<Documentation />} />
              <Route path="settings" element={<Settings />} />
              <Route path="chat" element={<Chat />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;