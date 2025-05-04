const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT || 6000;
const MONGO_URL = process.env.MONGO_URL; 

// Middleware
app.use(cors());
app.use(express.json()); // For parsing JSON body

app.use(express.static(path.join(__dirname, "../frontend/views")));
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded body

const homePage = "frontend/views/index.html";
const loginPage = "frontend/views/login.html";
const signupPage = "frontend/views/signup.html"; 
const dashboardPage = "frontend/views/dashboard.html";
 
mongoose
.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("MongoDB Connected"))
.catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1); // Exit the process if MongoDB connection fails
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || "6hrh",  // fallback to "6hrh" if not defined
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 100000000, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" },
  })
);


// MongoDB User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
}); 

const User = mongoose.model("User", userSchema);

// Auth Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect("/login.html");
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(homePage);
});
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Check if the email already exists
  const userByEmail = await User.findOne({ email });
  if (userByEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
  }

  // Check if the username already exists
  const userByUsername = await User.findOne({ username });
  if (userByUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
  }

  // If username and email are unique, continue with registration
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();
  res.status(201).json({ message: 'User registered successfully' });
});
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required." });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Incorrect password." });
  }

  req.session.authenticated = true;
  req.session.user = user;
  res.status(200).json({ success: true, message: "Login successful" });
});


app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/views/dashboard.html"));

});

app.get('/user/profile', isAuthenticated, (req, res) => {
  try {
    const user = req.session.user;
    if (!user) throw new Error("User data not found in session");
    res.status(200).json({ name: user.username });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed." });
  
    res.redirect("/login.html");
  });
});

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
