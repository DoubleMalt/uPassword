"use strict";

var upassword = upassword || {};
upassword.index = upassword.index || {};

$.extend(upassword.index, {
  init: function(){
    
    upassword.init();
    $(document).attr('title', upassword.i18n('managePasswordTitle'));
    try{ upassword.i18nHtml(); } catch(e) { dump(e.message)};
    
    this.setting = upassword.getSetting();
    this.fillTable();
    $('#modal-from-dom').modal({
      keyboard: true,
      backdrop: true
    }).bind('shown', function(){
      $('input[name="displayName"]').focus();
      
    }).bind('hidden', function(){
      $('.twipsy').hide();
      $('#modal-from-dom').data('dn',null);
    });
    $('div.modal-body').scroll(function(){
      $('.twipsy').hide();
    });

    $('.selectAllCheckbox').click(function(){
      if($(this).attr('checked'))
        $('input[name="cbx"]').attr('checked', true);
      else
        $('input[name="cbx"]').removeAttr('checked');
    });
    
    $('img.star').live('click', upassword.index.star);
    
    $('a.refresh').click(function(){ self.location.reload(); });
    $('a.deleteRule').click(upassword.index.deleteRule);
    $('a.createRule').click(upassword.index.createRule);
    $('a.exportJSON').click(function(){
      upassword.Observers.notify("upassword.overlay.doExportJSON", null);
    });
    $('a.importJSON').click(function(){
      upassword.Observers.notify("upassword.overlay.doImportJSON", null);
      self.location.reload();
    });
    
    $('a.resetSetting').click(function(){
      $('#resetSetting').modal('show');
    });
    $('#resetSetting .secondary').click(function(){$('#resetSetting').modal('hide');});
    $('#resetSetting .danger').click(function(){
      upassword.resetSetting();
      upassword.index.fillTable();
      $('#resetSetting').modal('hide');
    });
    
    $('#modal-from-dom .secondary').click(function(){$('#modal-from-dom').modal('hide');});
    $('#modal-from-dom .primary').click(upassword.index.formSubmit);
    $('button.edit').live('click', upassword.index.editRule);
    $('button.copyPassword').live('click', upassword.index.copyPassword);
    $('button.displayPassword').live('click', upassword.index.displayPassword);
    $('button.delete').live('click', function(){
      var setting = upassword.getSetting();
      var dn = $(this).parent().prevAll('.displayName').html();
      delete setting.passList[dn];
      upassword.removeAlias(setting, false, dn);
      $(this).parents('tr').remove();
      upassword.saveSetting(setting);
    });
    
    $('#searchTxt').bind("keyup", function() {
        if(upassword.index.timer)
          clearTimeout(upassword.index.timer);
        upassword.index.timer = setTimeout (function(){ upassword.index.fillTable(); }, 1000);
    });
    
    $('#passwordRules .header').click(function(){
      if(!$(this).attr('name'))
        return false;
        
      
      if($(this).hasClass('headerSortUp'))
      {
        $('#passwordRules .header').removeClass('headerSortUp').removeClass('headerSortDown');
        $(this).addClass('headerSortDown');
        upassword.index.fillTable($(this).attr('name'), 'asc');
      }
      else
      {
        $('#passwordRules .header').removeClass('headerSortUp').removeClass('headerSortDown');
        $(this).addClass('headerSortUp');
        upassword.index.fillTable($(this).attr('name'), 'desc');
      }
    });
  },
  fillTable : function(sortKey, order){
    var logger = upassword.getLogger('upassword.index.fillTable');
    var rules = [];
    var setting = upassword.getSetting();
    
    var searchKey = $('#searchTxt').val();
    for(var displayName in setting.passList) {
      
      var obj = JSON.parse(JSON.stringify(setting.passList[displayName]));
      obj.aliasArray = upassword.getAlias(setting, displayName);
      if(searchKey){
        var alias = obj.aliasArray.join("\n");
        if(displayName.indexOf(searchKey) < 0 && alias.indexOf(searchKey) < 0)
          continue;
      }
      obj.displayName = displayName;
      if(obj.favorite === true)
        obj.favorite = 1;
      else
        obj.favorite = 0;
      if(!obj.created)
        obj.created = '';
      rules.push(obj);
    }
    
    if(sortKey){
      rules.sort(function(a, b){
        if(a[sortKey] && !b[sortKey])
          return (order == 'asc') ? -1 : 1;
        if(!a[sortKey] && b[sortKey])
          return (order == 'asc') ? 1 : -1;
        
        if(typeof a[sortKey] == 'string')
          return  (order == 'asc') ? ((a[sortKey] > b[sortKey]) ? 1 : -1) : ((a[sortKey] > b[sortKey]) ? -1 : 1);
        else
          return  (order == 'asc') ? (a[sortKey] - b[sortKey]) : (b[sortKey] - a[sortKey]);
      });
    }
    $('#tableContent').text('');
    //logger.debug(rules);
    for(var i=0, rule; rule = rules[i]; i++){
      var $tr = $('<tr></tr>');
      $tr.append($('<td style="text-align:center;"><input type="checkbox" name="cbx"></td>'));
      $tr.append($('<td class="displayName"></td>').text(rule.displayName));
      $tr.append($('<td style="text-align:center;"></td>').text(rule.upLength));
      $tr.append($('<td style="text-align:center;"></td>')
                    .attr('data', rule.upType)
                    .append(
                      $('<span style="font-size: 75%"></span>').text(upassword.index.formatUpType(rule.upType))
                    )
                );
      $tr.append($('<td style="text-align:center;"></td>').text(rule.upRevision));
      $tr.append($('<td style="text-align:center;"></td>')
                    .attr('data', rule.defaultAction).text(upassword.i18n(rule.defaultAction))
                );
      var img = (rule.favorite) ? 'star' : 'star_grey';
      $tr.append($('<td style="text-align:center;" type="favorite"></td>')
                    .attr('data', rule.favorite)
                    .append(
                      $('<img src="images/star.png" class="star">').attr('src','images/' + img + '.png')
                    )
                );
      $tr.append($('<td style="text-align:center;"></td>')
                    .attr('data', rule.modified).text(upassword.toDateString(rule.modified, "yyyy-MM-dd HH:mm:ss"))
                );
      var $ul = $('<ul style="margin:0 0 0 10px;"></ul>');
      for(var j=0, alias; alias = rule.aliasArray[j]; j++){
        $ul.append($('<li></li>').text(alias));
      }
      $tr.append($('<td></td>').append($ul));
      
      $tr.append($('<td style="text-align:center;"></td>')
              .append($('<button class="btn xsmall danger delete"></button>').text(upassword.i18n('delete')))
              .append($('<button class="btn xsmall primary edit"></button>').text(upassword.i18n('edit')))
              .append($('<button class="btn xsmall success copyPassword"></button>').text(upassword.i18n('copy')))
              .append($('<button class="btn xsmall success displayPassword"></button>').text(upassword.i18n('display')))
      );
      $("#tableContent").append($tr);
    }
    
  },
  star : function(){
    var dn = $(this).parent().prevAll('.displayName').html();
    setting = upassword.getSetting();
    var logger = upassword.getLogger('upassword.index.star');
    logger.debug($(this).parents('td').attr('data'));
    if($(this).parents('td').attr('data') == '1') {
      $(this).attr('src','images/star_grey.png').parents('td').attr('data', 0);
      setting.passList[dn].favorite = false;
    }
    else
    {
      $(this).attr('src','images/star.png').parents('td').attr('data',1);
      setting.passList[dn].favorite = true;
    }
    upassword.saveSetting(setting);
  },
  deleteRule : function(){
    var setting = upassword.getSetting();
    $('input[name="cbx"]').each(function(){
      if($(this).attr('checked')){
        var dn = $(this).parent().nextAll('.displayName').html();
        delete setting.passList[dn];
        upassword.removeAlias(setting, false, dn);
        $(this).parents('tr').remove();
      }
    });
    upassword.saveSetting(setting);
  },
  createRule : function(){
    $('#modal-from-dom').modal('show').find('h3').text(upassword.i18n('newPasswordRule'));
    $('input[name="displayName"]').removeAttr('disabled');
    $('button[type="reset"]').click();
  },
  textExtraction : function(node){
    return $(node).attr("data") ? $(node).attr("data") : $(node).html();
  },
  formValidation : function(tp){
    $('.error').removeClass('error');
    $('.twipsy').hide();
    
    var form = upassword.serializeObject($('#mntCfg'));
    
    var error = false;
    if(!tp && !form.displayName)
    {
      $('input[name="displayName"]').focus().twipsy({trigger: 'manual'}).twipsy('show').parents('.clearfix').addClass('error');
      error = true;
    }
    form.displayName = $.trim($('input[name="displayName"]').val());
    if(!form.upType)
    {
      $('input[name="upType"]').next().parents('.clearfix').addClass('error').find('[rel=twipsy]').twipsy({trigger: 'manual'}).twipsy('show');
      error = true;
    }
    if(error) return false;
    if(!tp) {
      var setting = upassword.getSetting();
      if(form.displayName in setting.passList)
      {
        $('input[name="displayName"]').focus().attr('title',upassword.i18n('displayNameExistedError')).twipsy({trigger: 'manual'}).twipsy('show').parents('.clearfix').addClass('error');
        error = true;
      }
    }
    return (error) ? false : form;
  },
  formSubmit : function(){
    var logger = upassword.getLogger('upassword.index.formSubmit');
    var setting = upassword.getSetting();
    var form;
    var creation = true;
    if($('#modal-from-dom').data('dn')){
      creation = false;
      form = upassword.index.formValidation('edit');
      if(form === false) return false;
      var old = $('#modal-from-dom').data('dn');
      
      var obj = JSON.parse(JSON.stringify(form));
      delete obj.displayName;
      delete obj.aliased;
      obj.created = old.created;
      obj.modified = new Date().getTime();
      obj.lastVisited = new Date().getTime();
      obj.favorite = (obj.favorite == 'true');
      
      if(typeof(obj.upType) == 'string')
        obj.upType = new Array(obj.upType);

      obj.upType = obj.upType.reduce(function(previousValue, currentValue, index, array){  
        return parseInt(previousValue) + parseInt(currentValue);
      });
      
      if(typeof (obj.upType) == 'string')
        obj.upType = parseInt(obj.upType);
        
      if(typeof (obj.upLength) == 'string')
        obj.upLength = parseInt(obj.upLength);

      if(typeof (obj.upRevision) == 'string')
        if(obj.upRevision == '')
          obj.upRevision = 0;
        else
          obj.upRevision = parseInt(obj.upRevision);
          
      var setting = upassword.getSetting();
      setting.passList[form.displayName] = obj;
      
      
      for(var i=0,domain; domain = old.aliasedArray[i]; i++ )
        setting = upassword.removeAlias(setting, domain, form.displayName);

      if(typeof(form.aliased) == 'string' && form.aliased.length > 0) {
        if(form.aliased.indexOf('\n') >= 0)
          form.aliased = form.aliased.split('\n');
        else
          form.aliased = [form.aliased];
        
        for(var i=0, domain; domain = form.aliased[i]; i++)
        {
          domain = $.trim(domain);
          if(domain == '') continue;
          setting = upassword.addAlias(setting, domain, form.displayName);
        }
      }
    }else {
      form = upassword.index.formValidation();
      if(form === false) return false;
      
      var obj = JSON.parse(JSON.stringify(form));
      delete obj.displayName;
      delete obj.aliased;
      obj.created = new Date().getTime();
      obj.modified = new Date().getTime();
      obj.lastVisited = new Date().getTime();
      obj.favorite = (obj.favorite == 'true');
      
      if(typeof(obj.upType) == 'string')
        obj.upType = new Array(obj.upType);

      obj.upType = obj.upType.reduce(function(previousValue, currentValue, index, array){  
        return parseInt(previousValue) + parseInt(currentValue);
      });
      
      if(typeof (obj.upType) == 'string')
        obj.upType = parseInt(obj.upType);
        
      if(typeof (obj.upLength) == 'string')
        obj.upLength = parseInt(obj.upLength);

      if(typeof (obj.upRevision) == 'string')
        if(obj.upRevision == '')
          obj.upRevision = 0;
        else
          obj.upRevision = parseInt(obj.upRevision);
      
      logger.debug(JSON.stringify(obj));
      setting.passList[form.displayName] = obj;
      
      if(typeof(form.aliased) == 'string' && form.aliased.length > 0) {
        
        if(form.aliased.indexOf('\n') >= 0)
          form.aliased = form.aliased.split('\n');
        else
          form.aliased = [form.aliased];
        
        for(var i=0, domain; domain = form.aliased[i]; i++)
        {
          domain = $.trim(domain);
          if(domain == '') continue;
          setting = upassword.addAlias(setting, domain, form.displayName);
        }
      }
    }
    upassword.saveSetting(setting);
    if(creation)
      upassword.Observers.notify("upassword.overlay.doShowNotification", form.displayName);
    //alert(JSON.stringify(setting));
    upassword.index.fillTable();
    
    $('#modal-from-dom').modal('hide');
  },
  copyPassword : function(){
    var dn = $(this).parent().prevAll('.displayName').html();
    upassword.Observers.notify("upassword.overlay.doCopyPassword", dn);
  },
  displayPassword : function(){
    var dn = $(this).parent().prevAll('.displayName').html();
    upassword.Observers.notify("upassword.overlay.doDisplayPassword", dn);
  },
  editRule : function(){
    var dn = $(this).parent().prevAll('.displayName').html();
    var setting = upassword.getSetting();
    var obj = setting.passList[dn];
    obj.displayName = dn;
    obj.aliasedArray = upassword.getAlias(setting, dn);
    obj.aliased = obj.aliasedArray.join("\n");
    for(var i=0, t; t = [1,2,4,8][i]; i++){
      //alert(t + "," + obj.upType + "," + (obj.upType & t));
      if((obj.upType & t) == 0)
        $('input[name="upType"][value="' + t + '"]').removeAttr("checked");
      else
        $('input[name="upType"][value="' + t + '"]').attr('checked',true);
    }

    //alert(JSON.stringify(obj));
    delete obj.upType;
    upassword.initForm(obj, '#mntCfg');
    $('input[name="displayName"]').attr('disabled', true);
    $('#modal-from-dom').data('dn', obj).modal('show').find('h3').text(upassword.i18n('editPasswordRule'));
  },
  formatUpType : function(upType){
    var formated = [upassword.i18n('numbers'), upassword.i18n('lowCaseLetters'), upassword.i18n('upCaseLetters'), upassword.i18n('specialChars')];
    var result = [];
    for(var i=0, t; t = [1,2,4,8][i]; i++){
      if((upType & t) > 0)
        result.push(formated[i]);
    }
    return result.join(",");
  }
});

$(function(){
  upassword.index.init();
});