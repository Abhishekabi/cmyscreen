// This file contains all the basic utility methods for screenshare
var $Util = {};

$Util = {
	isEmpty: function (str) {
		if (!str) {
			return false;
		}
		return str.trim() === "";
	},

	isEmptyObject: function (obj) {
		return jQuery.isEmptyObject(obj)
	},

	getDomainUrl: function () {
		return window.location.origin;
	},

	copyTextToClipboard: function (text, callback) {
		var isCopied;
		if (window.clipboardData && window.clipboardData.setData) {
			// IE specific code path to prevent textarea being shown while dialog is visible.
			isCopied = clipboardData.setData("Text", text); //NO I18N
		}
		else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
			var textarea = document.createElement("textarea");//NO I18N
			textarea.textContent = text;
			document.body.appendChild(textarea);
			textarea.select();
			try {
				isCopied = document.execCommand("copy");  // Security exception may be thrown by some browsers.	//NO I18N
			} catch (ex) {

				isCopied = false;
			}
			document.body.removeChild(textarea);
		}

		if (isCopied) {
			if (typeof callback === "function") {
				callback();
			}
		}
	},
	getTurnCredentials: function () {
		return {
			turnurl: "turn:numb.viagenie.ca",
			credential: "muazkh",
			username: "webrtc@live.com"
		}
	},

	isScreenShareSupportedInNative: function () {
		var _isSupported =
			typeof navigator.mediaDevices !== "undefined" &&
			typeof navigator.mediaDevices.getUserMedia !== "undefined";
		var _isDisplayMediaSupported =
			_isSupported &&
			typeof navigator.mediaDevices.getDisplayMedia !== "undefined";

		return _isDisplayMediaSupported;
	},

	requestScreenStream: function (successCallBack, failureCallBack, stopCallBack, constraints, persist) {
		if ($Util.Browser.isChrome() || $Util.Browser.isSafari() || $Util.Browser.isOpera()) {
			if (this.isScreenShareSupportedInNative()) {
				this._requestStream(3, successCallBack, failureCallBack, $.extend(true, {}, constraints, { video: true }), true, stopCallBack, persist);
			}
		}
		else {
			var definedConstraints = { audio: false, video: { mediaSource: "screen" } };
			this._requestStream(3, successCallBack, failureCallBack, $.extend(true, {}, constraints, definedConstraints), false, stopCallBack, persist);
		}
	},

	_requestStream: function (streamType, successCallBack, failureCallBack, definedConstraints, useDisplayMedia, stopCallBack, persist) {
		var constraints = $.extend(true, {}, { audio: false, video: true }, definedConstraints);
		var invokingMethod = useDisplayMedia ? navigator.mediaDevices.getDisplayMedia : navigator.mediaDevices.getUserMedia;

		invokingMethod.call(navigator.mediaDevices, constraints).then(function (stream) {
			stream._setType(streamType);
			stream._setPersistance(persist);

			if (typeof stopCallBack === "function") {
				var track = stream._getPrimaryVideoTrack();
				if (track) {
					track.onended = stopCallBack;
				}
			}
			successCallBack(stream);
		}).catch(function (error) {
			if (typeof failureCallBack === "function") {
				failureCallBack(error, streamType);
			}
		});
	},

	Browser: {
		CHROME: "chrome",			//NO I18N
		FIREFOX: "firefox",			//NO I18N
		OPERA: "opera",			//NO I18N
		SAFARI: "safari",			//NO I18N
		IE: "ie",			//NO I18N
		EDGE: "edge",			//NO I18N
		name: null,		//Don't use this member directly use getter method.
		getBrowserName: function () {
			if (this.name) {
				return this.name;
			}
			else {
				var vendor = (navigator && navigator.vendor || '').toLowerCase();
				var userAgent = (navigator && navigator.userAgent || '').toLowerCase();
				if ($Regex.Matcher.check("firefox_useragent_lowercase", userAgent)) {
					this.name = this.FIREFOX;
				}
				else if ($Regex.Matcher.check("opera_useragent_lowercase", userAgent)) {
					this.name = this.OPERA;
				}
				else if ($Regex.Matcher.check("edge_useragent_lowercase", userAgent)) {
					this.name = this.EDGE;
				}
				else if ($Regex.Matcher.check("chrome_useragent_lowercase", userAgent)) {
					this.name = this.CHROME;
				}
				else if ($Regex.Matcher.check("ie_useragent_lowercase", userAgent)) {
					this.name = this.IE;
				}
				else if ($Regex.Matcher.check("safari_useragent_lowercase", userAgent)) {
					this.name = this.SAFARI;
				}
				else {
					this.name = "unknown";			//NO I18N
				}
			}
			return this.name;
		},
		isFirefox: function () {
			return (this.getBrowserName() == this.FIREFOX);
		},
		isChrome: function () {
			return (this.getBrowserName() == this.CHROME);
		},
		isOpera: function () {
			return (this.getBrowserName() == this.OPERA);
		},
		isSafari: function () {
			return (this.getBrowserName() == this.SAFARI);
		},
		isEdge: function () {
			return (this.getBrowserName() == this.EDGE);
		}
	},
};


//override MediaStream Object

if (typeof MediaStream !== "undefined") {
	MediaStream.prototype._getSrcUrl = function () {
		var url = window.URL || window.webkitURL;
		return url.createObjectURL(this);
	}

	MediaStream.prototype._setType = function (streamType) {
		this._type = streamType;
	}

	MediaStream.prototype._getType = function () {
		return this._type;
	}

	MediaStream.prototype._setPersistance = function (persist) {
		this._persist = persist;
	}

	MediaStream.prototype._isPersistent = function () {
		return this._persist;
	}

	MediaStream.prototype._getPrimaryAudioTrack = function () {
		//Will return undefined if no audio track is there
		return this.getAudioTracks()[0];
	}

	MediaStream.prototype._getPrimaryVideoTrack = function () {
		//Will return undefined if no video track is there
		return this.getVideoTracks()[0];
	}

	MediaStream.prototype._addPrimaryAudioTrack = function (audioTrack, modifiedStreamType) {
		if (!this._hasAudioTrack() && audioTrack.kind === "audio") {
			this.addTrack(audioTrack);
			this._setType(modifiedStreamType);
		}
	}

	MediaStream.prototype._addPrimaryVideoTrack = function (videoTrack, modifiedStreamType) {
		if (!this._hasVideoTrack() && videoTrack.kind === "video") {
			this.addTrack(videoTrack);
			this._setType(modifiedStreamType);
		}
	}

	MediaStream.prototype._replacePrimaryAudioTrack = function (audioTrack) {
		if (this._hasAudioTrack() && audioTrack.kind === "audio") {
			var track = this._getPrimaryAudioTrack();
			if (track.id !== audioTrack.id) {
				track.stop();
				this.removeTrack(track);
				this.addTrack(audioTrack);
			}
		}
	}

	MediaStream.prototype._replacePrimaryVideoTrack = function (videoTrack) {
		if (this._hasVideoTrack() && videoTrack.kind === "video") {
			var track = this._getPrimaryVideoTrack();
			if (track.id !== videoTrack.id) {
				track.stop();
				this.removeTrack(track);
				this.addTrack(videoTrack);
			}
		}
	}

	MediaStream.prototype._removePrimaryAudioTrack = function () {
		if (this._hasAudioTrack()) {
			var track = this._getPrimaryAudioTrack();
			track.stop();
			this.removeTrack(track);
		}
	}

	MediaStream.prototype._removePrimaryVideoTrack = function () {
		if (this._hasVideoTrack()) {
			var track = this._getPrimaryVideoTrack();
			track.stop();
			this.removeTrack(track);
		}
	}

	MediaStream.prototype._hasAudioTrack = function () {
		var track = this._getPrimaryAudioTrack();
		return track instanceof MediaStreamTrack;
	}

	MediaStream.prototype._hasVideoTrack = function () {
		var track = this._getPrimaryVideoTrack();
		return track instanceof MediaStreamTrack;
	}

	MediaStream.prototype._getAudioDeviceId = function () {
		var track = this._getPrimaryAudioTrack();
		if (track) {
			return track.getSettings().deviceId;
		}
		return null;
	}

	MediaStream.prototype._getVideoDeviceId = function () {
		var track = this._getPrimaryVideoTrack();
		if (track) {
			return track.getSettings().deviceId;
		}
		return null;
	}

	MediaStream.prototype._getAudioDeviceLabel = function () {
		var track = this._getPrimaryAudioTrack();
		if (track) {
			return track.label;
		}
		return null;
	}

	MediaStream.prototype._getVideoDeviceLabel = function () {
		var track = this._getPrimaryVideoTrack();
		if (track) {
			return track.label;
		}
		return null;
	}

	MediaStream.prototype._getVideoSize = function () {
		var track = this._getPrimaryVideoTrack();
		var videoSize = { width: 0, height: 0 };

		if (track) {
			var settings = track.getSettings();

			if (settings.width) {
				videoSize.width = settings.width;
			}

			if (settings.height) {
				videoSize.height = settings.height;
			}
		}
		return videoSize;
	}

	MediaStream.prototype.getAspectRatio = function () {
		var aspectRatio = 0;
		var videoSize = this._getVideoSize();
		if (videoSize.width && videoSize.height) {
			aspectRatio = videoSize.width / videoSize.height;
		}
		return aspectRatio;
	}

	MediaStream.prototype._disableAudioTrack = function () {
		var track = this._getPrimaryAudioTrack();
		if (track) {
			track.enabled = false;
			return true;
		}
		return false;
	}

	MediaStream.prototype._enableAudioTrack = function () {
		var track = this._getPrimaryAudioTrack();
		if (track) {
			track.enabled = true;
			return true;
		}
		return false;
	}

	MediaStream.prototype._disableVideoTrack = function () {
		var track = this._getPrimaryVideoTrack();
		if (track) {
			track.enabled = false;
			return true;
		}
		return false;
	}

	MediaStream.prototype._enableVideoTrack = function () {
		var track = this._getPrimaryVideoTrack();
		if (track) {
			track.enabled = true;
			return true;
		}
		return false;
	}

	MediaStream.prototype._setTrackStatus = function (type, muted) {
		if (type === "audio") {
			this._setAudioTrackStatus(muted);
		}
		else {
			this._setVideoTrackStatus(muted);
		}
	}

	MediaStream.prototype._setAudioTrackStatus = function (muted) {
		if (muted) {
			this._disableAudioTrack();
		}
		else {
			this._enableAudioTrack();
		}
	}

	MediaStream.prototype._setVideoTrackStatus = function (muted) {
		if (muted) {
			this._disableVideoTrack();
		}
		else {
			this._enableVideoTrack();
		}
	}

	MediaStream.prototype._isAudioTrackEnabled = function () {
		var track = this._getPrimaryAudioTrack();
		if (track) {
			return track.enabled;
		}
		return false;
	}

	MediaStream.prototype._isVideoTrackEnabled = function () {
		var track = this._getPrimaryVideoTrack();
		if (track) {
			return track.enabled;
		}
		return false;
	}

	MediaStream.prototype._close = function () {
		var tracks = this.getTracks();
		tracks.forEach(function (track) {
			track.stop();
		});
	}
}


HTMLVideoElement.prototype.getStream = function () {
	var stream = null;

	if (typeof this.srcObject === "object") {
		stream = this.srcObject;
	}

	return stream;
}

HTMLVideoElement.prototype.setStream = function (stream) {
	if (typeof this.srcObject === "object") {
		this.srcObject = stream;
	}
}

HTMLVideoElement.prototype._removeStream = function () {
	this.srcObject = null;
}

HTMLVideoElement.prototype.playStream = function (playCallBack, playErrorCallBack) {
	if (this.getStream()) {
		this.play().then(function () {
			if (typeof playCallBack === "function") {
				playCallBack();
			}
		}).catch(function (error) {
			if (typeof playErrorCallBack === "function") {
				playErrorCallBack(error);
			}
		});
	}
}

HTMLVideoElement.prototype.getAspectRatio = function () {
	var videoWidth = this.videoWidth;
	var videoHeight = this.videoHeight;
	var aspectRatio = 0;
	if (videoWidth && videoHeight) {
		aspectRatio = videoWidth / videoHeight;
	}
	return aspectRatio;
}
