const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const exphdl = require("express-handlebars");
const mongoose = require("mongoose");
const favicon = require("express-favicon");

const PORT = process.env.PORT || 3000;

var app = express();

const dbUrl = require("./config/setup").mongoURL;
app.use(favicon(__dirname + "/public/favicon.png"));

// middlewares for handlebars
app.engine("handlebars", exphdl({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//Importing routes
const call = require("./routes/api/call");
const guest = require("./routes/api/guest");

// Middleware for bodyparser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//set static folder
app.use(express.static(path.join(__dirname, "public")));

//using the routes
app.use("/api/call", call);
app.use("/api/guest", guest);

//conecting to db
mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("DB connected successfully");
  })
  .catch((err) => console.log("Error : " + err));

// @type    - GET
// @route   - /
// @desc    - user home page
// @access  - PUBLIC
app.get("/", (req, res) => {
  var user = { isGuest: false };
  res.render("home", { user });
});

const CallObject = require("./models/ConnectionSchema");

// @type    - GET
// @route   - /{guestId}
// @desc    - for new guest
// @access  - PUBLIC
app.get("/:guestId", (req, res) => {
  CallObject.findOne({ guestId: req.params.guestId })
    .then((callObject) => {
      if (!callObject) {
        return res.json({ urlerror: "Guest url not found" });
      }
      if (callObject.hasGuestSession) {
        return res.json({ urlerror: "Already a guest joined this session" });
      }
      var user = { isGuest: true, guestId: req.params.guestId, callerId: callObject._id, callerName: callObject.uname }
      res.render("guest", { user });
    })
    .catch((err) => console.log("Error : " + err));
});

app.listen(PORT, () => console.log(`server started at port ${PORT}`));
