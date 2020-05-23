const express = require("express");
const router = express.Router();
const Utility = require("../../helper/utiliy");

const CallObject = require("../../models/ConnectionSchema");

// @type    - GET
// @route   - /api/guest/{guestId}/init
// @desc    - for guest user connection credentials
// @access  - PUBLIC
router.get("/:guestId/init", (req, res) => {
    CallObject.findOne({ guestId: req.params.guestId })
        .then((callObject) => {
            if (!callObject) {
                return res.json({ urlerror: "Guest url not found" });
            }
            if (callObject.hasGuestSession) {
                return res.json({ urlerror: "Already a guest joined this session" });
            }
            callObject.updateOne({ $set: { hasGuestSession: true } }).then(() => {
                res.json(callObject);
            }).catch((err) => console.log("Error : " + err))
        })
        .catch((err) => console.log("Error : " + err));
});

module.exports = router;
