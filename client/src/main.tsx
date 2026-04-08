import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AgentWorkflow from './pages/AgentWorkflow';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Login />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="agent" element={<AgentWorkflow />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);