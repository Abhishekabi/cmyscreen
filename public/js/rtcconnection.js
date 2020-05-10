var WebRTCPeerConnectionConstants = {
  iceConnectionStates: {
    CONNECTED: "connected",
    FAILED: "failed",
    DISCONNECTED: "disconnected",
  },
};

var webRTCPeerConnection = function (connectionId, handler, turnCredentials, isOfferer, remoteSDP, remoteIcecandidate) {
  this._connectionId = connectionId;
  this._handler = handler;

  this._turnCredentials = turnCredentials;

  this._rtpSenders = [];
  this._remoteSDP = remoteSDP;
  this._localSDP = undefined;
  this._remoteIcecandidate = remoteIcecandidate ? remoteIcecandidate : undefined;

  this._isOfferer = isOfferer;
  this._dataChannel = undefined;
  this._isIceRestart = false;

  this._initialize();
}

webRTCPeerConnection.prototype =
{
  _initialize: function () {
    if (!this._connection) {
      this._connection = new RTCPeerConnection(this._getConfiguration());
    }

    this._bindEventHandlers();

    if (this._isOfferer) {
      this._createDataChannel();
      this._createOffer();
    }
    else {
      this._createAnswer();
      this.addRemoteIceCandidate();
    }
  },

  _bindEventHandlers: function () {
    //To send the offer/answer in the first ice candidate
    var hasSentSdp = false;
    var peerConnection = this._connection;

    //event - RTCPeerConnectionIceEvent
    var onIceCandidateCallBack = function (event) {
      //RTCIceCandidate
      var iceCandidate = event.candidate;

      if (iceCandidate) {
        if (!hasSentSdp) {
          if (this._isOfferer) {
            this._handler.sendOffer(this._connectionId, this._localSDP, iceCandidate, this._isIceRestart);
          }
          else {
            this._handler.sendAnswer(this._connectionId, this._localSDP, iceCandidate, this._isIceRestart);
          }
          hasSentSdp = true;
        }
        else {
          this._handler.updateIceCandidates(this._connectionId, iceCandidate, this._isIceRestart);
        }
      }

    }.bind(this);

    var onIceConnectionStateChangeCallBack = function (event) {
      var state = peerConnection.iceConnectionState;

      if (WebRTCPeerConnectionConstants.iceConnectionStates.CONNECTED == state) {
        this._handler.handleConnected(this._connectionId);
      }
      else if (WebRTCPeerConnectionConstants.iceConnectionStates.FAILED == state) {
        this._handler.handleFailed(this._connectionId);
      }
    }.bind(this);

		/*
		 * Temporary fix to resolve chrome (M75) issue.
		 * Connected event not received in oniceconnectionstatechange in reconnect
		 * Failed event not received in oniceconnectionstatechange for connection failure after the first reconnection success
		 */
    var onConnectionStateChangeCallBack = function (event) {
      var state = peerConnection.iceConnectionState;

      if (WebRTCPeerConnectionConstants.iceConnectionStates.CONNECTED == state) {
        this._handler.handleConnected(this._connectionId);
      }
      else if (WebRTCPeerConnectionConstants.iceConnectionStates.FAILED == state) {
        this._handler.handleFailed(this._connectionId);
      }
    }.bind(this);

    peerConnection.onicecandidate = onIceCandidateCallBack;
    peerConnection.oniceconnectionstatechange = onIceConnectionStateChangeCallBack;
    peerConnection.onconnectionstatechange = onConnectionStateChangeCallBack;
    if (!this.isOfferer) {
      peerConnection.ondatachannel = function (event) {
        this._createDataChannel(event.channel);
      }.bind(this);
    }
  },

  _createOffer: function () {
    var sdpConstraints = {};

    if (this._isIceRestart) {
      sdpConstraints.iceRestart = true;
    }

    var peerConnection = this._connection;
    var that = this;

    peerConnection.createOffer(sdpConstraints).then(function (offer) {
      that._localSDP = offer;
      peerConnection.setLocalDescription(offer);
    });
  },

  _createAnswer: function () {
    var sdpConstraints = {};
    var peerConnection = this._connection;
    var that = this;

    peerConnection.setRemoteDescription(this._getRTCSessionDescriptionObj("offer", this._remoteSDP)).then(function () {		//NO I18N
      peerConnection.createAnswer(sdpConstraints).then(function (answer) {
        that._localSDP = answer;
        peerConnection.setLocalDescription(answer);
      });
    });
  },

  setRemoteDescription: function (type, remoteSdp, remoteIceCandidate) {
    if (typeof remoteIceCandidate != "undefined") {
      this._remoteIcecandidate = remoteIceCandidate;
    }

    var that = this;
    this._connection.setRemoteDescription(this._getRTCSessionDescriptionObj(type, remoteSdp)).then(function () {
      that.addRemoteIceCandidate();
    });
  },

  setRemoteIcecandidate: function (remoteIcecandidate) {
    this._remoteIcecandidate = remoteIcecandidate;
    this.addRemoteIceCandidate();
  },

  addRemoteIceCandidate: function () {
    var peerConnection = this._connection;
    peerConnection.addIceCandidate(new RTCIceCandidate(this._remoteIcecandidate));
  },

  _getRTCSessionDescriptionObj: function (type, remoteSdp) {
    return new RTCSessionDescription({ type: type, sdp: remoteSdp });
  },

  close: function () {
    if (this._connection) {
      this._connection.close();
      this._connection = undefined;
    }

    if (this._dataChannel) {
      this._dataChannel.close();
      this._dataChannel = undefined;
    }
    this._remoteSDP = undefined;
    this._localSDP = undefined;
  },

  _getConfiguration: function () {

    var iceServers = [{
      urls: this._turnCredentials.turnurl,
      username: this._turnCredentials.username,
      credential: this._turnCredentials.credential
    }];

    return { iceServers: iceServers };
  },

  _createDataChannel: function (channel) {
    if (this._dataChannel) {
      this._dataChannel.close();
      this._dataChannel = undefined;
    }
    if (this._isOfferer) {
      this._dataChannel = this._connection.createDataChannel("sendChannel");
      this._dataChannel.binaryType = "arraybuffer";

      // dataChannel events
      this._dataChannel.onopen = function () {
        this._isIceRestart = false;
        this._handler.handleDataChannelOpen();
      }.bind(this);
    }
    else {
      this._dataChannel = channel;
      this._dataChannel.binaryType = 'arraybuffer'; //NO I18N
      this._dataChannel.onmessage = function (event) {
        this._isIceRestart = false;
        this._handler.handleDataReceived(event.data);
      }.bind(this);
    }
  },

  sendData: function (data, successCallback) {
    var sendChannel = this._dataChannel;
    // buffer amount must not exceed more than 15 Mb, because datachannel closes when buffer overflows.
    if (data && typeof sendChannel !== 'undefined' && sendChannel.readyState == "open") {
      sendChannel.send(data);
      successCallback();
    }
  }
}
