require("dotenv").config();

const express = require('express');
const cors = require('cors');
const session = require("express-session");

const pool = require('./config/db');
const requestLogger = require('./middleware/requestLogger');

const jobsRoutes = require('./routes/job.routes');
const paymentsRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require("./routes/adminAuth.routes");

const app = express();

app.use(cors({
  // origin: [/anyprint\.id$/],
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.set("trust proxy", 1);
app.use(
  session({
    name: "anyprint_admin_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 4,
    },
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);

app.use(express.urlencoded({ extended: false }));

// Above requestLogger so deploy/uptime probes don't fill the logs.
// Touches the DB, so a 200 means "app is up and can reach Postgres".
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: "database unreachable" });
  }
});

app.use(requestLogger);

app.use('/jobs', jobsRoutes);
app.use('/payments', paymentsRoutes);

app.use('/admin', adminAuthRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
