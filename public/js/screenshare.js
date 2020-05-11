var screenShareSession = {};
var screenShareImpl = {};
var screenShareAPI = {};
var screenShareHandler = {};
var screenShareConstants = {};

screenShareConstants = {
  screenCaptureInterval: 1000,
  pullAnswerInterval: 2000,
  imageHeight: 768
}

screenShareSession = function (userId, userName, guestUrl) {
  this._userId = userId;
  this._userName = userName;
  this._guestUrl = `/${guestUrl}`;
  this._peerConnection = undefined;
  this._screenContainer = $('#screenHolder');
  this._screenCaptureTimeout = undefined;
  this._screenCanvasElem = undefined;
  this._lastActiveScreenImage = undefined;

  this._isAnswerApplied = false;
  this._pullAnswerTimer = undefined;
  this.initialize();
};

screenShareSession.prototype = {
  initialize: function () {
    var turnCredentials = $Util.getTurnCredentials();
    this._peerConnection = new webRTCPeerConnection(this._userId, screenShareHandler.peerConnectionEvents, turnCredentials, true);
    this._pullAnswerTimer = setInterval(function () {
      screenShareAPI.pullAnswer(this._userId);
    }.bind(this), screenShareConstants.pullAnswerInterval);
  },

  getUserId: function () {
    return this._userId;
  },

  getUserName: function () {
    return this._userName;
  },

  getGuestUrl: function () {
    return $Util.getDomainUrl() + this._guestUrl;
  },

  getScreenContainer: function () {
    return this._screenContainer;
  },

  setScreenContainer: function (screenContainer) {
    this._screenContainer = screenContainer;
  },

  clearPullAnswerTimer: function () {
    clearInterval(this._pullAnswerTimer)
  },

  isAnswerApplied: function () {
    return this._isAnswerApplied
  },

  setCanvasElement: function (stream) {
    var videoSize = stream._getVideoSize();
    var aspectRatio = videoSize.width / videoSize.height;
    this._screenCanvasElem = document.createElement("canvas");
    this._screenCanvasElem.width = aspectRatio * screenShareConstants.imageHeight;
    this._screenCanvasElem.height = screenShareConstants.imageHeight;
  },

  sendScreenAsImage: function () {
    clearTimeout(this._screenCaptureTimeout);

    this._screenCaptureTimeout = setTimeout(function () {
      if (typeof this._peerConnection !== "undefined") {
        this.drawScreenAsPicture();
        this._peerConnection.sendData(this._lastActiveScreenImage, function () {
          this.sendScreenAsImage();
        }.bind(this));
      }
    }.bind(this), screenShareConstants.screenCaptureInterval);
  },

  drawScreenAsPicture: function () {
    this._lastActiveScreenImage = screenShareImpl.drawScreenAsPicture(this._screenCanvasElem, this._screenContainer);
  },

  getScreenAsPicture: function () {
    return this._lastActiveScreenImage;
  },

  setRemoteDescription: function (answer, iceCandidates) {
    this._isAnswerApplied = true;
    this._peerConnection.setRemoteDescription("answer", answer, JSON.parse(iceCandidates.pop()));
    iceCandidates.forEach(function (candidate) {
      candidate = JSON.parse(candidate);
      setTimeout(function () {
        if (typeof this._peerConnection.setRemoteIceCandidate === "function")
          this._peerConnection.setRemoteIceCandidate(candidate);
      }.bind(this), 1000);
    }.bind(this));
  },

  close: function () {
    this._peerConnection.close();
    this._peerConnection = undefined;
  }
};

screenShareAPI = {
  initiate: function (userName) {
    $.ajax({
      url: `/api/call/init`,
      type: "POST",
      dataType: "json",
      data: { uname: userName },
      success: function (resp) {
        screenShareImpl.startCall(resp);
      },
    });
  },

  end: function (connectionId) {
    $.ajax({
      url: `/api/call/${connectionId}/end`,
      type: "DELETE",
      dataType: "json"
    });
  },

  sendOffer: function (connectionId, offer, iceCandidate, isIceRestart) {
    $.ajax({
      url: `/api/call/${connectionId}/offer`,
      type: "POST",
      dataType: "json",
      data: { offer, iceCandidate },
      success: function (resp) { },
    });
  },

  sendAnswer: function (connectionId, answer, iceCandidate, isIceRestart) {
    $.ajax({
      url: `/api/call/${connectionId}/answer`,
      type: "POST",
      dataType: "json",
      data: { answer, iceCandidate },
      success: function (resp) { },
    });
  },

  iceCandidate: function (connectionId, iceCandidate, isIceRestart) {
    $.ajax({
      url: `/api/call/${connectionId}/icecandidate`,
      type: "POST",
      dataType: "json",
      data: { iceCandidate },
      success: function (resp) { },
    });
  },

  pullAnswer: function (connectionId) {
    $.ajax({
      url: `/api/call/${connectionId}/pullanswer`,
      type: "POST",
      dataType: "json",
      success: function (resp) {
        if (resp) {
          var screenShareSession = screenShareImpl.getCurrentSession();
          screenShareSession.clearPullAnswerTimer();
          if (!screenShareSession.isAnswerApplied()) {
            screenShareSession.setRemoteDescription(resp.answer, resp.iceCandidates);
          }
        }
      },
    });
  }
};

screenShareHandler = {

  UIEvents: {
    initiateCall: function (elem) {
      var userName = $('#callername').val();
      if ($Util.isEmpty(userName)) {
        return;
      }
      $('#callername').val("");
      screenShareImpl.initiate(userName);
    },

    copyGuestLink: function (elem) {
      if (!screenShareImpl.hasCurrentSession()) {
        return;
      }
      var guestLink = screenShareImpl.getCurrentSession().getGuestUrl();
      if (!$Util.isEmpty(guestLink)) {
        $Util.copyTextToClipboard(guestLink, function () {
          alert("Copied successfully!");
        });
      }
    },
  },

  peerConnectionEvents: {
    sendOffer: function (connectionId, localSDP, iceCandidate, isIceRestart) {
      screenShareAPI.sendOffer(connectionId, localSDP.sdp, JSON.stringify(iceCandidate), isIceRestart);
    },
    sendAnswer: function (connectionId, localSDP, iceCandidate, isIceRestart) {
      screenShareAPI.sendAnswer(connectionId, localSDP.sdp, JSON.stringify(iceCandidate), isIceRestart);
    },
    updateIceCandidates: function (connectionId, iceCandidate, isIceRestart) {
      screenShareAPI.iceCandidate(connectionId, JSON.stringify(iceCandidate), isIceRestart);
    },
    handleConnected: function (connectionId) {
      console.log("connected");
    },
    handleFailed: function (connectionId) {
      console.log("connection failed")
    },
    handleDataChannelOpen: function () {
      var screenShareSession = screenShareImpl.getCurrentSession();
      var videoElem = screenShareSession.getScreenContainer();
      screenShareImpl.setStreamInContainer(videoElem, function () {
        screenShareSession.setCanvasElement(screenShareImpl.getCurrentStream());
        screenShareSession.sendScreenAsImage();
      }.bind(this));
    },
    handleDataReceived: function (data) {
    }
  }
};

screenShareImpl = {

  _currentSession: undefined,
  _screenStream: undefined,

  bindEvents: function () {
    $(document).on("click", "[screensharebuttons]", function (event) {
      event.stopPropagation();
      var elem = $(this);
      var purpose = elem.attr("purpose");
      screenShareHandler.UIEvents[purpose](elem);
    });
  },

  initiate: function (userName) {
    var screenSuccessCallBack = function (screenStream) {
      screenShareAPI.initiate(userName);
      this._screenStream = screenStream;
    }.bind(this);

    var endCallBack = function () {
      screenShareImpl.endSession();
    }
    if (!this.hasCurrentStream()) {
      $Util.requestScreenStream(screenSuccessCallBack, endCallBack, endCallBack);
    }
  },

  startCall: function (resp) {
    this._currentSession = new screenShareSession(resp._id, resp.uname, resp.guestId);
    var guestUrl = this._currentSession.getGuestUrl();
    $('#guestLinkHolder').val(guestUrl);
  },

  getCurrentSession: function () {
    return this._currentSession;
  },

  hasCurrentSession: function () {
    return !$Util.isEmptyObject(this._currentSession);
  },

  getCurrentStream: function () {
    return this._screenStream;
  },

  hasCurrentStream: function () {
    return !$Util.isEmptyObject(this._screenStream);
  },

  setStreamInContainer: function (videoElem, playSuccessCallBack) {
    if (!this.hasCurrentStream()) {
      return;
    }

    videoElem = videoElem[0];
    videoElem.setStream(this.getCurrentStream());
    videoElem.playStream(function () {
      if (typeof playSuccessCallBack === "function") {
        playSuccessCallBack();
      }
    });
  },

  drawScreenAsPicture: function (canvasElem, videoElem) {
    var context = canvasElem.getContext("2d");

    videoElem = videoElem[0];
    context.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);
    var jpegImgUrl = canvasElem.toDataURL("image/jpeg", 0.5);
    return jpegImgUrl.toString();
  },

  endSession: function () {
    screenShareAPI.end(this._currentSession.getUserId())
    this._currentSession.close();
    this._currentSession = undefined;
    this._screenStream = undefined;
  }
};


// bind UI events
screenShareImpl.bindEvents();