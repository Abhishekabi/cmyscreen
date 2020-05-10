var $Regex = {};

$Regex.Matcher =
{
    regexes:
    {
        gmail: /^[A-Za-z0-9](\.?[A-Za-z0-9]){5,}@gmail\.com$/,
        facebook: /^[A-Za-z0-9\.]+$/,
        yahoo: /^[A-Za-z0-9]((\.|_)?[A-Za-z0-9]){5,}@(yahoo|ymail|rocketmail)\.com$/,
        msn: /^[A-Za-z0-9-_](\.?[A-Za-z0-9-_]){5,}@(outlook|hotmail|live)\.com$/,
        edge_useragent_lowercase: /edge\/(\d+)/,
        chrome_useragent_lowercase: /(?:chrome|crios)\/(\d+)/,
        firefox_useragent_lowercase: /(?:firefox|fxios)\/(\d+)/,
        opera_useragent_lowercase: /(?:^opera.+?version|opr)\/(\d+)/,
        ie_useragent_lowercase: /(?:msie |trident.+?; rv:)(\d+)/,
        safari_useragent_lowercase: /version\/(\d+).+?safari/,
        emailid: /^[A-Za-z0-9]([A-Za-z0-9-._%+]*)@[A-Za-z0-9-.]+\.[a-zA-Z]{2,6}$/,
        empty: /^\s*$/,
        hexcolourcode: /^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        imagemimetype: /^image\/.+$/,
        audiomimetype: /^audio\/.+$/,
        videomimetype: /^video\/.+$/,
        chrome_useragent: /Chrome[\/\s]/g,
    },
    regexReplaceStr:
    {
        escapeReplacementString: "$$$",
        escaperegexp: "\\$&",
        escaperegexpinid: "\\$1",
        removespaces: "",
        trimBRtag: "",
        containerid: "",
        mail: "<a href='mailto:$1'>$1</a>"
    },
    check: function (key, val, trimvalue) {
        if (trimvalue) {
            val = $.trim(val);
        }
        return this.regexes[key].test(val);
    },
    match: function (key, val) {
        var regex = new RegExp(this.regexes[key].source, "g");		//NO I18N 
        return val.match(regex);
    },
    replacer: function (regex, key, val, replacewith) {
        if (typeof replacewith === "undefined") {
            replacewith = this.regexReplaceStr[key];
        }
        return val.replace(regex, replacewith);
    },
    replace: function (key, val, replacewith) {
        return this.replacer(this.regexes[key], key, val, replacewith);
    },
    replaceWithFlag: function (key, val, flags, replacewith) {
        var regex = new RegExp(this.regexes[key].source, flags);
        return this.replacer(regex, key, val, replacewith)
    },
    getRegexToGetAttrValueInHtmlTag: function (tagname, attrname) {
        return new RegExp("(<(" + tagname + ")[^>]*?\\s" + attrname + "=(\"|'|\\\\\"|\\\\'))(\\S+)((\\3)([^>]*?(?:>(?:[^<]*?<\\/\\2>)?)))");
    },
    getRegexToAddAttrToHtmlTag: function (tagname) {
        return new RegExp("(<(" + tagname + "))([^>]*?(\\s\\S+=\\S+)?>(?:(?:[^<]*?)<\\/\\2>)?)");
    }
}
