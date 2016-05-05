"use strict";

upassword.overlay = {
  init : function() {
    upassword.init();
    upassword.overlay.firstRun();
    upassword.overlay.overlayInit();
  },
  firstRun : function() {
    var firstRunPref = "extensions.unipass.firstRunDone";
    if(!upassword.getPref(firstRunPref, false))
    {
      var navbar = document.getElementById("nav-bar");
      var newset = navbar.currentSet + ',upassword-navbar-button';
      navbar.currentSet = newset;
      navbar.setAttribute("currentset", newset );
      document.persist("nav-bar", "currentset");
      upassword.setPref(firstRunPref, true);
    }
  },
  overlayInit: function(){
    upassword.r(document, "upassword-navbar-button", "label", "uPasswordLabel");
    upassword.r(document, "upassword-navbar-button", "tooltiptext", "uPasswordLabel");
    upassword.r(document, "upassword-bar-export", "label", "exportJSON");
    upassword.r(document, "upassword-bar-import", "label", "importJSON");
    upassword.r(document, "upassword-bar-logoff", "label", "logoff");
    upassword.r(document, "upassword-bar-management", "label", "managePassword");
    upassword.r(document, "upassword-bar-newPassword", "label", "newPasswordForWebSite");
  },
  disable: function(el, disabled){
    if(disabled)
      document.getElementById(el).setAttribute('disabled', true);
    else
      document.getElementById(el).removeAttribute('disabled');
  },
  doLocationChange : function(aURI){
    var logger = upassword.getLogger('upassword.overlay.doLocationChange');
    
    logger.info("typeof aURI:" + typeof aURI);
    logger.info("aURI:" + aURI.asciiHost);
    logger.info("domain:" + gBrowser.contentDocument.domain);
    this.aURI = aURI || this.aURI;
    logger.info("this.aURI:" + this.aURI.asciiHost);
    
    var hostName = this.aURI.asciiHost;
    var scheme = this.aURI.scheme;
    var menu = document.getElementById('upassword-compact-menu');
    var deletes = [];
    try{
      var num = menu.childNodes.length;
      for(var i=0; i < num; i++){
        item = menu.childNodes[i];
        //alert(item.getAttribute("label") + item.getAttribute("remove"))
        if(item.getAttribute("remove") =='1'){
          if(item.hasChildNodes()){
            var len = item.childNodes.length;
            for(var j=0; j < len; j++)
              item.removeChild(item.childNodes[j]);
          }
          deletes.push(item);
        }
      }
      for(var i=0, item; item = deletes[i]; i++)
        menu.removeChild(item);
      
      
      if(hostName && ['http','https','ftp','ftps'].indexOf(scheme) >= 0){
        var setting = upassword.getSetting();
        if(setting.alias && setting.alias[hostName])
        {
          if(typeof setting.alias[hostName] == 'string')
            upassword.overlay.addSingleMenuItem(menu, hostName);
          else
            upassword.overlay.addMultipleMenuItem(menu, hostName);
        }
        upassword.overlay.disable('upassword-bar-newPassword', false);
      }
      else
        upassword.overlay.disable('upassword-bar-newPassword', true);
      
      upassword.overlay.updateContextMenu(hostName);
    }catch(e){};
  },
  doPasswordCreated: function(){
    upassword.overlay.doLocationChange(false);
  },
  updateContextMenu : function(hostName){
    var cm = document.getElementById("contentAreaContextMenu");
    var num = cm.childNodes.length;
    for(var i=0; i < num; i++){
      item = cm.childNodes[i];
      //alert(item.getAttribute("label") + item.getAttribute("remove"))
      if(item.getAttribute("remove") =='1'){
        if(item.hasChildNodes()){
          var len = item.childNodes.length;
          for(var j=0; j < len; j++)
            item.removeChild(item.childNodes[j]);
        }
        cm.removeChild(item);
      }
    }
    if(!upassword.password) 
      return false;
    var setting = upassword.getSetting();
    var displayName = setting.alias[hostName];
    if(!displayName) return false;
    var menu = document.createElement('menu');
    menu.setAttribute('id', upassword.generateUID());
    menu.setAttribute('image','chrome://upassword/content/images/icon16.png');
    menu.setAttribute('remove', '1');
    menu.setAttribute('class', 'menu-iconic');
    menu.setAttribute('label', upassword.i18n('upasswordAutoFill'));
    menu.setAttribute('insertafter', "context-cut");
    cm.appendChild(menu);
    var dpMenu = document.createElement('menupopup');
    menu.appendChild(dpMenu);
    if(typeof displayName == 'string')
      displayName = [displayName];
    for(var i=0, dn; dn = displayName[i]; i++)
    {
      var item = document.createElement('menuitem');
      item.setAttribute('label', dn);
      item.setAttribute('dn', dn);
      item.onclick = function (event) { upassword.overlay.fillInPassword(this.getAttribute('dn')); event.stopPropagation(); return false;}; 
      dpMenu.appendChild(item);
    }
  },
  addSingleMenuItem: function(menu, hostName){
    var setting = upassword.getSetting();
    var displayName = setting.alias[hostName];
    var item = document.createElement('menuseparator');
    item.setAttribute('remove', '1');
    menu.insertBefore(item, menu.firstChild);
    
    var item = document.createElement('menuitem');
    item.setAttribute('id', 'upassword-menuitem-copyPassword');
    item.setAttribute('label', upassword.i18n('copyPassword'));
    item.setAttribute('dn', displayName);
    item.onclick = function (event) { upassword.overlay.doCopyPassword(this.getAttribute('dn'));}; 
    item.setAttribute('class', 'menuitem-iconic');
    item.setAttribute('src','chrome://upassword/content/images/copy.gif');
    item.setAttribute('remove', '1');
    menu.insertBefore(item, menu.firstChild);
    
    item = document.createElement('menuitem');
    item.setAttribute('id', 'upassword-menuitem-displayPassword');
    item.setAttribute('label', upassword.i18n('displayPassword'));
    item.setAttribute('dn', displayName);
    item.onclick = function (event) { upassword.overlay.doDisplayPassword(this.getAttribute('dn'));};
    item.setAttribute('class', 'menuitem-iconic');
    item.setAttribute('src','chrome://upassword/content/images/display.gif');
    item.setAttribute('remove', '1');
    menu.insertBefore(item, menu.firstChild);
  },
  addMultipleMenuItem : function(menu, hostName){
    var logger = upassword.getLogger('upassword.overlay.addMultipleMenuItem');
    logger.trace(hostName);
    var setting = upassword.getSetting();
    logger.trace(setting);
    var item = document.createElement('menuseparator');
    item.setAttribute('remove', '1');
    menu.insertBefore(item, menu.firstChild);
    logger.trace('add menu separator');
    
    item = document.createElement('menu');
    item.setAttribute('id', upassword.generateUID());
    item.setAttribute('image','chrome://upassword/content/images/copy.gif');
    item.setAttribute('remove', '1');
    item.setAttribute('class', 'menu-iconic');
    item.setAttribute('label', upassword.i18n('copyPassword'));
    menu.insertBefore(item, menu.firstChild);
    var copyMenu = document.createElement('menupopup');
    item.appendChild(copyMenu);
    logger.trace('add menu copy');
    
    item = document.createElement('menu');
    item.setAttribute('id', upassword.generateUID());
    item.setAttribute('image','chrome://upassword/content/images/display.gif');
    item.setAttribute('remove', '1');
    item.setAttribute('class', 'menu-iconic');
    item.setAttribute('label', upassword.i18n('displayPassword'));
    menu.insertBefore(item,menu.firstChild);
    var dispMenu = document.createElement('menupopup');
    item.appendChild(dispMenu);
    logger.trace('add menu display');
    
    logger.trace(typeof setting.alias);
    var displayNames = setting.alias[hostName].reverse();
    for(var i=0, displayName; displayName = displayNames[i]; i++)
    {
      logger.debug(displayName);
      var item = document.createElement('menuitem');
      item.setAttribute('label', displayName);
      item.setAttribute('dn', displayName);
      item.onclick = function (event) { upassword.overlay.doCopyPassword(this.getAttribute('dn')); }; 
      if(setting.passList[displayName].favorite)
      {
        item.setAttribute('class', 'menuitem-iconic');
        item.setAttribute('src','chrome://upassword/content/images/star16.png');
      }
      copyMenu.insertBefore(item,copyMenu.firstChild);

      var item = document.createElement('menuitem');
      item.setAttribute('label', displayName);
      item.setAttribute('dn', displayName);
      item.onclick = function (event) { upassword.overlay.doDisplayPassword(this.getAttribute('dn'));}; 
      if(setting.passList[displayName].favorite)
      {
        item.setAttribute('class', 'menuitem-iconic');
        item.setAttribute('src','chrome://upassword/content/images/star16.png');
      }
      dispMenu.insertBefore(item,dispMenu.firstChild);
    }
  },
  menuPopUp : function(doc) {
    if(upassword.password){
      return true; 
    }
    else{
      upassword.overlay.login(doc);
      return false;
    }
  },
  logoff : function(doc) {
    upassword.password = false;
    doc.getElementById('upassword-navbar-button').image = "chrome://upassword/content/images/icon16_grey.png";
    upassword.overlay.updateContextMenu(false);
    return false;
  },
  buttonClick : function(event) {
    var logger = upassword.getLogger('upassword.overlay.buttonClick');
    logger.debug('clicked');
    logger.debug(event.bubbles);
    logger.debug(event.type);
    logger.debug(event.eventPhase);
    if(event.eventPhase > 2) return false;
    if(!upassword.password) {
      upassword.overlay.login(function(){ upassword.overlay.buttonActionRoute(); });
      return false;
    }
    else
      upassword.overlay.buttonActionRoute();
  },
  buttonActionRoute: function(){
    var logger = upassword.getLogger('upassword.overlay.buttonActionRoute');
    if(this.aURI.asciiHost && ['http','https','ftp','ftps'].indexOf(this.aURI.scheme) >= 0){
      var setting = upassword.getSetting();
      logger.info(setting.alias);
      logger.info(this.aURI.asciiHost);
      logger.info(setting.alias[this.aURI.asciiHost] == undefined);
      if(setting.alias[this.aURI.asciiHost] == undefined)
        upassword.overlay.newConfiguration();
      else
      {
        var displayName = typeof setting.alias[this.aURI.asciiHost] == 'string' ? setting.alias[this.aURI.asciiHost] : setting.alias[this.aURI.asciiHost][0];
        upassword.Observers.notify("upassword.overlay.doDefaultAction", displayName);
      }
    }
    else
      upassword.overlay.manageSetting();
  },
  login : function(callback) {
    var win = upassword.getRecentWindow();
    var arg = {parentDocument: document};
    win.openDialog("chrome://upassword/content/login.xul", "_blank", "width=280,height=220,resizable,chrome,titlebar,toolbar,centerscreen,modal", arg);
    if(arg.password){
      upassword.password = arg.password;
      if(typeof callback == "function")
        callback();
      upassword.overlay.doLocationChange(false);
    }
  },
  newConfiguration : function(doc) {
    if(this.aURI.asciiHost && ['http','https','ftp','ftps'].indexOf(this.aURI.scheme) >= 0){
      var win = upassword.getRecentWindow();
      var arg = {domain: this.aURI.asciiHost};
      win.openDialog("chrome://upassword/content/edit.html", "_blank", "width=600,height=415,resizable,chrome,centerscreen,modal,scrollbars=no,status=no", arg);
    }
  },
  doExportJSON : function() {
    var setting = upassword.getSetting();
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, upassword.i18n("selectExportDirectory"), nsIFilePicker.modeSave);
    fp.appendFilter("JSON","*.json");
    var res = fp.show();
    if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
      var ostream = upassword.FileUtils.openSafeFileOutputStream(fp.file);

      var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      converter.charset = "UTF-8";
      var istream = converter.convertToInputStream(JSON.stringify(setting));

      upassword.NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!Components.isSuccessCode(status)) {
          alert('cannotExportJSONError');
          return;
        }
      });
    }
    return false;
  },
  doImportJSON : function() {
    var logger = upassword.getLogger('upassword.overlay.doImportJSON');
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, upassword.i18n("selectImportDirectory"), nsIFilePicker.modeOpen);
    fp.appendFilter("JSON","*.json");
    var res = fp.show();
    if (res == nsIFilePicker.returnOK) {

      upassword.NetUtil.asyncFetch(fp.file, function(inputStream, status) {
        if (!Components.isSuccessCode(status)) {
          alert(upassword.i18n('cannotImportJSONError'));
          return;
        }
        
        var data = upassword.NetUtil.readInputStreamToString(inputStream, inputStream.available());
        
        var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].  
            getService(Components.interfaces.nsIUTF8ConverterService);
        var setting = utf8Converter.convertURISpecToUTF8(data, "UTF-8");
        try{
          if(setting == '') {
            alert(upassword.i18n('settingFormatError'));
            return;
          }
          setting = JSON.parse(setting);
          upassword.saveSetting(setting);
        }catch(e){ alert(upassword.i18n('cannotImportJSONError')); }
        logger.debug(setting);
      });
    }
    return false;
  },
  manageSetting : function() {
    gBrowser.selectedTab = gBrowser.addTab('chrome://upassword/content/index.html');
  },
  
  doShowNotification : function(displayName){
    var info = upassword.i18n("newRuleAddedInfo", [displayName]);
    var setting = upassword.getSetting();
    
    PopupNotifications.show(gBrowser.selectedBrowser, "upassword-popup",
      info,
      null,
      {
        label: upassword.i18n(defaultAction +"Password"),
        accessKey: "C",
        callback: function() {
          upassword.Observers.notify("upassword.overlay.doDefaultAction", displayName);
        }
      },
      null
    );
  },
  doShowPasswordCopied : function(password){
    var logger = upassword.getLogger('upassword.overlay.doShowPasswordCopied');
    logger.debug(password);
    var star = password.substr(0,1);
    
    for(var i=1; i < password.length; i++)
      star += '*';
    
    var info = upassword.i18n('passwordCopiedInfoNoHtml', [star]);
    
    PopupNotifications.show(gBrowser.selectedBrowser, "upassword-popup",
      info,
      null,
      null,
      null
    );
  },
  doDefaultAction: function(displayName){
    var setting = upassword.getSetting();
    var defaultAction = setting.passList[displayName].defaultAction;
    if(defaultAction.indexOf('copy') >= 0){
      if(defaultAction == 'copyAndDisplay')
        upassword.Observers.notify("upassword.overlay.doCopyPassword", {"displayName" : displayName});
      else
        upassword.Observers.notify("upassword.overlay.doCopyPassword", displayName);
    }
    if(defaultAction.indexOf('isplay') >= 0){
      upassword.Observers.notify("upassword.overlay.doDisplayPassword", displayName);
    }
  },
  doCopyPassword : function(param){
    var showInfo = true, displayName;
    if(typeof param == 'object'){
      displayName = param.displayName;
      showInfo = false;
    }
    else
      displayName = param;
      
    if(displayName){
      var password = upassword.generatePassword(displayName);
      upassword.copyToClipBoard(password);
      if(showInfo)
        upassword.Observers.notify("upassword.overlay.doShowPasswordCopied", password);
    }
    else
      alert(upassword.i18n('noPasswordDefinedError'));
  },
  doDisplayPassword : function(displayName){
    if(displayName) {
      var password = upassword.generatePassword(displayName);
      var message = upassword.i18n('yourPasswordIs') + password;
      var nb = gBrowser.getNotificationBox();
      var n = nb.getNotificationWithValue('popup-display-password');
      if(n) {
          n.label = message;
      } else {
          var buttons = [{
              //id : 'NotificationCopyPassword',
              label: upassword.i18n('copyPassword'),
              accessKey: 'c',
              callback: function(){
                //var logger = upassword.getLogger('upassword.overlay.doDisplayPassword.button.callback');
                //logger.debug('click');
                //logger.debug(typeof document.getElementById('NotificationCopyPassword').nodeName);
                //logger.debug(document.getElementById('NotificationCopyPassword').getAttribute('label'));
                
                upassword.Observers.notify("upassword.overlay.doCopyPassword", displayName);
              }
          }];
          nb.removeAllNotifications( true );
          const priority = nb.PRIORITY_CRITICAL_HIGH;
          nb.appendNotification(message, 'popup-display-password',
                               'chrome://upassword/content/images/icon16.png',
                                priority, buttons);
      }
    }
    else
      alert('noPasswordDefinedError');
    
  },
  fillInPassword : function(displayName){
    var logger = upassword.getLogger('upassword.overlay.fillInPassword');
    var el = gBrowser.contentDocument.activeElement;
    var password = upassword.generatePassword(displayName);
    logger.debug(password);
    logger.debug(el.nodeName);
    
    //alert(el.nodeName + displayName);
    if(el.nodeName == 'INPUT')
      el.value = password;
    else
      alert(upassword.i18n('pleasePutMouseOnInputBox'));
  },
  //Auto register all observers
  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(upassword.overlay[func]) == "function")
        upassword.Observers.add("upassword.overlay." + func, upassword.overlay[func], upassword.overlay);
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(upassword.overlay[func]) == "function")
        upassword.Observers.remove("upassword.overlay." + func, upassword.overlay[func], upassword.overlay);
  }
};

window.addEventListener("load", function(){ upassword.overlay.init(); upassword.overlay.register(); }, false);
window.addEventListener("unload", function(){ upassword.overlay.unregister(); }, false);