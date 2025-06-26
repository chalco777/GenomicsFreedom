const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar MySQL:', err);
    return;
  }
  console.log(' Conectado a MySQL en Railway');
});


app.post('/api/secuencias', (req, res) => {
  const { secuencia1, secuencia2 } = req.body;

  const sql = 'INSERT INTO secuencias (secuencia1, secuencia2) VALUES (?, ?)';
  db.query(sql, [secuencia1, secuencia2], (err, result) => {
    if (err) {
      console.error(' Error al insertar:', err);
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true });
    }
  });
});


app.get('/api/secuencias', (req, res) => {
  const sql = 'SELECT * FROM secuencias ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(' Error al obtener secuencias:', err);
      res.status(500).json({ success: false });
    } else {
      res.json(results);
    }
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Backend escuchando en el puerto ${PORT}`));
