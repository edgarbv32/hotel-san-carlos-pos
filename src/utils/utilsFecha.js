// Devuelve el identificador del mes actual en formato AAAA_MM
export function obtenerMesClave() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  return `${año}_${mes}`;
}

// Devuelve el nombre de la clave para el tipo de dato y mes actual
export function claveLocal(tipo) {
  return `registro_${obtenerMesClave()}_${tipo}`;
}