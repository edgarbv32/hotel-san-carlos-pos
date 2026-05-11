import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ---- NUEVO: Se importan las APIs de Tauri necesarias ----
import { appWindow } from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/api/dialog';
import { exit } from '@tauri-apps/api/process';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Entradas from './pages/Entradas';
import Salidas from './pages/Salidas';
import Habitaciones from './pages/Habitaciones';
import Reportes from './pages/Reportes';
import Consultas from './pages/Consultas';
import Precios from './pages/Precios';

function App() {
  
  // ---- NUEVO: Lógica para confirmar el cierre de la ventana ----
  useEffect(() => {
    const unlisten = appWindow.onCloseRequested(async (event) => {
      // Previene que la ventana se cierre inmediatamente
      event.preventDefault();
      
      // Muestra el diálogo de confirmación nativo
      const confirmed = await confirm('¿Estás seguro de que deseas cerrar el punto de venta?', {
        title: 'Confirmar Cierre',
        type: 'warning'
      });

      // Si el usuario confirma, se cierra la aplicación
      if (confirmed) {
        await exit(0);
      }
    });

    // Función de limpieza para remover el listener cuando el componente se desmonte
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <PrivateRoute>
            <Layout>
              <Reservations />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/entradas"
        element={
          <PrivateRoute>
            <Layout>
              <Entradas />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/salidas"
        element={
          <PrivateRoute>
            <Layout>
              <Salidas />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/habitaciones"
        element={
          <PrivateRoute>
            <Layout>
              <Habitaciones />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Layout>
              <Reportes />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/consultas"
        element={
          <PrivateRoute>
            <Layout>
              <Consultas />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/precios"
        element={
          <PrivateRoute>
            <Layout>
              <Precios />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Catch-all: redirige a Home si no coincide ninguna ruta */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;