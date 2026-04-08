import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import axiosInstance from './api/axios';
import './App.css'; // keep if you want, or remove later

function App() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await axiosInstance.get('/test-db');
        console.log('✅ API test successful:', response.data);
      } catch (error) {
        console.error('❌ API test failed:', error);
      }
    };
    testConnection();
  }, []);

  return (
    <div className="App">
      <Outlet />
    </div>
  );
}

export default App;