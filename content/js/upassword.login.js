"use strict"; 
 
upassword.login = {
  loaded : function(doc, win) {
    upassword.init();
    doc.title = upassword.i18n('uPasswordLoginDialogTitle');
    if(upassword.getPref('extensions.unipass.firstLogin', true))
    {
      var logoDiv = document.getElementById('logo');
      for(var i=0; i < logoDiv.childNodes.length; i++){
        logoDiv.removeChild(logoDiv.childNodes[i]);
      }
      var introduce = document.createElement('description');
      introduce.appendChild(document.createTextNode(upassword.i18n('upasswordBasePasswordIntro')));
      introduce.setAttribute('id', 'loginPasswordIntro')
      logoDiv.appendChild(introduce);
    }
    doc.documentElement.getButton("accept").setAttribute("label", upassword.i18n("login"));
    doc.documentElement.getButton("cancel") && doc.documentElement.getButton("cancel").setAttribute("label", upassword.i18n("cancel"));
    
    doc.getElementById("passwordlabel").setAttribute("value", upassword.i18n("mainPassword"));
    doc.getElementById("rememberpassword").setAttribute("label", upassword.i18n("savePassword"));
    //upassword.r(doc, "passwordlabel", "label", "mainPassword");
    //upassword.r(doc, "rememberpassword", "label", "savePassword");
    doc.getElementById('loginWarnLabel').style.display = "none";
    var savePassword = upassword.getPref("extensions.unipass.setting.savepassword", false);
    if(savePassword) {
      doc.getElementById("unpassword-input").value =
        upassword.getPref("extensions.unipass.setting.password", '');
      doc.getElementById("rememberpassword").checked = true;
    }
  },
  checkCaps : function(doc, win, evt) {
    document.getElementById('loginWarnLabel').textContent = upassword.i18n("capsLockIsON");
    var s = String.fromCharCode( evt.which );
    if ( s.toUpperCase() === s && s.toLowerCase() !== s && !evt.shiftKey )
       doc.getElementById('loginWarnLabel').style.display = "";
    else
       doc.getElementById('loginWarnLabel').style.display = "none";
  },
  savePasswordWarn : function(doc, win, evt) {
    if(doc.getElementById('rememberpassword').checked) {
      document.getElementById('loginWarnLabel').textContent = upassword.i18n("savePasswordWarn");
      doc.getElementById('loginWarnLabel').style.display = "";
    }
    else
      doc.getElementById('loginWarnLabel').style.display = "none";
  },
  accept : function(doc, win) {
    document.getElementById('loginWarnLabel').textContent = upassword.i18n("mainPasswordCannotBeNull");
    if(doc.getElementById("unpassword-input").value == '') {
      doc.getElementById('loginWarnLabel').style.display = "";
      return false;
    }
    else
      doc.getElementById('loginWarnLabel').style.display = "none";

    var savePassword = doc.getElementById("rememberpassword").checked ? true : false;
    upassword.setPref("extensions.unipass.setting.savepassword", savePassword);
    var password = doc.getElementById("unpassword-input").value;
    if(savePassword)
      upassword.setPref("extensions.unipass.setting.password", password);
    else
      upassword.setPref("extensions.unipass.setting.password", '');
    var retVals = window.arguments[0];
    retVals.password  = password;
    
    if(upassword.getPref('extensions.unipass.firstLogin', true))
      upassword.setPref('extensions.unipass.firstLogin', false);
    //Update overlay button icon
    //TODO
    retVals.parentDocument.getElementById('upassword-navbar-button').image = "chrome://upassword/content/images/icon16.png";
  },
  close : function() {
    return true;
  }
};