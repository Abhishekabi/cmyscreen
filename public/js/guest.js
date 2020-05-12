var guestSession = {};
var guestSessionImpl = {};
var guestAPI = {};
var guestSessionHandler = {};

guestSession = function (id, name, hostId, hostName, hostOffer, hostIceCandidates) {
    this._id = id;
    this._name = name;
    this._hostId = hostId;
    this._hostName = hostName;

    this._offer = hostOffer;
    this._iceCandidates = hostIceCandidates;

    this._peerConnection = undefined;
    this._screenHolder = undefined;

    this.initialize();
};

guestSession.prototype = {
    initialize: function () {
        var turnCredentials = $Util.getTurnCredentials();
        var iceCandidate = JSON.parse(this._iceCandidates.pop());
        this._peerConnection = new webRTCPeerConnection(this._hostId, guestSessionHandler.peerConnectionEvents, turnCredentials, false, this._offer, iceCandidate);
    },

    updateRemoteCandidates: function () {
      this._iceCandidates.forEach(function (candidate) {
        this._peerConnection._connection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
      }.bind(this));
    },

    getId: function () {
        return this._id;
    },

    getName: function () {
        return this._name;
    },

    getHostId: function () {
        return this._hostId;
    },

    getHostName: function () {
        return this._hostName;
    },

    getScreenHolder: function () {
        return this._screenContainer;
    },

    setScreenHolder: function (screenHolder) {
        this._screenHolder = screenHolder;
    }
};

guestAPI = {
    initiate: function () {
        var guestId = $('#screenHolder').attr('guestId');
        $.ajax({
            url: `/api/guest/${guestId}/init`,
            type: "GET",
            dataType: "json",
            success: function (resp) {
                guestSessionImpl.initiate(resp);
            }
        });
    },

    sendOffer: function (connectionId, offer, iceCandidate, isIceRestart) {
        $.ajax({
            url: `/api/call/${connectionId}/offer`,
            type: "POST",
            dataType: "json",
            data: { offer, iceCandidate, isGuest: true },
        });
    },

    sendAnswer: function (connectionId, answer, iceCandidate, isIceRestart) {
        $.ajax({
            url: `/api/call/${connectionId}/answer`,
            type: "POST",
            dataType: "json",
            data: { answer, iceCandidate, isGuest: true },
        });
    },

    iceCandidate: function (connectionId, iceCandidate, isIceRestart) {
        $.ajax({
            url: `/api/call/${connectionId}/icecandidate`,
            type: "POST",
            dataType: "json",
            data: { iceCandidate, isGuest: true },
        });
    }
};

guestSessionHandler = {

    UIEvents: {
        viewScreen: function (elem) {
            var guestName = $('#guestname').val();
            if (!$Util.isEmpty(guestName)) {
                $('#welcomemodal').removeClass('show');
            }
        }
    },

    peerConnectionEvents: {
        sendOffer: function (connectionId, localSDP, iceCandidate, isIceRestart) {
            guestAPI.sendOffer(connectionId, localSDP.sdp, JSON.stringify(iceCandidate), isIceRestart);
        },
        sendAnswer: function (connectionId, localSDP, iceCandidate, isIceRestart) {
            guestAPI.sendAnswer(connectionId, localSDP.sdp, JSON.stringify(iceCandidate), isIceRestart);
        },
        updateIceCandidates: function (connectionId, iceCandidate, isIceRestart) {
            guestAPI.iceCandidate(connectionId, JSON.stringify(iceCandidate), isIceRestart);
        },
        handleConnected: function (connectionId) {

        },
        handleFailed: function (connectionId) {

        },
        handleDataChannelOpen: function () {

        },
        handleDataReceived: function (data) {
            var screenHolder = $('#imageHolder');
            screenHolder.attr('src', data);
        }
    }
};

guestSessionImpl = {

    _currentSession: undefined,
    _screenStream: undefined,

    bindEvents: function () {
        $(document).on("click", "[screensharebuttons]", function (event) {
            event.stopPropagation();
            var elem = $(this);
            var purpose = elem.attr("purpose");
            guestSessionHandler.UIEvents[purpose](elem);
        });
    },

    initiate: function (resp) {
        this._currentSession = new guestSession(resp.guestId, "guest", resp._id, resp._uname, resp.offer, resp.iceCandidates);
        this._currentSession.updateRemoteCandidates();
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
    }
};


// bind UI events
guestAPI.initiate();
guestSessionImpl.bindEvents();
