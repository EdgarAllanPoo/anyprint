const express = require("express");
const controller = require("../controllers/adminAuth.controller");

const router = express.Router();

router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.get("/me", controller.me);

module.exports = router;
