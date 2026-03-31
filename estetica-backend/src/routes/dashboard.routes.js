const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboard.controller");

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

// SOLO ADMIN puede ver dashboard
router.get("/", auth, role(["ADMIN"]), getDashboard);

module.exports = router;