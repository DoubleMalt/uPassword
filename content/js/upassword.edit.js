"use strict";

var upassword = upassword || {};
upassword.edit = upassword.edit || {};

$.extend(upassword.edit, {
  init: function(){
    upassword.init();
    //Init domain text field
    var domain;
    try{
      var retVals = window.arguments[0];
      if(typeof retVals.domain == undefined){
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Components.interfaces.nsIWindowMediator);
        var win = wm.getMostRecentWindow("navigator:browser");
        var doc = win.getBrowser().contentDocument;
        domain = doc.domain;
      }
      else
        domain = retVals.domain;
      $('input[name="domain"]').val(domain);
      var displayName = domain;
      
      try { 
        displayName = upassword.domain.getDomain(displayName);
      }catch(e){}
      
      if(displayName == '') displayName = domain;
      
      $('input[name="displayName"]').val(displayName);
    }catch(e){}
    upassword.i18nHtml();
    
    //Bind button's actions
    $('#newSub').click(function(){
      if($('#new_rule_tab').hasClass('active'))
        upassword.edit.create();
      else
        upassword.edit.alias();
    });
    
    upassword.edit.preparePassList('#listNames');
    
    $('#searchKey').keyup(function() {
      upassword.edit.filterList();
    });
    //Hide twipsy for tab change
    $('[data-tabs] a').click(function(){
      $('.twipsy').hide();
    });
    
    upassword.edit.showInfo(domain);
  },
  preparePassList: function(lst){
    var setting = upassword.getSetting();
    
    if(setting != '') {
      $(lst).children().remove();
      for(var dn in setting.passList) {
        var option = $('<option></option>').text(dn).val(dn);
        var domains = [];
        for(var host in setting.alias){
          if(typeof(setting.alias[host]) == 'string') {
            if(setting.alias[host] == dn)
              domains.push(host.toLowerCase());
          } else {
            if(setting.alias[host].indexOf(dn) !== -1)
              domains.push(host.toLowerCase());
          }
        }
        option.attr('domain', JSON.stringify(domains));
        $('#listNames').append(option);
      }
    }
  },
  showInfo : function(domain) {
    var setting = upassword.getSetting();
    if(!setting.alias) return false;
    var result = [];
    var domainName = upassword.domain.getDomain(domain)
    for(var host in setting.alias) {
      if(!setting.alias.hasOwnProperty(host))
        continue;
      if(upassword.domain.getDomain(host) == domainName)
        result.push(host);
    }
    if(result.length > 0) {
      $('.domainExisted').show();
      $('.domainExisted .close').click(function(){ $('.domainExisted').hide(); });
      $('.domainExisted .btn').click(function(){
        $('#cfg_tabs .alias_rule').click();
        $('#searchKey').val(domainName);
        upassword.edit.filterList();
        $('.domainExisted').hide(); 
      });
    }
  },
  filterList : function(){
    //var logger = upassword.getLogger('upassword.edit.filterList');
    var k = $('#searchKey').val().toLowerCase();
    //logger.debug(k);
    k = $.trim(k);
    upassword.edit.preparePassList('#listNames');
    if(k == '') return false;
    //logger.debug($('#listNames').find('option').length);
    $('#listNames').find('option').each(function(){
      //logger.debug($(this).val().toLowerCase());
      //logger.debug($(this).attr('domain'));
      if($(this).val().toLowerCase().indexOf(k) !== -1 || $(this).attr('domain').indexOf(k) !== -1)
        {}
      else
        $(this).remove();
    });
  },
  create: function(){
    $('.error').removeClass('error');
    $('.twipsy').hide();
    
    var form = upassword.serializeObject($('#newCfg'));
    
    var error = false;
    if(!form.displayName)
    {
      $('input[name="displayName"]').addClass('error').focus().twipsy({trigger: 'manual'}).twipsy('show').parents('.clearfix').addClass('error');
      error = true;
    }
    form.displayName = $.trim(form.displayName);
    if(!form.upType)
    {
      $('input[name="upType"]').next().addClass('error').parents('.clearfix').addClass('error').find('[rel=twipsy]').twipsy({trigger: 'manual'}).twipsy('show');
      error = true;
    }
    if(error) return false;
    //Load setting
    
    var setting = upassword.getSetting();
    if(form.displayName in setting.passList)
    {
      $('input[name="displayName"]').addClass('error').focus().attr('title',upassword.i18n('displayNameExistedError')).twipsy({trigger: 'manual'}).twipsy('show').parents('.clearfix').addClass('error');
      error = true;
    }
    if(error) return false;

    var obj = JSON.parse(JSON.stringify(form));
    delete obj.displayName;
    obj.created = Date.now();
    obj.modified = Date.now();
    obj.lastVisited = Date.now();
    
    if(typeof(obj.upType) == 'string')
      obj.upType = new Array(obj.upType);

    obj.upType = obj.upType.reduce(function(previousValue, currentValue, index, array){  
      return parseInt(previousValue) + parseInt(currentValue);
    });
    
    if(typeof (obj.upType) == 'string')
      obj.upType = parseInt(obj.upType);
      
    if(typeof (obj.upLength) == 'string')
      obj.upLength = parseInt(obj.upLength);
    
    if(typeof (obj.upRevision) == 'undefined')
      obj.upRevision = 0;
      
    if(typeof (obj.upRevision) == 'string')
      if(obj.upRevision == '')
        obj.upRevision = 0;
      else
        obj.upRevision = parseInt(obj.upRevision);
    
    obj.favorite = false;
    
    setting.generated = Date.now();
    //alert(JSON.stringify(obj));
    setting.passList[form.displayName] = obj;
    
    setting = upassword.addAlias(setting, $('#domainCreation').val(), form.displayName);
    upassword.saveSetting(setting);
    upassword.Observers.notify("upassword.overlay.doPasswordCreated", null);
    upassword.Observers.notify("upassword.overlay.doShowNotification", form.displayName);
    self.close();
  },
  
  alias: function(){
    if($('#listNames').find('option:selected').length == 0){
      $('#listNames').next().twipsy({trigger: 'manual'}).twipsy('show').parents('.clearfix').addClass('error');
      return false;
    }
    var setting = upassword.getSetting();
    var domainName = $('#domainAlias').val();
    var displayNames = [];
    $('#listNames').find('option:selected').each(function(){
      var displayName = $(this).val();
      setting = upassword.addAlias(setting, domainName, displayName);
      displayNames.push(displayName);
    });
    upassword.saveSetting(setting);
    upassword.Observers.notify("upassword.overlay.doPasswordCreated", null);
    self.close();
  }
});


$(function(){
  upassword.edit.init();
});