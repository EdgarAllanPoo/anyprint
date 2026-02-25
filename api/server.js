require("dotenv").config();

const express = require('express');
const cors = require('cors');

const requestLogger = require('./middleware/requestLogger');

const jobsRoutes = require('./routes/job.routes');
const paymentsRoutes = require('./routes/payment.routes');

const app = express();

app.use(cors({
  origin: [/anyprint\.id$/]
  // origin: process.env.FRONTEND_URL
}));

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

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
