const express = require('express');
const multer = require('multer');
const jobsController = require('../controllers/job.controller');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), jobsController.createJob);

router.get('/:code', jobsController.getJob);
router.get('/:code/status', jobsController.getJobStatus);

module.exports = router;
