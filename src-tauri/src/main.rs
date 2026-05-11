// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use tauri::api::notification::Notification;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::Manager;

struct DbState(tokio::sync::Mutex<Connection>);


// --- Modelos ---

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
    ine_photo_url: Option<String>,
    payment_approval_code: Option<String>,
    card_last_digits: Option<String>,
    modified_at: Option<String>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Cancellation {
    id: Option<i64>,
    reservation_id: Option<i64>,
    guest_name: String,
    cancel_date: String,
    reason: String,
    refund_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Income {
    id: Option<i64>,
    fecha: String,
    description: String,
    amount: f64,
    guest_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ReservationReport {
    id: i64,
    name: String,
    total_amount: f64,
    phone: Option<String>,
    checkin_date: String,
    checkout_date: String,
    payment_method: Option<String>,
    payment_approval_code: Option<String>,
    card_last_digits: Option<String>,
    modified_at: Option<String>,
    has_history: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct PaymentTotals {
    efectivo: f64,
    tarjeta: f64,
    transferencia: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct HistoryEntry {
    id: i64,
    changed_at: String,
    previous_state: String,
}

// --- Comandos ---

#[tauri::command]
async fn check_today_checkouts(state: tauri::State<'_, DbState>) -> Result<i64, String> {
    let conn = state.0.lock().await;
    let today_str = Local::now().format("%Y-%m-%d").to_string();

    let count = conn.query_row(
        "SELECT COUNT(*) FROM reservations WHERE checkout_date = ?1 AND status = 'checkedIn'",
        params![today_str],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(count)
}


#[tauri::command]
async fn get_reservations(state: tauri::State<'_, DbState>) -> Result<Vec<Reservation>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn.prepare(
        "SELECT id,name,phone,checkin_date,checkout_date,client_type,room_id,\
         payment_method,total_amount,amount_paid,remaining_amount,status,services,ine_photo_url,\
         payment_approval_code, card_last_digits, modified_at \
         FROM reservations",
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Reservation {
            id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?, checkin_date: row.get(3)?,
            checkout_date: row.get(4)?, client_type: row.get(5)?, room_id: row.get(6)?,
            payment_method: row.get(7)?, total_amount: row.get(8)?, amount_paid: row.get(9)?,
            remaining_amount: row.get(10)?, status: row.get(11)?, services: row.get(12)?,
            ine_photo_url: row.get(13)?, payment_approval_code: row.get(14)?,
            card_last_digits: row.get(15)?, modified_at: row.get(16)?
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_reservation(res: Reservation, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;

    if let (Some(room_id), Some(total_amount)) = (res.room_id, res.total_amount) {
        if total_amount > 0.0 {
            let new_checkin = res.checkin_date.clone();
            let new_checkout = res.checkout_date.clone();
            let overlap_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM reservations WHERE room_id = ?1 AND status != 'cancelada' AND ?2 < checkout_date AND ?3 > checkin_date",
                params![room_id, new_checkin, new_checkout],
                |row| row.get(0)
            ).unwrap_or(0);

            if overlap_count > 0 {
                return Err("Conflicto de fechas: La habitación ya está ocupada en el periodo seleccionado.".to_string());
            }
        }
    }

    conn.execute(
        "INSERT INTO reservations \
         (name,phone,checkin_date,checkout_date,client_type,room_id,\
          payment_method,total_amount,amount_paid,remaining_amount,status,services,ine_photo_url,\
          payment_approval_code, card_last_digits, modified_at) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15, NULL)",
        params![
            res.name, res.phone, res.checkin_date, res.checkout_date, res.client_type,
            res.room_id, res.payment_method, res.total_amount, res.amount_paid,
            res.remaining_amount, res.status, res.services, res.ine_photo_url,
            res.payment_approval_code, res.card_last_digits,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
async fn update_reservation(res: Reservation, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().await;
    let reservation_id = res.id.ok_or("ID de reservación inválido")?;

    if let Some(room_id) = res.room_id {
        let new_checkin = res.checkin_date.clone();
        let new_checkout = res.checkout_date.clone();
        
        let overlap_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM reservations WHERE room_id = ?1 AND id != ?2 AND status != 'cancelada' AND ?3 < checkout_date AND ?4 > checkin_date",
            params![room_id, reservation_id, new_checkin, new_checkout],
            |row| row.get(0)
        ).unwrap_or(0);

        if overlap_count > 0 {
            return Err("Conflicto de fechas: La habitación ya está ocupada en el periodo seleccionado.".to_string());
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let result = (|| {
        let previous_state: Reservation = tx.query_row(
            "SELECT id,name,phone,checkin_date,checkout_date,client_type,room_id,\
             payment_method,total_amount,amount_paid,remaining_amount,status,services,ine_photo_url,\
             payment_approval_code, card_last_digits, modified_at FROM reservations WHERE id = ?1",
            params![reservation_id],
            |row| Ok(Reservation {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                checkin_date: row.get(3)?,
                checkout_date: row.get(4)?,
                client_type: row.get(5)?,
                room_id: row.get(6)?,
                payment_method: row.get(7)?,
                total_amount: row.get(8)?,
                amount_paid: row.get(9)?,
                remaining_amount: row.get(10)?,
                status: row.get(11)?,
                services: row.get(12)?,
                ine_photo_url: row.get(13)?,
                payment_approval_code: row.get(14)?,
                card_last_digits: row.get(15)?,
                modified_at: row.get(16)?
            })
        )?;

        let previous_state_json = serde_json::to_string(&previous_state)
            .map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?;

        tx.execute(
            "INSERT INTO reservation_history (reservation_id, changed_at, previous_state) VALUES (?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?2)",
            params![reservation_id, previous_state_json],
        )?;

        tx.execute(
            "UPDATE reservations SET \
             name = ?1, phone = ?2, checkin_date = ?3, checkout_date = ?4, client_type = ?5, \
             room_id = ?6, payment_method = ?7, total_amount = ?8, amount_paid = ?9, \
             remaining_amount = ?10, status = ?11, services = ?12, ine_photo_url = ?13, \
             payment_approval_code = ?14, card_last_digits = ?15, \
             modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
             WHERE id = ?16",
            params![
                res.name, res.phone, res.checkin_date, res.checkout_date, res.client_type,
                res.room_id, res.payment_method, res.total_amount, res.amount_paid,
                res.remaining_amount, res.status, res.services, res.ine_photo_url,
                res.payment_approval_code, res.card_last_digits, res.id
            ],
        )?;
        
        Ok::<(), rusqlite::Error>(())
    })();

    match result {
        Ok(_) => {
            tx.commit().map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => Err(format!("Error en la transacción: {}", e)),
    }
}

#[tauri::command]
async fn get_reservation_history(reservation_id: i64, state: tauri::State<'_, DbState>) -> Result<Vec<HistoryEntry>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare("SELECT id, changed_at, previous_state FROM reservation_history WHERE reservation_id = ?1 ORDER BY changed_at DESC")
        .map_err(|e| e.to_string())?;

    let history_iter = stmt
        .query_map(params![reservation_id], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                changed_at: row.get(1)?,
                previous_state: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    history_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_reservation_status(
    id: i64,
    status: String,
    state: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().await;

    if status != "cancelada" && status != "checkedOut" {
        let res_to_update: Result<(String, String, Option<i64>), rusqlite::Error> = conn.query_row(
            "SELECT checkin_date, checkout_date, room_id FROM reservations WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        );

        if let Ok((checkin, checkout, Some(room_id))) = res_to_update {
            let overlap_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM reservations WHERE room_id = ?1 AND id != ?2 AND status != 'cancelada' AND ?3 < checkout_date AND ?4 > checkin_date",
                params![room_id, id, checkin, checkout],
                |row| row.get(0),
            ).unwrap_or(0); 

            if overlap_count > 0 {
                return Err("No se puede reactivar esta reservación. Generaría un conflicto de fechas con otra reservación activa.".to_string());
            }
        }
    }

    if status == "checkedOut" {
        let today_str = Local::now().format("%Y-%m-%d").to_string();
        conn.execute(
            "UPDATE reservations SET status = ?1, checkout_date = ?2, modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?3",
            params![status, today_str, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE reservations SET status = ?1, modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2",
            params![status, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}


#[tauri::command]
async fn update_reservation_payment(
    id: i64,
    new_amount_paid: f64,
    new_remaining_amount: f64,
    payment_method: Option<String>,
    approval_code: Option<String>,
    card_digits: Option<String>,
    state: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "UPDATE reservations SET \
         amount_paid = ?1, \
         remaining_amount = ?2, \
         payment_method = COALESCE(?3, payment_method), \
         payment_approval_code = ?4, \
         card_last_digits = ?5, \
         modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') \
         WHERE id = ?6",
        params![
            new_amount_paid,
            new_remaining_amount,
            payment_method,
            approval_code,
            card_digits,
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_reservation(id: i64, user_role: String, state: tauri::State<'_, DbState>) -> Result<(), String> {
    if user_role != "admin" {
        return Err("No tiene permisos para eliminar reservaciones.".to_string());
    }

    let mut conn = state.0.lock().await;
    conn.execute("DELETE FROM reservations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_reservation_services(
    id: i64,
    services: Vec<String>,
    state: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let services_json = serde_json::to_string(&services).map_err(|e| e.to_string())?;
    let mut conn = state.0.lock().await;
    conn.execute(
        "UPDATE reservations SET services = ?1, modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2",
        params![services_json, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_prices(state: tauri::State<'_, DbState>) -> Result<std::collections::HashMap<String, f64>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare("SELECT price_key,price_value FROM prices")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_prices(
    prices: std::collections::HashMap<String, f64>,
    state: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let mut conn = state.0.lock().await;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (k, v) in prices {
        tx.execute(
            "INSERT OR REPLACE INTO prices (price_key,price_value) VALUES (?1,?2)",
            params![k, v],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_daily_report(
    date: String,
    state: tauri::State<'_, DbState>,
) -> Result<Vec<ReservationReport>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.name, r.total_amount, r.phone, r.checkin_date, r.checkout_date, \
             r.payment_method, r.payment_approval_code, r.card_last_digits, r.modified_at, \
             EXISTS(SELECT 1 FROM reservation_history rh WHERE rh.reservation_id = r.id) as has_history \
             FROM reservations r \
             WHERE DATE(r.checkin_date)=?1 AND r.status != 'cancelada' AND (r.status='checkedIn' OR r.status='checkedOut')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |r| {
            Ok(ReservationReport {
                id: r.get(0)?, name: r.get(1)?, total_amount: r.get(2)?, phone: r.get(3)?,
                checkin_date: r.get(4)?, checkout_date: r.get(5)?, payment_method: r.get(6)?,
                payment_approval_code: r.get(7)?, card_last_digits: r.get(8)?, modified_at: r.get(9)?,
                has_history: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_monthly_report(
    month: String,
    state: tauri::State<'_, DbState>,
) -> Result<Vec<ReservationReport>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.name, r.total_amount, r.phone, r.checkin_date, r.checkout_date, \
             r.payment_method, r.payment_approval_code, r.card_last_digits, r.modified_at, \
             EXISTS(SELECT 1 FROM reservation_history rh WHERE rh.reservation_id = r.id) as has_history \
             FROM reservations r \
             WHERE substr(r.checkin_date,1,7)=?1 AND r.status != 'cancelada' AND (r.status='checkedIn' OR r.status='checkedOut')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![month], |r| {
            Ok(ReservationReport {
                id: r.get(0)?, name: r.get(1)?, total_amount: r.get(2)?, phone: r.get(3)?,
                checkin_date: r.get(4)?, checkout_date: r.get(5)?, payment_method: r.get(6)?,
                payment_approval_code: r.get(7)?, card_last_digits: r.get(8)?, modified_at: r.get(9)?,
                has_history: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_weekly_report(
    date: String,
    state: tauri::State<'_, DbState>,
) -> Result<Vec<ReservationReport>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.name, r.total_amount, r.phone, r.checkin_date, r.checkout_date, \
             r.payment_method, r.payment_approval_code, r.card_last_digits, r.modified_at, \
             EXISTS(SELECT 1 FROM reservation_history rh WHERE rh.reservation_id = r.id) as has_history \
             FROM reservations r \
             WHERE strftime('%Y-%W', r.checkin_date) = strftime('%Y-%W', ?1) AND r.status != 'cancelada' AND (r.status='checkedIn' OR r.status='checkedOut')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |r| {
            Ok(ReservationReport {
                id: r.get(0)?, name: r.get(1)?, total_amount: r.get(2)?, phone: r.get(3)?,
                checkin_date: r.get(4)?, checkout_date: r.get(5)?, payment_method: r.get(6)?,
                payment_approval_code: r.get(7)?, card_last_digits: r.get(8)?, modified_at: r.get(9)?,
                has_history: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_daily_totals(date: String, state: tauri::State<'_, DbState>) -> Result<PaymentTotals, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn.prepare(
        "SELECT
            SUM(CASE WHEN payment_method = 'Efectivo' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Tarjeta' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Transferencia' THEN amount_paid ELSE 0 END)
        FROM reservations
        WHERE DATE(checkin_date) = ?1 AND status != 'cancelada' AND (status = 'checkedIn' OR status = 'checkedOut')"
    ).map_err(|e| e.to_string())?;

    let totals = stmt.query_row(params![date], |row| {
        Ok(PaymentTotals {
            efectivo: row.get::<_, f64>(0).unwrap_or(0.0),
            tarjeta: row.get::<_, f64>(1).unwrap_or(0.0),
            transferencia: row.get::<_, f64>(2).unwrap_or(0.0),
        })
    }).map_err(|e| e.to_string())?;

    Ok(totals)
}

#[tauri::command]
async fn get_weekly_totals(date: String, state: tauri::State<'_, DbState>) -> Result<PaymentTotals, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn.prepare(
        "SELECT
            SUM(CASE WHEN payment_method = 'Efectivo' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Tarjeta' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Transferencia' THEN amount_paid ELSE 0 END)
        FROM reservations
        WHERE strftime('%Y-%W', checkin_date) = strftime('%Y-%W', ?1) AND status != 'cancelada' AND (status = 'checkedIn' OR status = 'checkedOut')"
    ).map_err(|e| e.to_string())?;

    let totals = stmt.query_row(params![date], |row| {
        Ok(PaymentTotals {
            efectivo: row.get::<_, f64>(0).unwrap_or(0.0),
            tarjeta: row.get::<_, f64>(1).unwrap_or(0.0),
            transferencia: row.get::<_, f64>(2).unwrap_or(0.0),
        })
    }).map_err(|e| e.to_string())?;

    Ok(totals)
}

#[tauri::command]
async fn get_monthly_totals(month: String, state: tauri::State<'_, DbState>) -> Result<PaymentTotals, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn.prepare(
        "SELECT
            SUM(CASE WHEN payment_method = 'Efectivo' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Tarjeta' THEN amount_paid ELSE 0 END),
            SUM(CASE WHEN payment_method = 'Transferencia' THEN amount_paid ELSE 0 END)
        FROM reservations
        WHERE SUBSTR(checkin_date, 1, 7) = ?1 AND status != 'cancelada' AND (status = 'checkedIn' OR status = 'checkedOut')"
    ).map_err(|e| e.to_string())?;

    let totals = stmt.query_row(params![month], |row| {
        Ok(PaymentTotals {
            efectivo: row.get::<_, f64>(0).unwrap_or(0.0),
            tarjeta: row.get::<_, f64>(1).unwrap_or(0.0),
            transferencia: row.get::<_, f64>(2).unwrap_or(0.0),
        })
    }).map_err(|e| e.to_string())?;

    Ok(totals)
}

#[tauri::command]
async fn get_expenses(date: String, state: tauri::State<'_, DbState>) -> Result<Vec<Expense>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT id,fecha,categoria,descripcion,monto,metodo,proveedor \
             FROM expenses WHERE fecha=?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |r| {
            Ok(Expense {
                id: Some(r.get(0)?), fecha: r.get(1)?, categoria: r.get(2)?,
                descripcion: r.get(3)?, monto: r.get(4)?, metodo: r.get(5)?,
                proveedor: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_expense(e: Expense, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "INSERT INTO expenses (fecha,categoria,descripcion,monto,metodo,proveedor) \
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![
            e.fecha, e.categoria, e.descripcion, e.monto, e.metodo, e.proveedor
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_expense(e: Expense, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "UPDATE expenses SET fecha = ?1, categoria = ?2, descripcion = ?3, monto = ?4, metodo = ?5, proveedor = ?6 WHERE id = ?7",
        params![e.fecha, e.categoria, e.descripcion, e.monto, e.metodo, e.proveedor, e.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_expense(id: i64, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().await;
    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_cancellations(
    date: String,
    state: tauri::State<'_, DbState>,
) -> Result<Vec<Cancellation>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT id,reservation_id,guest_name,cancel_date,reason,refund_amount \
             FROM cancellations WHERE cancel_date=?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |r| {
            Ok(Cancellation {
                id: Some(r.get(0)?), reservation_id: r.get(1)?, guest_name: r.get(2)?,
                cancel_date: r.get(3)?, reason: r.get(4)?, refund_amount: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_cancellation(c: Cancellation, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "INSERT INTO cancellations \
         (reservation_id,guest_name,cancel_date,reason,refund_amount) \
         VALUES (?1,?2,?3,?4,?5)",
        params![
            c.reservation_id, c.guest_name, c.cancel_date, c.reason, c.refund_amount
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_cancellation(c: Cancellation, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "UPDATE cancellations SET reservation_id = ?1, guest_name = ?2, cancel_date = ?3, reason = ?4, refund_amount = ?5 WHERE id = ?6",
        params![c.reservation_id, c.guest_name, c.cancel_date, c.reason, c.refund_amount, c.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_cancellation(id: i64, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().await;
    conn.execute("DELETE FROM cancellations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_incomes(date: String, state: tauri::State<'_, DbState>) -> Result<Vec<Income>, String> {
    let conn = state.0.lock().await;
    let mut stmt = conn
        .prepare(
            "SELECT id,fecha,description,amount,guest_name \
             FROM incomes WHERE fecha=?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |r| {
            Ok(Income {
                id: Some(r.get(0)?), fecha: r.get(1)?, description: r.get(2)?,
                amount: r.get(3)?, guest_name: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_income(i: Income, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "INSERT INTO incomes (fecha,description,amount,guest_name) \
         VALUES (?1,?2,?3,?4)",
        params![i.fecha, i.description, i.amount, i.guest_name],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn update_income(i: Income, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().await;
    conn.execute(
        "UPDATE incomes SET fecha = ?1, description = ?2, amount = ?3, guest_name = ?4 WHERE id = ?5",
        params![i.fecha, i.description, i.amount, i.guest_name, i.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_income(id: i64, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().await;
    conn.execute("DELETE FROM incomes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}


// --- Setup y arranque ---
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path_resolver().app_data_dir().unwrap();
            std::fs::create_dir_all(&dir).ok();
            let db_path = dir.join("hotel_pos_tauri.db");
            let mut conn = Connection::open(&db_path).unwrap();

            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS reservations (
                  id               INTEGER PRIMARY KEY,
                  name             TEXT NOT NULL,
                  phone            TEXT,
                  checkin_date     TEXT NOT NULL,
                  checkout_date    TEXT NOT NULL,
                  client_type      TEXT,
                  room_id          INTEGER,
                  payment_method   TEXT,
                  total_amount     REAL,
                  amount_paid      REAL,
                  remaining_amount REAL,
                  status           TEXT,
                  services         TEXT,
                  ine_photo_url    TEXT
                );
                CREATE TABLE IF NOT EXISTS reservation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reservation_id INTEGER NOT NULL,
                    changed_at TEXT NOT NULL,
                    previous_state TEXT NOT NULL,
                    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS prices (
                  price_key   TEXT PRIMARY KEY,
                  price_value REAL
                );
                CREATE TABLE IF NOT EXISTS expenses (
                  id           INTEGER PRIMARY KEY AUTOINCREMENT,
                  fecha        TEXT,
                  categoria    TEXT,
                  descripcion  TEXT,
                  monto        REAL,
                  metodo       TEXT,
                  proveedor    TEXT
                );
                CREATE TABLE IF NOT EXISTS cancellations (
                  id              INTEGER PRIMARY KEY AUTOINCREMENT,
                  reservation_id  INTEGER,
                  guest_name      TEXT,
                  cancel_date     TEXT,
                  reason          TEXT,
                  refund_amount   REAL
                );
                CREATE TABLE IF NOT EXISTS incomes (
                  id          INTEGER PRIMARY KEY AUTOINCREMENT,
                  fecha       TEXT,
                  description TEXT,
                  amount      REAL,
                  guest_name  TEXT
                );
            ").unwrap();

            let _ = conn.execute("ALTER TABLE reservations ADD COLUMN payment_approval_code TEXT", []);
            let _ = conn.execute("ALTER TABLE reservations ADD COLUMN card_last_digits TEXT", []);
            let _ = conn.execute("ALTER TABLE reservations ADD COLUMN modified_at TEXT", []);
            
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<DbState>();
                match check_today_checkouts(state).await {
                    Ok(count) => {
                        if count > 0 {
                            let _ = Notification::new(&app_handle.config().tauri.bundle.identifier)
                                .title("Aviso de Salidas")
                                .body(format!("Hay {} salida(s) programada(s) para hoy. Abre la sección 'Salidas' para gestionarlas.", count))
                                .show();
                        }
                    },
                    Err(e) => {
                        eprintln!("Error al verificar salidas: {}", e);
                    }
                }
            });

            app.manage(DbState(tokio::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_today_checkouts,
            get_reservations,
            add_reservation,
            update_reservation,
            update_reservation_status,
            update_reservation_payment,
            delete_reservation,
            update_reservation_services,
            get_prices,
            save_prices,
            get_daily_report,
            get_monthly_report,
            get_weekly_report,
            get_expenses,
            save_expense,
            update_expense,
            delete_expense,
            get_cancellations,
            save_cancellation,
            update_cancellation,
            delete_cancellation,
            get_incomes,
            save_income,
            update_income,
            delete_income,
            get_daily_totals,
            get_monthly_totals,
            get_weekly_totals,
            get_reservation_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}