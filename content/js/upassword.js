"use strict";

if (typeof (upassword) === "undefined") {

  var upassword = {
    init : function () {
      upassword.importModules();
    },
    importModules : function () {
      Components.utils.import("resource://upassword/modules/StringBundle.js", upassword);
      Components.utils.import("resource://upassword/modules/Preferences.js", upassword);
      Components.utils.import("resource://upassword/modules/Observers.js", upassword);
      Components.utils.import("resource://upassword/modules/log4moz.js", upassword);

      Components.utils.import("resource://gre/modules/NetUtil.jsm", upassword);
      Components.utils.import("resource://gre/modules/FileUtils.jsm", upassword);
      Components.utils.import("resource://gre/modules/PopupNotifications.jsm", upassword);
    },
    setupLogging: function () {
      var debugLevel = upassword.getPref("extensions.unipass.log.level", 'Warn'),
        logfile = upassword.getPref("extensions.unipass.log.file", ""),
        formatter = new upassword.Log4Moz.BasicFormatter(),
        root = upassword.Log4Moz.repository.rootLogger,
        capp = new upassword.Log4Moz.ConsoleAppender(formatter),
        dapp = new upassword.Log4Moz.DumpAppender(formatter);
      if (root.appenders.length > 0) {
        return;
      }
      root.level = upassword.Log4Moz.Level[debugLevel];

      capp.level = upassword.Log4Moz.Level[debugLevel];
      root.addAppender(capp);

      dapp.level = upassword.Log4Moz.Level[debugLevel];
      root.addAppender(dapp);

      if (logfile !== "") {
        var logFile = upassword.getLocalDirectory();
        logFile.append("log.txt");
        var appender = new upassword.Log4Moz.RotatingFileAppender(logFile, formatter);
        appender.level = upassword.Log4Moz.Level[debugLevel];
        root.addAppender(appender);
      }
      upassword.logger = true;
    },
    getLogger : function (name) {
      if (!upassword.logger) {
        upassword.setupLogging();
      }
      return upassword.Log4Moz.repository.getLogger(name);
    },
    setPref : function (name, value) {
      return upassword.Preferences.set(name, value);
    },
    getPref : function (name, value) {
      return upassword.Preferences.get(name, value);
    },
    getLocalDirectory : function () {
      var directoryService =
        Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties),
        localDir = directoryService.get("ProfD", Components.interfaces.nsIFile);

      localDir.append("upassword");

      if (!localDir.exists() || !localDir.isDirectory()) {
        // read and write permissions to owner and group, read-only for others.
        localDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 484);
      }
      return localDir;
    },
    getRecentWindow : function () {
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
      return wm.getMostRecentWindow("navigator:browser");
    },
    i18n : function (n, arg) {
      var logger = upassword.getLogger('upassword.i18n'),
        i18nStrings = new upassword.StringBundle("chrome://upassword/locale/upassword.properties");
      try {
        return i18nStrings.get(n, arg);
      } catch (e) {
        logger.fatal(n);
        logger.fatal(JSON.stringify(arg));
        logger.fatal(i18nStrings.get(n));
        logger.fatal(e.message);
      }
    },

    r : function (doc, idName, idType, strVal, argVal) {
      if (doc.getElementById(idName)) {
        if (idType === "className") {
          doc.getElementById(idName).className = strVal;
        }
        else {
          idType == "hidden" || idType == "disabled" || idType == "src" || idType == "image" ?
            doc.getElementById(idName).setAttribute(idType, strVal) :
            doc.getElementById(idName).setAttribute(idType, strVal != "" ? upassword.i18n(strVal, argVal) : "");
        }
      }
    },

    serializeObject : function (form){
      var o = {};
      var a = form.serializeArray();
      $.each(a,
        function () {
          if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
              o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
          } else
          o[this.name] = this.value || '';
      });
      return o;
    },
    initForm : function (formData, namespace) {
      namespace = namespace || '';
      for (var k in formData)
        if ($(namespace + " [name='" + k + "']").length > 0)
          if ($(namespace + " [name='" + k + "']")[0]
              && $(namespace + " [name='" + k + "']")[0].nodeName == "SPAN")
              $(namespace + " [name='" + k + "']").text(formData[k]);
          else
          {
            if (typeof formData[k] =='object'
              && $(namespace + " [name='" + k + "']").attr('multiple'))
            {
              for(var i=0, v; v = formData[k][i]; i++)
                $(namespace + " [name='" + k + "'] option[value='"
                + v + "']").attr('selected', true);
            }
            else
              $(namespace + " [name='" + k + "']").val(formData[k]);
          }
    },
    generateUID: function (){
      try{
        var uuidGenerator = Components.classes["@mozilla.org/uuid-generator;1"]
                            .getService(Components.interfaces.nsIUUIDGenerator);
        var uuid = uuidGenerator.generateUUID();
        uuid = uuid.toString();
        return uuid.substring(1,uuid.length-1);
      }catch(e){
        dump(e.message);
      }
    },

    getSetting : function () {
      var setting = upassword.getPref("extensions.unipass.setting", '');
      if (setting == '') {
        setting = {};
        setting.upID = upassword.generateUID();
        setting.expand = '';
        setting.upVersion = '0.1';
        setting.passList = {};
        setting.alias = {};
      }
      else
        setting = JSON.parse(setting);
      return setting;
    },

    saveSetting : function (setting) {
      var result = upassword.validateSetting(setting);
      if (result !== true)
      {
        alert(upassword.i18n('settingFormatError') + result );
        return false;
      }
      setting = upassword.sortObject(setting);
      upassword.setPref("extensions.unipass.setting",JSON.stringify(setting));
    },

    resetSetting : function (){
      upassword.setPref("extensions.unipass.setting", '');
    },
    validateSetting : function (setting) {
      if (!setting['upID'] || typeof(setting['upID']) != 'string' || setting['upID'].length == 0)
        return 'upID';
      if (setting['upVersion'] && typeof(setting['upVersion']) != 'string')
        return 'upVersion';
      if (!setting['passList'] || typeof(setting['passList']) != 'object')
        return 'passList';

      for(var displayName in setting['passList'])
        if (typeof setting['passList'][displayName] != 'object')
          return 'setting.passList.displayName';
        else
        {
          var obj = setting['passList'][displayName];
          if (!obj['defaultAction'] || typeof(obj['defaultAction']) != 'string'
            || obj['defaultAction'].length == 0 || ['copy', 'display', 'copyAndDisplay'].indexOf(obj['defaultAction']) < 0)
            return 'defaultAction';
          if (!obj['upLength'] || typeof(obj['upLength']) != 'number'
            || obj['upLength'] <= 0)
            return 'upLength';
          if (!obj['upType'] || typeof(obj['upType']) != 'number'
            || obj['upType'] > 15 && obj['upType'] < 1)
            return 'upType';
          if (obj['upRevision'] && typeof(obj['upRevision']) != 'number')
            return 'upRevision';
          if (obj['upRule'] && typeof(obj['upRule']) != 'number')
            return 'upRule';
          if (obj['created'] && typeof(obj['created']) != 'number')
            return 'created';
          if (obj['modified'] && typeof(obj['modified']) != 'number')
            return 'modified';
          if (obj['lastVisited'] && typeof(obj['lastVisited']) != 'number')
            return 'lastVisited';
          if (typeof(obj['favorite']) != 'boolean')
            return 'favorite';
        }

      if (setting['alias'] && typeof(setting['alias']) != 'object')
        return 'alias';

      for(var domain in setting['alias'])
        if (!(typeof(setting.alias[domain]) == 'string'  ||
          Object.prototype.toString.call(setting.alias[domain]) == '[object Array]'))
          return 'setting.alias[' + domain + ']';
        else
          if (typeof(setting.alias[domain]) == 'string')
          {
            var dn = setting.alias[domain];
            if (!(dn in setting.passList))
              return 'setting.alias[' + domain + '][' + dn +']';
          }
          else
          {
            for(var i=0, dn; dn = setting.alias[domain][i]; i++)
              if (!(dn in setting.passList))
                return 'setting.alias[' + domain + '][' + dn +']';
          }

      return true;
    },
    sortObject : function (setting) {
      var sorted = {},
      key, arr = [];

      for (key in setting.passList) {
          if (setting.passList.hasOwnProperty(key)) {
                  arr.push(key);
          }
      }

      arr.sort(function (idxA, idxB) {
        var a = setting.passList[idxA];
        var b = setting.passList[idxB];

        if (a.favorite && !b.favorite)
           return -1;
        if (!a.favorite && b.favorite)
           return 1;
        return a.modified - b.modified;
      });

      for (key = 0; key < arr.length; key++) {
          sorted[arr[key]] = setting.passList[arr[key]];
      }
      setting.passList = sorted;

      for (key in setting.alias) {
          if (setting.passList.hasOwnProperty(key)) {
              if (typeof setting.alias[key] != 'string')
                 setting.alias[key].sort(function (dnA, dnB){
                    return arr.indexOf(dnA) - arr.indexOf(dnB);
                 });
          }
      }
      return setting;
    },
    i18nHtml: function (){
      $('[i18n]').each(function (){
        var k = $(this).attr('i18n');
        $(this).text(upassword.i18n(k));
      });
      $('[i18nTarget]').each(function (){
        var c = $(this).attr('i18nTarget');
        var arr = c.split(',');
        if (arr.length == 2)
          $(this).attr(arr[0], upassword.i18n(arr[1]));
      });
    },

    toDateString : function (ts){
      if (!ts || ts == '' )
        return '';
      var dt = new Date(ts);
      return dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    },
    getElapsed : function (ts) {
      var result = "";
      var endTs = new Date().getTime();
      var timeDiff = endTs - ts;
      timeDiff = timeDiff / 1000;
      timeDiff = timeDiff / 60;
      var minutes = Math.round(timeDiff % 60);
      result = minutes + upassword.i18n('minute');
      timeDiff = timeDiff / 60;
      var hours = Math.round(timeDiff % 60);
      if (hours == 0) return result;
      result = hours + upassword.i18n('hour') + result;
      timeDiff = timeDiff / 60;
      var days = Math.round(timeDiff % 24);
      if (days == 0) return result;
      result = days + upassword.i18n('day') + result;
      timeDiff = timeDiff / 24;
      var weeks = Math.round(timeDiff % 7);
      if (weeks == 0) return result;
      result = weeks + upassword.i18n('week') + result;
      return result;
    },
    escapeHtml : function (str){
      return $('<div/>').text(str).html();
    },
    addAlias: function (setting, domainName, displayName) {
      if (!setting || !setting.passList)
        return false;
      if (typeof(setting.passList[displayName]) != 'object')
        return false;

      if (!setting.alias)
        setting.alias = {};

      if (typeof(setting.alias[domainName]) == 'string')
        if (setting.alias[domainName] == displayName)
          return setting;
        else {
          setting.alias[domainName] = [displayName, setting.alias[domainName]];
          return setting;
        }
      if (Object.prototype.toString.call(setting.alias[domainName]) == '[object Array]')
        if (setting.alias[domainName].indexOf(displayName) >= 0 )
          return setting;
        else {
          setting.alias[domainName].push(displayName);
          return setting;
        }
      setting.alias[domainName] = displayName;

      return setting;
    },
    getAlias : function (setting, displayName) {
      if (!setting || !setting.alias)
        return false;
      var result = [];
      for(var domain in setting.alias)
      {
        //alert(typeof setting.alias[domain]);
        if (setting.alias[domain] == displayName || setting.alias[domain].indexOf(displayName) >= 0)
          result.push(domain);
      }
      return result;
    },
    removeAlias: function (setting, domainName, displayName) {
      if (!setting || !setting.alias)
        return false;

      var domains = [];
      if (domainName)
        domains.push(domainName);
      else
        for(var dn in setting.alias)
          domains.push(dn);

      for(var i=0, domain; domain = domains[i]; i++){
        if ( typeof setting.alias[domain] == 'string') {
          if (setting.alias[domain] == displayName)
            delete setting.alias[domain];
        }
        else
        {
          if (setting.alias[domain].indexOf(displayName) >=0)
            setting.alias[domain] = setting.alias[domain].slice(0,setting.alias[domain].indexOf(displayName)).concat(setting.alias[domain].slice(setting.alias[domain].indexOf(displayName)+1, setting.alias[domain].length));


          if (setting.alias[domain].length == 0)
            delete setting.alias[domain];
          else
            if (setting.alias[domain].length == 1)
              setting.alias[domain] = setting.alias[domain][0];
        }
      }
      return setting;
    },
    removeItemFromArray: function (array, from, to) {
      var rest = array.slice((to || from) + 1 || array.length);
      array.length = from < 0 ? array.length + from : from;
      return array.push.apply(array, rest);
    },
    copyToClipBoard: function (str){
      const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
      getService(Components.interfaces.nsIClipboardHelper);
      gClipboardHelper.copyString(str);
    },
    generatePassword : function (displayName){
      var logger = upassword.getLogger('upassword.generatePassword');
      var setting = this.getSetting();

      if (!upassword.password)
        return false;
      if (typeof setting.passList[displayName] == 'undefined')
        return false;

      var upType = setting.passList[displayName].upType;
      logger.info(upType);
      var upLength = setting.passList[displayName].upLength;
      logger.info(upLength);
      var upRevision = setting.passList[displayName].upRevision || 0;
      logger.info(upRevision);
      var pg = new passGen();
      var hash = pg.getHashFromString(upassword.password);
      logger.info(hash);
      var upHash = pg.prepareHashString(hash, displayName, upRevision);
      logger.info(upHash);
      return pg.getPasswordFromString(upType, upLength);
    }
  };
}
