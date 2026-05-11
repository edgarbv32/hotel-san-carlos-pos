import React from 'react';

function HistoryModal({ history, onClose }) {
  // ---- PRUEBA DE DIAGNÓSTICO ----
  // Nos dirá si el componente se está renderizando y si recibe la orden de cerrarse.
  console.log('Se renderiza HistoryModal. La función onClose existe:', !!onClose);

  const handleCloseClick = () => {
    console.log('Se hizo clic en un botón para cerrar el modal.');
    onClose();
  };

  const handleBackdropClick = () => {
    console.log('Se hizo clic en el fondo del modal.');
    onClose();
  };

  const renderStateDetails = (stateObject) => {
    const fieldsToDisplay = Object.entries(stateObject).filter(([key, value]) => {
      return key !== 'id' && key !== 'ine_photo_url' && value !== null && value !== '';
    });

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {fieldsToDisplay.map(([key, value]) => (
                <div key={key}>
                    <span className="font-semibold">{key}: </span>
                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={handleBackdropClick}>
      <div 
        className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-xl transform transition-all" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Historial de Cambios</h2>
          <button onClick={handleCloseClick} className="text-gray-500 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
          {history.length > 0 ? history.map(entry => {
            const previousState = JSON.parse(entry.previous_state);
            return (
              <div key={entry.id} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="font-semibold text-gray-800 mb-2">
                  Cambio realizado el: {' '}
                  <span className="font-normal text-blue-600">
                    {new Date(entry.changed_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'medium' })}
                  </span>
                </p>
                <p className="mt-2 mb-1 font-medium text-gray-700">Valores Anteriores:</p>
                <div className="p-3 text-sm bg-white border rounded">
                   {renderStateDetails(previousState)}
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-gray-500">No hay historial de cambios para esta reservación.</p>
          )}
        </div>
        
        <div className="mt-6 text-right">
          <button onClick={handleCloseClick} className="px-5 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistoryModal;