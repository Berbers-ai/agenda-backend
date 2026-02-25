// ─────────────────────────────────────────────────
// db.js — Verbinding met de database + tabellen aanmaken
// ─────────────────────────────────────────────────
// "pg" is de library waarmee Node.js met PostgreSQL praat.
// Pool = een reeks klaarstaande verbindingen (sneller dan
// elke keer opnieuw verbinding maken).
// ─────────────────────────────────────────────────

const { Pool } = require('pg');

// Maak verbinding via de DATABASE_URL uit je .env bestand
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Railway vereist SSL (versleutelde verbinding).
  // rejectUnauthorized: false = vertrouw het certificaat van Railway.
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// ─── Tabellen aanmaken ────────────────────────────
// Deze functie draait één keer bij het opstarten van de server.
// "IF NOT EXISTS" zorgt dat bestaande data niet wordt gewist.

async function createTables() {
  await pool.query(`

    -- Tabel: gebruikers
    -- Slaat naam, e-mail en wachtwoord op (wachtwoord is altijd gehasht).
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,        -- automatisch oplopend getal
      name       TEXT    NOT NULL,          -- volledige naam
      email      TEXT    NOT NULL UNIQUE,   -- e-mail, moet uniek zijn
      password   TEXT    NOT NULL,          -- gehasht wachtwoord (nooit plaintext!)
      created_at TIMESTAMP DEFAULT NOW()   -- wanneer aangemaakt
    );

    -- Tabel: kalenders
    -- Elke gebruiker kan meerdere kalenders hebben (Werk, Privé, etc.)
    CREATE TABLE IF NOT EXISTS calendars (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,          -- bijv. "Werk"
      color      TEXT    NOT NULL DEFAULT '#4F7CFF'
    );

    -- Tabel: events
    -- Elk event hoort bij één kalender (en dus bij één gebruiker).
    CREATE TABLE IF NOT EXISTS events (
      id          SERIAL PRIMARY KEY,
      calendar_id INTEGER REFERENCES calendars(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      date        TEXT    NOT NULL,         -- formaat: "2026-02-25"
      start_time  REAL    NOT NULL,         -- uren als decimaal: 14.5 = 14:30
      end_time    REAL    NOT NULL,
      location    TEXT,                     -- optioneel
      description TEXT,                    -- optioneel
      created_at  TIMESTAMP DEFAULT NOW()
    );

  `);

  console.log('✅ Database tabellen zijn klaar');
}

// Exporteer zodat andere bestanden dit kunnen gebruiken
module.exports = { pool, createTables };
