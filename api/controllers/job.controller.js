const jobService = require('../services/job.service');

exports.createJob = async (req, res) => {
  try {
    const result = await jobService.createJob(req);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    console.error("JOB_UPLOAD_ERROR:", err);
    res.status(500).json({ error: "File processing failed" });
  }
};

exports.getJob = async (req, res) => {
  try {
    const result = await jobService.getJob(req.params.code);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getJobStatus = async (req, res) => {
  try {
    const result = await jobService.getJobStatus(req.params.code);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};
