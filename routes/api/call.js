const express = require("express");
const router = express.Router();
const Utility = require("../../helper/utiliy");

const CallObject = require("../../models/ConnectionSchema");

// @type    - POST
// @route   - /api/call/init
// @desc    - to initiate screen share call
// @access  - PUBLIC
router.post("/init", (req, res) => {
  CallObject.findOne({ uname: req.body.uname })
    .then((user) => {
      if (user) {
        res.json({ nameerror: "User name already taken" });
      }

      var guestId = Utility.generateGuestId();

      const newUser = new CallObject({
        uname: req.body.uname,
        guestId: guestId
      });

      newUser
        .save()
        .then((user) => res.json(user))
        .catch((err) => console.log("DB Error : " + err));
    })
    .catch((err) => console.log("Error : " + err));
});

// @type    - DELETE
// @route   - /api/call/{user_id}/end
// @desc    - to end screen share
// @access  - PUBLIC
router.delete("/:userId/end", (req, res) => {
  var user_id = req.params.userId;
  CallObject.findOneAndRemove({ _id: user_id })
    .then((user) => {
      if (!user) {
        return res.end();
      }
      res.json({ success: 1 });
    })
    .catch((err) => console.log("Error : " + err));
});

// @type    - POST
// @route   - /api/call/{user_id}/offer
// @desc    - send offer to other user
// @access  - PUBLIC
router.post("/:userId/offer", (req, res) => {
  var user_id = req.params.userId;
  var { offer, iceCandidate } = req.body;

  var query = { _id: user_id };
  var update = {
    $set: { offer: offer },
    $push: { iceCandidates: iceCandidate }
  };
  var options = { useFindAndModify: false, new: true };

  CallObject.findOneAndUpdate(query, update, options)
    .then((user) => {
      if (!user) {
        return res.status(404).end();
      }
      return res.status(200).end();
    })
    .catch((err) => res.status(500).send(err));
});

// @type    - POST
// @route   - /api/call/{user_id}/answer
// @desc    - send answer to other user
// @access  - PUBLIC
router.post("/:userId/answer", (req, res) => {
  var user_id = req.params.userId;
  var { answer, iceCandidate } = req.body;

  var query = { _id: user_id };
  var update = {
    $set: { answer: answer },
    $push: { guestIceCandidates: iceCandidate }
  };
  var options = { useFindAndModify: false, new: true };

  CallObject.findOneAndUpdate(query, update, options)
    .then((user) => {
      if (!user) {
        return res.status(404).end();
      }
      return res.status(200).end();
    })
    .catch((err) => res.status(500).send(err));
});

// @type    - POST
// @route   - /api/call/{user_id}/icecandidate
// @desc    - send answer to other user
// @access  - PUBLIC
router.post("/:userId/icecandidate", (req, res) => {
  var user_id = req.params.userId;
  var iceCandidate = req.body.iceCandidate;

  var candidates = req.body.isGuest ? { guestIceCandidates: iceCandidate } : { iceCandidates: iceCandidate }
  var query = { _id: user_id };
  var update = { $push: candidates };
  var options = { useFindAndModify: false, new: true };

  CallObject.findOneAndUpdate(query, update, options)
    .then((user) => {
      if (!user) {
        return res.status(404).end();
      }
      return res.status(200).end();
    })
    .catch((err) => res.status(500).send(err));
});

// @type    - POST
// @route   - /api/call/{user_id}/pullanswer
// @desc    - send answer to other user
// @access  - PUBLIC
router.post("/:userId/pullanswer", (req, res) => {
  var user_id = req.params.userId;

  CallObject.findOne({ _id: user_id })
    .then((callObject) => {
      if (!callObject) {
        return res.json({ usernotfound: "Session not found" });
      }
      if (!callObject.answer) {
        return res.status(404).end()
      }

      var sdpCredentials = {
        answer: callObject.answer,
        iceCandidates: callObject.guestIceCandidates
      }
      return res.json(sdpCredentials);
    })
    .catch((err) => console.log("Error : " + err));
});

module.exports = router;
