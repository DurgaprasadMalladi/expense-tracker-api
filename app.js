const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const dbPath = path.join(__dirname, 'expenseTracker.db');

app.use(express.json());

let db = null;

// Initialize the Database and Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      );
    `);
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/');
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// 1. POST /transactions - Add a new transaction
app.post('/transactions', async (req, res) => {
  const { type, category, amount, date, description } = req.body;
  
  // Validate required fields
  if (!type || !category || !amount || !date) {
    return res.status(400).send("All fields (type, category, amount, date) are required.");
  }

  const postQuery = `
    INSERT INTO transactions (type, category, amount, date, description) 
    VALUES (?, ?, ?, ?, ?);
  `;
  
  await db.run(postQuery, [type, category, amount, date, description]);
  res.send('Transaction Successfully Added');
});

// 2. GET /transactions - Retrieve all transactions
app.get('/transactions', async (req, res) => {
  const transactions = await db.all('SELECT * FROM transactions;');
  res.send(transactions);
});

// 3. GET /transactions/:id - Retrieve a transaction by ID
app.get('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const transaction = await db.get(`SELECT * FROM transactions WHERE id = ?;`, [id]);
  
  if (transaction) {
    res.send(transaction);
  } else {
    res.status(404).send('Transaction Not Found');
  }
});

// 4. PUT /transactions/:id - Update a transaction by ID
app.put('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { type, category, amount, date, description } = req.body;

  const updateQuery = `
    UPDATE transactions 
    SET type = ?, category = ?, amount = ?, date = ?, description = ?
    WHERE id = ?;
  `;

  await db.run(updateQuery, [type, category, amount, date, description, id]);
  res.send('Transaction Updated Successfully');
});

// 5. DELETE /transactions/:id - Delete a transaction by ID
app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const deleteQuery = `DELETE FROM transactions WHERE id = ?;`;
  await db.run(deleteQuery, [id]);
  res.send('Transaction Deleted Successfully');
});

app.get('/summary', async (req, res) => {
    try {
      const incomeQuery = `SELECT SUM(amount) AS total_income FROM transactions WHERE type = 'income';`;
      const expenseQuery = `SELECT SUM(amount) AS total_expenses FROM transactions WHERE type = 'expense';`;
  
      const incomeResult = await db.get(incomeQuery);
      const expenseResult = await db.get(expenseQuery);
  
      const totalIncome = incomeResult.total_income || 0;
      const totalExpenses = expenseResult.total_expenses || 0;
      const balance = totalIncome - totalExpenses;
  
      res.send({
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: balance,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  
module.exports = app;  