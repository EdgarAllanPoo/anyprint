require("dotenv").config();

const express = require('express');
const cors = require('cors');
const session = require("express-session");

const requestLogger = require('./middleware/requestLogger');

const jobsRoutes = require('./routes/job.routes');
const paymentsRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require("./routes/adminAuth.routes");

const app = express();

app.use(cors({
  origin: [/anyprint\.id$/],
  // origin: process.env.FRONTEND_URL,
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

app.use(requestLogger);

app.use('/jobs', jobsRoutes);
app.use('/payments', paymentsRoutes);

app.use('/admin', adminAuthRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
