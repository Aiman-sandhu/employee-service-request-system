const express = require("express");
const {register, login} = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");
const rateLimit = require("express-rate-limit"); 

const router = express.Router();

router.get("/me", authenticate,(req,res)=> res.json(req.user));


router.get("/admin-test", authenticate, authorize("ADMIN"),(req,res)=>{
    res.json({ok:true})
})
router.post("/register", register)


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Too many attempts, try again after 15 minutes" },
});
router.post("/login", loginLimiter, login);

module.exports = router;







