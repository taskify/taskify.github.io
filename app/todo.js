// Globals
var PROXY = "https://rww.io/proxy.php?uri={uri}";
var TIMEOUT = 90000;
var DEBUG = true;

// Namespaces
var ACL    = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
var ADMS   = $rdf.Namespace("http://www.w3.org/ns/adms#");
var CURR   = $rdf.Namespace("https://w3id.org/cc#");
var CERT   = $rdf.Namespace("http://www.w3.org/ns/auth/cert#");
var CORE   = $rdf.Namespace("http://purl.org/ontology/co/core#");
var DC     = $rdf.Namespace("http://purl.org/dc/elements/1.1/");
var DCT    = $rdf.Namespace("http://purl.org/dc/terms/");
var FOAF   = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var FLOW   = $rdf.Namespace("http://www.w3.org/2005/01/wf/flow#");
var ICAL   = $rdf.Namespace("http://www.w3.org/2002/12/cal/ical#");
var OWL    = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
var RDF    = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS   = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var SPACE  = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
var TASK   = $rdf.Namespace("https://taskify.org/ns/task#");
var TRACK  = $rdf.Namespace("http://dig.csail.mit.edu/2010/issues/track#");
var UI     = $rdf.Namespace("http://www.w3.org/ns/ui#");

$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

var g = $rdf.graph();
var f = $rdf.fetcher(g);

defaultWebcreditsuri = 'http://klaranet.com/api/v1/'; // configurable
var defaultLdpc = 'https://public.databox.me/.taskify/'; // hard code for now until more websockets a



var action      = getParam('action'); // show friends or chat
var avatar      = getParam('avatar');
var ldpc        = getParam('ldpc');
var name        = getParam('name');
var presenceURI = getParam('presenceURI');
var seeAlso     = getParam('seeAlso') || getParam('invite');
var title       = getParam('title');
var webid       = getParam('webid');
var wss         = getParam('wss');


var template = {};

template.init = {
  action      : action,
  avatar      : avatar,
  ldpc        : ldpc,
  name        : name,
  seeAlso     : seeAlso,
  title       : title,
  webid       : webid,
  wss         : wss
};

template.settings = {
  avatar      : template.init.avatar,
  action      : template.init.action,
  ldpc        : template.init.ldpc,
  name        : template.init.name,
  seeAlso     : template.init.seeAlso,
  title       : template.init.title,
  webid       : template.init.webid,
  wss         : template.init.wss
};


if (!template.settings.ldpc) {
  template.settings.ldpc = 'http://taskify.org:11077/inbox/';
}

// for tasks
var defaultLdpc = 'https://klaranet.com/d/taskify/'; // hard code for now until more websockets are there


// * Copyright 2012-2015 Melvin Carvalho and other contributors; Licensed MIT
(function($) {
  var lkp; // logs last key press event
  var currentfocus; // stores the currently focused item
  var loading = false; // prevents state change events whhen loading from a serialized state
  // base classes
  var todo = window.todo = (function(_data) {
    var todo = {
      Stateful: function() {
        var onchange = null;
        return Object.defineProperties({}, {
          onchange: { configurable: false, enumerable: false, get: function() { return onchange; }, set: function(value) {
            onchange = value;
          }},
          _state_change: { writable: false, configurable: false, enumerable: false, value: function() {
            if(!loading && this.onchange) this.onchange(this);
          }},
        });
      },
      Identifiable: function(interfaceName,id) {
        return Object.defineProperties(new todo.Stateful(), {
          type: { writable: false, configurable: false, enumerable: true, value: interfaceName },
          id: { writable: true, configurable: false, enumerable: true, value: id ? id : interfaceName.toLowerCase()+'-'+(++todo.inc) },
        });
      },
      TypedOrderedSet: function(type,refs) {
        var index = {}, order = [], references = !!refs;
        return Object.defineProperties(new todo.Stateful(), {
          type: { writable: false, configurable: false, enumerable: false, value: type },
          testType: { writable: false, configurable: false, enumerable: false, value: function(o) {
            return o && o.type && o.type.toLowerCase() == this.type.toLowerCase();
          }},
          add: { writable: false, configurable: false, enumerable: true, value: function(o) {
            if(!this.testType(o)) return this;
            if(index[o.id]) return this;
            index[o.id] = o;
            if(!references) {
              var _ = this;
              o.onchange = function() { _._state_change(); }; // trigger an onchange event when contained items change
            }
            order.push(o.id);
            this._state_change();
            return this;
          }},
          get: { writable: false, configurable: false, enumerable: true, value: function(k) { return index[k]; } },
          empty: { writable: false, configurable: false, enumerable: true, value: function() {
            index = {};
            order = [];
            this._state_change();
            return this;
          }},
          exists: { writable: false, configurable: false, enumerable: true, value: function(o) {
            if(!this.testType(o)) return false;
            return index.hasOwnProperty(o.id);
          }},
          keys: { writable: false, configurable: false, enumerable: true, value: function(proto) {
            var keys = [];
            proto = !proto;
            for(var i in index) {
              if(proto && Object.prototype[i]) { continue; }
              keys.push(i);
            }
            return keys;
          }},
          forEach: { writable: false, configurable: false, enumerable: true, value: function(f) {
            for(k in order) f(index[order[k]],order[k],this);
          }},
          remove: { writable: false, configurable: false, enumerable: true, value: function(o) {
            if(!this.testType(o)) return this;
            delete index[o.id];
            var neworder = [];
            for(k in order) if(order[k] != o.id) neworder.push(order[k]);
            order = neworder;
            this._state_change();
            return this;
          }},
          toArray: { writable: false, configurable: false, enumerable: true, value: function() {
            var a = [];
            for(k in order) a.push(index[order[k]]);
            return a;
          }},
          toString: { writable: false, configurable: false, enumerable: false, value: function() { return JSON.stringify(this.toArray()); } },
          toJSON: { writable: false, configurable: false, enumerable: false, value: function() {
            return references ? order : this.toArray();
          }},
        });
      },
      Column: function(id) {
        var name = '', items = new todo.TypedOrderedSet('Item',true);
        var c = Object.defineProperties(new todo.Identifiable('Column',id), {
          name: { configurable: false, enumerable: true, get: function() { return name; }, set: function(value) {
            if(String(value).valueOf() == name) return;
            name = String(value).valueOf();
            this._state_change();
          }},
          items: { configurable: false, enumerable: true, get: function() { return items; }, set: function(refs) {
            for(i in refs) items.add( todo.items.get(refs[i]));
          }},
        });
        items.onchange = function() { c._state_change(); };
        return c;
      },
      Tag: function(id) {
        var name = '';
        return Object.defineProperties(new todo.Identifiable('Tag',id), {
          name: { configurable: false, enumerable: true, get: function() { return name; }, set: function(value) {
            if(String(value).valueOf() == name) return;
            name = String(value).valueOf();
            this._state_change();
          }}
        });
      },
      Item: function(id) {
        var important = false, urgent = false, complete = false, text = '', tags = new todo.TypedOrderedSet('Tag',true);
        var c = Object.defineProperties( new todo.Identifiable('Item',id), {
          complete: { configurable: false, enumerable: true, get: function() { return complete; }, set: function(value) {
            if(complete || Boolean(value).valueOf() == complete) return;
            complete = Boolean(value).valueOf();
            this._state_change();
          }},
          important: { configurable: false, enumerable: true, get: function() { return important; }, set: function(value) {
            if(Boolean(value).valueOf() == important) return;
            important = Boolean(value).valueOf();
            this._state_change();
          }},
          urgent: { configurable: false, enumerable: true, get: function() { return urgent; }, set: function(value) {
            if(Boolean(value).valueOf() == urgent) return;
            urgent = Boolean(value).valueOf();
            this._state_change();
          }},
          text: { configurable: false, enumerable: true, get: function() { return text; }, set: function(value) {
            if(String(value).valueOf() == text) return;
            text = String(value).valueOf();
            this._state_change();
          }},
          tags: { configurable: false, enumerable: true, get: function() { return tags; }, set: function(refs) {
            for(i in refs) tags.add( todo.tags.get(refs[i]));
          }},
          value: { configurable: false, enumerable: false, get: function() {
            var value = 5;
            if(this.important) value += 10;
            if(this.urgent) value += 5;
            return value;
          }},
          toString: { writable: false, configurable: false, enumerable: false, value: function() { return JSON.stringify(this) } },
        });
        tags.onchange = function() { c._state_change(); };
        return c;
      },
      createColumn: function(name) {
        var o = new todo.Column();
        o.name = name ? name : o.id;
        todo.columns.add(o);
        return o;
      },
      createTag: function(name) {
        var o = new todo.Tag();
        o.name = name ? name : o.id;
        todo.tags.add(o);
        return o;
      },
      createItem: function(text,important,urgent,tags) {
        var item = new todo.Item();
        item.text = text ? text : '';
        item.important = important;
        item.urgent = urgent;
        item.tags = Array.isArray(tags) ? tags : [];
        todo.items.add(item);
        return item;
      },
      create: function(state) {
        loading = true;
        this.inc = 0,
        this.tags = new todo.TypedOrderedSet('Tag');
        this.columns = new todo.TypedOrderedSet('Column');
        this.items = new todo.TypedOrderedSet('Item');
        if(state) {
          this.inc = state.inc;
          for(i in state.tags) this.tags.add( this.instantiate(state.tags[i]) );
          for(i in state.items) this.items.add( this.instantiate(state.items[i]) );
          for(i in state.columns) this.columns.add( this.instantiate(state.columns[i]) );
        }
        loading = false;
        return this;
      },
      instantiate: function(instanceData) {
        var o = new this[instanceData.type](instanceData.id);
        for(k in instanceData) o[k] = instanceData[k];
        return o;
      }
    };
    return todo.create(_data);
  })(JSON.parse(localStorage.getItem('todo')));
  // storage
  todo.items.onchange = function(items) {
    localStorage.setItem('todo',JSON.stringify(todo));
  };
  todo.columns.onchange = function(items) {
    localStorage.setItem('todo',JSON.stringify(todo));
  };
  todo.tags.onchange = function(items) {
    localStorage.setItem('todo',JSON.stringify(todo));
  };
  // default "first run" state
  if(!localStorage.getItem('todo')) {
    with (todo) {
      var cols = [createColumn('To Do'),createColumn('Doing'),createColumn('Done')];
      cols.forEach(function(col) {
        col.items.add( createItem('') );
        columns.add(col);
      });
    }
  }
  // presentation control
  function displayTag(tag) {
    function tagTemplate(tag) {
      var a = $('<button class="btn btn-mini btn-inverse tag" data-id="'+tag.id+'">')
      .append( $('<i class="icon-tag icon-white"></i>') )
      .append( $('<span class="tag-name">') );
      return a;
    }
    var current = $('.tag[data-id="'+tag.id+'"]');
    if(current.length === 0) current = tagTemplate(tag);
    $('.tag-name', current).text( tag.name );
    return current;
  }
  function displayColumn(column) {
    function columnTemplate(column) {
      var a = $('<div class="span4 column" data-id="'+column.id+'">')
      .append( $('<h2 class="column-name" contenteditable="true"></h2>').keypress(function(ev) {
        if(ev.which == 13) return false;
      }).keyup( function(ev) {
        column.name = $(this).text();
      }))
      .append( $('<div class="items sortable">') );
      return a;
    }
    var current = $('.column[data-id="'+column.id+'"]');
    if(current.length === 0) current = columnTemplate(column);
    $('.column-name', current).text( column.name );
    column.items.forEach(function(item) {
      $('.items', current).append( displayItem(item) );
    });
    return current;
  }
  function displayItem(item) {
    function valueClass(item) {
      switch(item.value) {
        case 10: return 'badge-info';
        case 15: return 'badge-important';
        case 20: return 'badge-warning';
      }
      return '';
    }
    function itemTemplate(item) {
      a = $('<div class="item" data-id="'+item.id+'">').append(
        $('<div class="container-fluid">').append(
          $('<div class="handle">').append(
            $('<span class="badge item-value"></span>')
          ).append(
            $('<button class="btn btn-mini btn-inverse active item-urgent"><i class="icon-star icon-white"></i></button>').click(function() {
              item.urgent = !item.urgent;
              displayItem(item);
            })
          ).append(
            $('<button class="btn btn-mini btn-inverse active item-important"><i class="icon-exclamation-sign icon-white"></i></button>').click(function() {
              item.important = !item.important;
              displayItem(item);
            })
          ).append(
            $('<button class="btn btn-mini pull-right btn-inverse item-remove"><i class="icon-remove icon-white"></i></button>').click(function() {
              var _c = todo.columns.get($(this).parents('.column').data('id'));
              todo.items.remove(item);
              _c.items.remove(item);
              $(this).parents('.item').remove();
              displayColumn(_c);
            })
            /*
          ).append(
          $('<button class="btn btn-mini pull-right btn-inverse item-complete"><i class="icon-ok icon-white"></i></button>').click(function() {
          item.complete = !item.complete;
          displayItem(item);
        })
      ).append(
      $('<div class="btn-group taglist pull-right">').append(
      $('<button class="btn btn-mini btn-inverse dropdown-toggle" data-toggle="dropdown"><i class="icon-tag icon-white"></i><span class="caret"></span></button>').click(function(){
      $('.item[data-id='+item.id+'] .taglist ul').remove();
      var menu = $('<ul class="dropdown-menu">');
      todo.tags.forEach(function(tag){
      if(!item.tags.exists(tag))
      menu.append( $('<li>').append(
      $('<a href="javascript:void(0)">').append(' <i class="icon-tag"></i> ' + tag.name).click(function() {
      item.tags.add(tag);
      displayItem(item);
    })
  )
);
});
$('.item[data-id='+item.id+'] .taglist').append(menu);
})
)
*/
)
).append(
  $('<textarea class="item-text">')
  .click(function(ev) {
    addpoints();
  })
  .keyup(function(ev) {
    if (lkp && lkp.target && lkp.which != ev.which && ev.which == 8) {
      addpoints();
    }
  })
  .keyup(function(ev) {
    if (lkp && lkp.target && lkp.which != ev.which && ev.which == 13) {
      addpoints();
    }
  })
  .keypress(function(ev) {
    if (!(ev.which == 115 && ev.ctrlKey) && !(ev.which == 19)) return true;
    eval($('#save').attr('href'));
    ev.preventDefault();
    return false;
  })
  .keypress(function(ev) {
    if (!(ev.which == 108 && ev.ctrlKey) && !(ev.which == 19)) return true;
    eval($('#load').attr('href'));
    ev.preventDefault();
    return false;
  })
  .keyup(function(ev) {
    var log = true;
    if(lkp && lkp.target && lkp.which) {
      if(lkp.target == ev.target && lkp.which == ev.which) {
        if(ev.which == 13) {
          stopEvent(ev);
          item.text = $(this).val().replace(/^[\r\n]+|\.|[\r\n]+$/,'');
          var _i = $('.item[data-id="'+item.id+'"]');
          var newitem = todo.createItem();
          todo.columns.get( _i.parents('.column').data('id') ).items.add( newitem );
          _i.after( displayItem(newitem) );
          resequence();
          $('.item[data-id="'+newitem.id+'"] .item-text').focus();
          log = false;
        }
      }
    }
    if(log) {
      lkp = {target: ev.target, which: ev.which};
      item.text = $(this).val();
    } else {
      lkp = null;
    }
  })
  .focus(function(ev) {
    currentfocus = $(ev.target).addClass('editing');
    $(ev.target).parents('.item').addClass('selected');
  })
  .focusout(function(ev) {
    $(ev.target).removeClass('editing').parents('.item').removeClass('selected');
  })
  .autosize()
).append(
  $('<div class="item-tags">')
)
);
return a;
}
var current = $('.item[data-id="'+item.id+'"]');
if(current.length === 0) current = itemTemplate(item);
$('.item-value', current).text( item.value ).removeClass('badge-info badge-warning badge-important').addClass(valueClass(item));
$('.item-text', current).val( item.text );
item.urgent ? $('.item-urgent', current).removeClass('btn-inverse').addClass('btn-info') : $('.item-urgent', current).removeClass('btn-info').addClass('btn-inverse');
item.important ? $('.item-important', current).removeClass('btn-inverse').addClass('btn-danger') : $('.item-important', current).removeClass('btn-danger').addClass('btn-inverse');
$('.item-tags', current).empty();
item.tags.forEach(function(tag) {
  $('.item-tags', current).append(
    $('<span class="label label-inverse tag"><i class="icon-tag icon-white"></i> '+tag.name+'</span>').click(function() {
      item.tags.remove(tag);
      displayItem(item);
    })
  );
});
if(item.complete) {
  $('button', current).not('.item-remove').addClass('disabled').unbind("click");
  $('.tag', current).unbind("click");
  $('.item-text', current).attr('disabled','disabled');
}
return current;
}
function resequence() {
  todo.columns.forEach(function(column) {
    column.items.empty();
    $('.column[data-id="'+column.id+'"] .items .item').each(function() {
      column.items.add( todo.items.get($(this).data('id')) );
    });
    displayColumn(column);
  });
}

function addSpecificity(button) {
  button.click(function() {
    if(button.hasClass('btn-success')) {
      button.removeClass('btn-success').addClass('btn-warning').text('Unfocus');
      $('body').addClass('specific');
    } else {
      button.removeClass('btn-warning').addClass('btn-success').text('Focus');
      $('body').removeClass('specific');
    }
    if(currentfocus) currentfocus.focus();
  });
}
function stopEvent(ev) {
  ev.preventDefault();
  ev.stopImmediatePropagation();
}
function addpoints(points) {
  var today;
  webcredits = localStorage.getItem('webcredits');
  if (webcredits) {
    webcredits=JSON.parse(webcredits);
    today = webcredits['today'];
    if (!webcredits['webcreditsuri']) webcredits['webcreditsuri'] = [defaultWebcreditsuri];
  } else {
    webcredits = {};
  }
  if (!today) today = 0;
  today = parseInt(today) + 5.0;
  webcredits['today'] = today;
  localStorage.setItem('webcredits', JSON.stringify(webcredits));
  mod = today % 25;
  str = '';  for(i=0; i<25; i+=5) str += mod > i ? '█' : '&nbsp;&nbsp;';
  $('#score').html(' Credits : ' + (today - mod) + '</a> ' + str + '|');
  //$('#score').attr('href', 'https://d.taskify.org/c/dash.php?destination='+ escape(window.user));
  hook = localStorage.getItem('hook');
  // add your own hook
  if (mod === 0) {
    humane.log(today + ' points!');
    if (hook) {
      eval(hook);
    } else if ( window.user ) {

      if (template.settings.ldpc) {
        var ldpc        = template.settings.ldpc;
        var source      = 'https://workbot.databox.me/profile/card#me';
        var hash        = CryptoJS.SHA256(window.user);
        var uri         = ldpc + hash + '/';
        var amount      = 25;
        var comment     = document.domain;
        var destination = window.user;
        var currency    = 'https://w3id.org/cc#bit';


        var t = "<>  a <https://w3id.org/cc#Credit> ;  \n";
        t+= "<https://w3id.org/cc#source>   <"+ source +">    ; \n";
        t+= "<https://w3id.org/cc#destination>      <"+ destination +"> ;   \n";
        t+= "<https://w3id.org/cc#amount> "+ amount +" ;  \n";
        t+= "<http://www.w3.org/2000/01/rdf-schema#comment> '"+ comment +"' ;  \n";
        t+= "<https://w3id.org/cc#currency>      <https://w3id.org/cc#bit> ." ;

        console.log(t);

        $.ajax({
          url: ldpc,
          //contentType: "text/turtle",
          type: 'POST',
          //data: t,
          dataType: "json",
          data: {
            'source': source,
            'destination': destination,
            'amount': amount,
            'currency': currency,
            'description': comment
          },
          success: function(result) {
          }
        });
/*
        $.ajax({
          url: uri + ',meta',
          contentType: "text/turtle",
          type: 'PUT',
          data: '<> <> <> .',
          success: function(result) {
          }
        });
*/
      }


      $.ajax({
        url:webcredits['webcreditsuri'][0] + "balance?uri="+escape(window.user) + "&referrer=" + escape(window.location.protocol + '//' + window.location.hostname),
        complete: function (msg) {
          var m = JSON.parse(msg.responseText);
          webcredits = JSON.parse(localStorage.getItem('webcredits')) || {};
          webcredits['today'] = msg["amount"];
          window.localStorage.setItem("webcredits", JSON.stringify(webcredits)) ;
          console.log(m);
          $("#score").html(' Credits: ' + m['amount']);
          //$('#score').attr('href', 'https://d.taskify.org/c/dash.php?destination='+ escape(window.user));
        }});
      }
    }
  }
  function render() {
    todo.tags.forEach(function(tag) {
      $('#tags').append( displayTag(tag) );
    });
    todo.columns.forEach( function(column) {
      $('#columns').append( displayColumn(column) );
    });
    addSpecificity($('#ui-focus'));
    $('#newtagform').submit(function() {
      var newtag = $('#newtag').val();
      if(newtag) {
        $('#tags').append( displayTag(todo.createTag(newtag)) );
        $('#newtag').val('');
      }
      return false;
    });
    $('.sortable').sortable({items:'> .item', handle:'.handle', connectWith:'.sortable', update:function() { resequence(); } });
    $('#simple-menu').sidr();
  }


  window.addEventListener('WebIDAuth',function(e) {
    var webid = e.detail.user;
    $('webid-login').hide();
    getJSONP(webid);
  });

  $(document).ready(function() {

    window.localStorage.setItem('version', '0.2');
    document.title = document.domain;

    render();

    wc = localStorage.getItem('webcredits');
    if (wc) {
      wc=JSON.parse(wc);
      if (!wc['webcreditsuri']) wc['webcreditsuri'] = [defaultWebcreditsuri];
    } else {
      wc = {'webcreditsuri' : [defaultWebcreditsuri], 'today' : 0 };
    }
    localStorage.setItem('webcredits', JSON.stringify(wc));
    $('#webcreditsuri').val(wc['webcreditsuri']);

    var user = localStorage.getItem('user');
    var webid = localStorage.getItem('webid');
    if (webid) {
      getJSONP(webid);
    } else if (user) {
      user = JSON.parse(user);
      displayUser(user);
    } else {
      //var script = document.createElement('script');
      //script.src = 'https://taskify.org/common/user.js.php' + '?callback=getJSONP';
      //document.body.appendChild(script);
    }




  });



})(jQuery);


function getJSONP(val) {
  displayUser({ '@id' : val, 'name' : val });
}

function displayUser(user) {
  window.user = user['@id'];
  localStorage.setItem('webid', window.user);

  if (window.user.indexOf('dns:') == -1 ) {
    $('#user').text(user.name).append('<b class="caret"></b>');
    $('#score').attr('href', 'http://'+ document.domain  +'/c/dash?destination=' + escape(user['@id']));
  }

  ws = localStorage.getItem('workspace');
  if (ws) {
    ws = JSON.parse(ws);
  }
  if (getParameterByName('workspace')) {
    ws = [];
    ws.push(getParameterByName('workspace'));
    localStorage.setItem('workspace', JSON.stringify(ws));
    load(getParameterByName('workspace'));
  } else if ( document.domain.indexOf('public.taskify.org') !== -1 && !ws) {
    ws = [];
    ws.push('https://public.databox.me/Public/taskify/' + document.domain);
    localStorage.setItem('workspace', JSON.stringify(ws));
    load(ws[0]);
  }
  if (!ws) {
    ws= [];
    ws.push('https://public.databox.me/Public/.taskify/' + document.domain);
    localStorage.setItem('workspace', JSON.stringify(ws));
  }
  $('#workspace').val(ws[0]);
  $('#workspace').attr('size',ws[0].length);


  var uris = localStorage.getItem('workspace');
  if (uris && ( window.user.indexOf('dns:') === -1 ||  document.domain.indexOf('public.taskify.org') !== -1 ) ) {
    uris = JSON.parse(uris);
    $('#user').after('<ul class="dropdown-menu"><li id="action" class="nav-header">Action</li></ul>');
    $('#user').attr('class', 'dropdown-toggle');
    $('#user').attr('data-toggle', 'dropdown');

    $('#action').parent().append('<li><a id="save" href="#">Save</a></li>');
    $('#action').parent().append('<li><a id="load" href="#">Load</a></li>');
    $('#action').parent().append('<li class="divider"></li>');
    $('#action').parent().append('<li><a href="#settings" data-toggle="modal">Settings</a></li>');
    $('#action').parent().append('<li><a href="#boards" data-toggle="modal">Boards</a></li>');
    $('#action').parent().append('<li class="divider"></li>');
    $('#action').parent().append('<li><a href="javascript:logout()">Sign Out</a></li>');
    $('#load').attr('href', 'javascript:load(\''+ uris[0] +'\')');
    $('#save').attr('href', 'javascript:save(\''+ uris[0] +'\')');
    if ( window.user.indexOf('dns:') !== -1 ) {
      $('#user').text(window.user).append('<b class="caret"></b>');
    }
  }

  var tasks = localStorage.getItem('tasktree');
  if (tasks) {
    tasks = JSON.parse(tasks);

    // sort alg simple timestamp for now
    tasks.sort(function(a,b) {
      if (!a.modified) return 1;
      first = new Date(a.modified);
      second = new Date(b.modified);
      return second - first;
    });

    for (i=0; i<tasks.length; i++) {
      var id = tasks[i]['@id'];
      var modified = tasks[i]['modified'];
      if (id.indexOf('tree.html') > 0) {
        $('#boardlist').append('<div><a href="javascript:up(\'' +id+ '\')">↑</a> <a href="javascript:remove(\'' +id+ '\')">X</a> <a class="green" title="'+ moment(modified, "YYYY-MM-DDTHH:mm:ssZ").fromNow()  +'" href="' + id + '">' + id +'</a> <small>('+  moment(modified, "YYYY-MM-DDTHH:mm:ssZ").fromNow()  +')</small></div>');
      } else {
        $('#boardlist').first().append('<div><a href="javascript:up(\'' +id+ '\')">↑</a> <a href="javascript:remove(\'' +id+ '\')">X</a> <a title="'+ moment(modified, "YYYY-MM-DDTHH:mm:ssZ").fromNow()  +'" href="' + id + '">' + id +'</a> <small>('+  moment(modified, "YYYY-MM-DDTHH:mm:ssZ").fromNow()  +')</small></div>');
        $('#sidr').first().append('<div><a href="javascript:up(\'' +id+ '\')">↑</a> <a href="javascript:remove(\'' +id+ '\')">X</a> <a title="'+ moment(modified, "YYYY-MM-DDTHH:mm:ssZ").fromNow()  +'" href="' + id + '">' + id +'</a> </div>');
      }
    }
  }

}

// TODO cleanup
function deleteFile(file) {
  var body = '';
  xhr = new XMLHttpRequest();
  xhr.open('DELETE', file, false);
  xhr.setRequestHeader('Content-Type', 'text/turtle; charset=UTF-8');
  xhr.send(body);
}

function putFile(file, data) {
  xhr = new XMLHttpRequest();
  xhr.open('PUT', file, false);
  xhr.setRequestHeader('Content-Type', 'text/turtle; charset=UTF-8');
  xhr.send(data);
}

function postFile(file, data) {
  xhr = new XMLHttpRequest();
  xhr.open('POST', file, false);
  xhr.setRequestHeader('Content-Type', 'text/turtle; charset=UTF-8');
  xhr.send(data);
}

function remove(list) {
  var uris = localStorage.getItem('workspace');
  if (uris) {
    uris = JSON.parse(uris);
    for (i=0; i<uris.length; i++) {
      if (uris[i] == list) {
        uris.splice(i,1);
        localStorage.setItem('workspace', JSON.stringify(uris));
        location.reload();
      }
    }
  }
}

function adduri() {
  uri = $('#add').val();
  uris= localStorage.getItem('workspace');
  if (uris) {
    uris = JSON.parse(uris);
    uris.push(uri);
    localStorage.setItem('workspace', JSON.stringify(uris));
  } else {
    localStorage.setItem('workspace', JSON.stringify([uri]));
  }
  location.reload();
  return false;
}


function save(uri) {
  console.log('saving to ' + uri);
  humane.log('saving');

  // delete old file
  // todo: change this to clobber
  //deleteFile(uri);

  // init
  var str = '';

  // document
  str += '\n'+ '<> a <http://www.w3.org/2005/01/wf/flow#tracker> . ';
  str += '\n'+ '<> <http://www.w3.org/ns/adms#representationTechnique> <https://taskify.org/ns/0.2> . ';

  var todo = localStorage.todo;
  if (todo) todo = JSON.parse(todo);

  // todo
  if (todo) {
    // counter
    str += '\n'+ '<> <http://purl.org/ontology/co/core#count> '+ todo.inc +' . ';

    // items
    if (!todo.items) todo.items = [];
    for (var i=0; i<todo.items.length; i++) {
      var id = todo.items[i].id.indexOf('http') ? '#' + todo.items[i].id : todo.items[i].id;
      str += '\n'+ '<' + id + '> a <http://dig.csail.mit.edu/2010/issues/track#Task> .';
      str += '\n'+ '<' + id + '> <http://purl.org/dc/terms/description> "'+ escape(todo.items[i].text)  +'".';
      str += '\n'+ '<' + id + '> <http://www.w3.org/2002/12/cal/ical#completed> '+ todo.items[i].complete +'.';
      str += '\n'+ '<' + id + '> <https://taskify.org/ns/task#urgent> '+ todo.items[i].urgent +'.';
      str += '\n'+ '<' + id + '> <https://taskify.org/ns/task#important> '+ todo.items[i].important +'.';
      if (!todo.items[i].tags) todo.items[i].tags = [];
      for (var j=0; j<todo.items[i].tags.length; j++) {
        var obj = todo.items[i].tags[j].indexOf('http') ? '#' + todo.items[i].tags[j] : todo.items[i].tags[j];
        str += '\n'+ '<' + id + '> <http://commontag.org/ns#tagged> <'+ obj +'>.';
      }
    }

    // tags
    if (!todo.tags) todo.tags = [];
    for (var i=0; i<todo.tags.length; i++) {
      var id = todo.tags[i].id.indexOf('http') ? '#' + todo.tags[i].id :  todo.tags[i].id;
      str += '\n'+ '<' + id + '> a <http://commontag.org/ns#Tag> .';
      str += '\n'+ '<' + id + '> <http://commontag.org/ns#label> "'+ escape(todo.tags[i].name)  +'".';
    }

    // columns
    if (!todo.columns) todo.columns = [];
    for (var i=0; i<todo.columns.length; i++) {
      var id = todo.columns[i].id.indexOf('http') ? '#' + todo.columns[i].id : todo.columns[i].id;
      str += '\n'+ '<' + id + '> a <https://taskify.org/ns/task#Column> .';
      str += '\n'+ '<' + id + '> <https://taskify.org/ns/task#position> '+ i +' .';
      str += '\n'+ '<' + id + '> <http://purl.org/dc/terms/description> "'+ escape(todo.columns[i].name)  +'".';
      if (!todo.columns[i].items) todo.columns[i].items = [];
      for (var j=0; j<todo.columns[i].items.length; j++) {
        var obj = todo.columns[i].items[j].indexOf('http') ? '#' + todo.columns[i].items[j] : todo.columns[i].items[j];
        str += '\n'+ '<' + id + '> <https://taskify.org/ns/task#hasTask> <'+ obj +'>.';
      }
    }
  }

  // bookmarks
  tasktree = localStorage.tasktree;
  if (tasktree) tasktree = JSON.parse(tasktree);
  if (tasktree) {
    for (var i=0; i<tasktree.length; i++) {
      str += '\n <'+ tasktree[i]['@id']  +'> a <http://www.w3.org/2005/01/wf/flow#tracker> ; <http://purl.org/dc/terms/modified> "'+ tasktree[i]['modified']  +'" . ';
    }
  }

  //alert(str);
  putFile(uri, str);
  humane.log('saved');
}

function load(uri, version) {
  console.log('loading from ' + uri);
  humane.log('loading');
  version = 0.2;

  if (version == 0.2) {

    f.nowOrWhenFetched(uri.split('#')[0],undefined, function(ok, body) {







      var todo = {};
      var items = [];
      var columns = [{items: [], type: 'Column'},{ items: [], type: 'Column'},{items: [], type: 'Column'}];
      var inc = 0;
      var tasktree = [];

      console.log('loading');

      var tracker = g.any(undefined, RDF('type'), FLOW('tracker'));
      console.log(tracker);


      var count = g.any(tracker, CORE('count'), undefined).value;
      console.log(count);

      var representationTechnique = g.any(tracker, ADMS('representationTechnique'), undefined).value;
      console.log(representationTechnique);


      var cols = g.statementsMatching(undefined, RDF('type'), TASK('Column'));
      console.log(columns);

      for (var i=0; i<cols.length; i++) {
        var column = cols[i].subject;
        console.log(column);
        var position = g.any(cols[i].subject, TASK('position')).value;
        console.log(position);
        var description = g.any(column, DCT('description'), undefined);
        console.log('description');
        console.log(description.value);

        if (description) {
          columns[position]['name'] = unescape(description.value);
          columns[position]['type'] = 'Column';
          columns[position]['id'] = column.uri;
        }

        var hasTasks = g.statementsMatching(cols[i].subject, TASK('hasTask'));
        console.log(hasTasks);
        for(var j=0; j<hasTasks.length; j++) {
          var hasTask = hasTasks[j];
          console.log('hasRask');
          console.log(hasTask);
          columns[position].items.push(hasTask.object.value);
        }
      }

      var its = g.statementsMatching(undefined, RDF('type'), TRACK('Task'));
      console.log(its);

      for (var i=0; i<its.length; i++) {
        var it = its[i];
        var item = {};
        item['type'] = 'Item';
        item['id'] = it.subject.value;

        var description = g.any(it.subject, DCT('description'));
        console.log(description);

        var completed = g.any(it.subject, ICAL('completed'));
        console.log(completed);

        var urgent = g.any(it.subject, TASK('urgent'));
        console.log(urgent);

        var important = g.any(it.subject, TASK('important'));
        console.log(important);

        item['text'] = unescape(description.value);
        item['completed'] = completed.value;
        item['urgent'] = !!parseInt(urgent.value);
        item['important'] = !!parseInt(important.value);
        items.push(item);

      }


      // assign items to columns
      var col = 0;
      for (var i = 0; i<items.length; i++) {
        if (items.completed) continue;
        var orphan = true;
        for (var j = 0; j<columns.length; j++) {
          for (var k = 0; k<columns[j].items.length; k++) {
            if (items[i].id == columns[j].items[k]) orphan = false;
          }
        }
        if (orphan) {
          columns[col].items.push(items[i].id);
          col = (col + 1) % 3;
        }
      }


      todo['items'] = items;
      todo['columns'] = columns;
      todo['inc'] = inc;
      todo['tags'] = [];

      localStorage.setItem('todo', JSON.stringify(todo));
      if (tasktree) {
        localStorage.setItem('tasktree', JSON.stringify(tasktree));
      }

      //alert(JSON.stringify(todo));

      humane.log('loaded');
      window.location.href = location.protocol + '//' + document.domain + '/';


      /*
      var type = data[key1]['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'];
      // get type
      if (type) {
      type = type[0]['value'];
      if (type == 'http://www.w3.org/2005/01/wf/flow#tracker') {
      // get inc
      if (data[key1]['http://purl.org/ontology/co/core#count']) {
      inc = data[key1]['http://purl.org/ontology/co/core#count'][0]['value'];
    }

    // get version
    if (data[key1]['http://www.w3.org/ns/adms#representationTechnique']) {
    var version = data[key1]['http://www.w3.org/ns/adms#representationTechnique'][0]['value'];
  }

  // get modified
  if (data[key1]['http://purl.org/dc/terms/modified']) {
  tasktree.push({ '@id' : key1, 'modified' : data[key1]['http://purl.org/dc/terms/modified'][0]['value'] });
}


} else if (type == 'https://taskify.org/ns/task#Column') {
// populate column

// get position
if (data[key1]['https://taskify.org/ns/task#position']) {
var position = data[key1]['https://taskify.org/ns/task#position'][0]['value'];
}

// get description
var desc = data[key1]['http://purl.org/dc/terms/description'];
if (!desc) desc = data[key1]['http://www.w3.org/2005/01/wf/flow#description']
if (desc) {
columns[position]['name'] = unescape(desc[0]['value']);
columns[position]['type'] = 'Column';
columns[position]['id'] = key1;
}


// get items
if (data[key1]['https://taskify.org/ns/task#hasTask']) {
for(var i=0; i<data[key1]['https://taskify.org/ns/task#hasTask'].length; i++) {
columns[position].items.push(data[key1]['https://taskify.org/ns/task#hasTask'][i]['value']);
}
}


} else if (type == 'http://dig.csail.mit.edu/2010/issues/track#Task' || type == 'http://dig.csail.mit.edu/2010/issues/track#New') {
// create item
var item = {};
item['type'] = 'Item';
item['id'] = key1;

// get description
var title = data[key1]['http://purl.org/dc/elements/1.1/title'];
var desc = data[key1]['http://purl.org/dc/terms/description'];
if (!desc) desc = data[key1]['http://www.w3.org/2005/01/wf/flow#description']
if (desc) {
item['text'] = unescape(desc[0]['value']);
}
if (title) {
item['text'] = unescape(title[0]['value']) + '\n' + item['text'];
}

// get complete
if (data[key1]['http://www.w3.org/2002/12/cal/ical#completed']) {
item['complete'] = ( data[key1]['http://www.w3.org/2002/12/cal/ical#completed'][0]['value'] == 'true' );
}

// get important
if (data[key1]['https://taskify.org/ns/task#important']) {
item['important'] = ( data[key1]['https://taskify.org/ns/task#important'][0]['value'] == 'true' );
}

// get urgent
if (data[key1]['https://taskify.org/ns/task#urgent']) {
item['urgent'] = ( data[key1]['https://taskify.org/ns/task#urgent'][0]['value'] == 'true' );
}

items.push(item);

} else if (type == '<http://commontag.org/ns#Tag') {
}


}

// assign items to columns
var col = 0;
for (var i = 0; i<items.length; i++) {
if (items.completed) continue;
var orphan = true;
for (var j = 0; j<columns.length; j++) {
for (var k = 0; k<columns[j].items.length; k++) {
if (items[i].id == columns[j].items[k]) orphan = false;
}
}
if (orphan) {
columns[col].items.push(items[i].id);
col = (col + 1) % 3;
}
}


todo['items'] = items;
todo['columns'] = columns;
todo['inc'] = inc;
todo['tags'] = [];

localStorage.setItem('todo', JSON.stringify(todo));
if (tasktree) {
localStorage.setItem('tasktree', JSON.stringify(tasktree));
}

//alert(JSON.stringify(todo));

humane.log('loaded');
window.location.href = location.protocol + '//' + document.domain + '/';

*/






















});


}


}


function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
  return "";
  else
  return decodeURIComponent(results[1].replace(/\+/g, " "));
}


function saveSettings() {
  var workspace = $('#workspace').val();
  var webcreditsuri = $('#webcreditsuri').val();
  localStorage.setItem('workspace', JSON.stringify([workspace]));
  localStorage.setItem('webcredits', JSON.stringify({ 'webcreditsuri': [ webcreditsuri ] }));
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = location.protocol + '//' + document.domain + '/start';
}

function remove(list) {
  var tasks = localStorage.getItem('tasktree');
  if (tasks) {
    tasks = JSON.parse(tasks);
    for (i=0; i<tasks.length; i++) {
      if (tasks[i]['@id'] == list) {
        tasks.splice(i,1);
        localStorage.setItem('tasktree', JSON.stringify(tasks));
        location.reload();
      }
    }
  }
}

function up(uri) {
  tasks= localStorage.getItem('tasktree');
  if (tasks) {
    tasks = JSON.parse(tasks);
    for(var i=0; i<tasks.length; i++) {
      if (tasks[i]['@id'] == uri) {
        tasks[i]['modified'] = new Date().toISOString();
      }
    }
    localStorage.setItem('tasktree', JSON.stringify(tasks));
    location.reload();
  }
}


function saveBoards() {
  task = $('#boarduri').val();
  tasks= localStorage.getItem('tasktree');
  if (tasks) {
    tasks = JSON.parse(tasks);
    tasks.push({'@id': task, 'modified' : new Date().toISOString() });
    localStorage.setItem('tasktree', JSON.stringify(tasks));
  } else {
    localStorage.setItem('tasktree', JSON.stringify([{'@id': task, 'modified' : new Date().toISOString() }]));
  }
  location.reload();
  return false;
}
