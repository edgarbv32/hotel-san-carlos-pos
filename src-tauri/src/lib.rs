// --- IMPORTACIONES ---
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

// --- ESTRUCTURA PARA COMPARTIR LA BASE DE DATOS ---
struct DbState(Mutex<Connection>);

// --- ESTRUCTURAS DE DATOS (Tus "Modelos") ---
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Reservation {
    id: Option<i64>,
    name: String,
    phone: Option<String>,
    checkin_date: String,
    checkout_date: String,
    client_type: Option<String>,
    room_id: Option<i64>,
    payment_method: Option<String>,
    total_amount: Option<f64>,
    amount_paid: Option<f64>,
    remaining_amount: Option<f64>,
    status: Option<String>,
    services: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Price {
    price_key: String,
    price_value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Expense {
    id: Option<i64>,
    fecha: String,
    categoria: String,
    descripcion: String,
    monto: f64,
    metodo: String,
    proveedor: String,
}

// --- COMANDOS TAURI (La API que tu React puede llamar) ---

#[tauri::command]
fn get_reservations(state: tauri::State<DbState>) -> Result<Vec<Reservation>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, phone, checkin_date, checkout_date, client_type, room_id, payment_method, total_amount, amount_paid, remaining_amount, status, services FROM reservations")
        .map_err(|e| e.to_string())?;
    
    let res_iter = stmt.query_map([], |row| {
        Ok(Reservation {
            id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?,
            checkin_date: row.get(3)?, checkout_date: row.get(4)?,
            client_type: row.get(5)?, room_id: row.get(6)?,
            payment_method: row.get(7)?, total_amount: row.get(8)?,
            amount_paid: row.get(9)?, remaining_amount: row.get(10)?,
            status: row.get(11)?, services: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;

    res_iter.collect::<Result<Vec<Reservation>, rusqlite::Error>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_reservation(res: Reservation, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO reservations (name, phone, checkin_date, checkout_date, client_type, room_id, payment_method, total_amount, amount_paid, remaining_amount, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pendiente')",
        params![res.name, res.phone, res.checkin_date, res.checkout_date, res.client_type, res.room_id, res.payment_method, res.total_amount, res.amount_paid, res.remaining_amount],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_prices(state: tauri::State<DbState>) -> Result<std::collections::HashMap<String, f64>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT price_key, price_value FROM prices").map_err(|e| e.to_string())?;
    let prices_iter = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|e| e.to_string())?;
    prices_iter.collect::<Result<std::collections::HashMap<String, f64>, rusqlite::Error>>().map_err(|e| e.to_string())
}

// ... (Aquí puedes añadir el resto de tus comandos para gastos, etc., siguiendo el mismo patrón)


// --- FUNCIÓN DE ARRANQUE DE LA APLICACIÓN ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Obtenemos la ruta a la carpeta de datos de la aplicación
            let app_data_dir = app.path_resolver().app_data_dir().expect("No se pudo obtener la carpeta de datos de la app");
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("No se pudo crear la carpeta de datos de la app");
            }
            let db_path = app_data_dir.join("hotel_pos_tauri.db");

            // Creamos o abrimos la conexión a la base de datos
            let conn = Connection::open(&db_path).expect("No se pudo conectar a la base de datos");

            // Creamos las tablas si no existen
            conn.execute(
                "CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, checkin_date TEXT NOT NULL, checkout_date TEXT NOT NULL, client_type TEXT, room_id INTEGER, payment_method TEXT, total_amount REAL, amount_paid REAL, remaining_amount REAL, status TEXT DEFAULT 'pendiente', services TEXT, ine_photo_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
                [],
            ).expect("Error creando tabla reservations");
            
            // ... (resto de tus CREATE TABLE)

            // Compartimos la conexión con toda la aplicación
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Registramos todos los comandos para que React los pueda llamar
            get_reservations,
            add_reservation,
            get_prices
            // ...Añade aquí los demás comandos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}