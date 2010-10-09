/*
 * Copyright (c) 2010, BeeDesk, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of the <organization> nor the
 *   names of its contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

/**
 * DataSet is a generic model (as in Model/View/Control). It provides
 * a few common functionalities:
 * 
 * 1) CRUD method to access item in the set
 * 2) Events: added, removed, updated
 * 3) Finders methods
 * 4) interface for initialization
 *
 * @author: tyip AT beedesk DOT com
 */
function DataSet() {

  this.init = function() {};

  this.start = function() {};

  // CRUDB ([C]create, [R]read, [U]update, [D]remove, [B]browse and find)
  this.browse = function(fn, sumfn) {};

  this.find = function(filters) {};

  this.findOnce = function(filters) {};

  this.read = function(itemId) {};

  this.update = function(itemId, newState) {};

  this.create = function(newState) {};

  this.remove = function(itemId) {};

  this.bind = function(type, fn) {};

  this.unbind = function(type, fn) {};

}

/**
 * BareSet is a partial implementation of DataSet. And, is a component
 * used to build the full implementation (EntrySet).
 * 
 * @param conf
 * @returns {BareSet}
 *
 * @author: tyip AT beedesk DOT com
 */
function BareSet(conf) {
  var idcount    = 10000;
  var entries    = {};

  conf = $.extend({
    name: "BareSet",
    getId: function(entry) {
      idcount += 1;
      return idcount;
    },
    setId: function(entry) {
      entry.id = idcount;
      idcount += 1;
      return entry.id;
    },
    entryIn: function(id, entry) {
      return $.extend({}, entry);
    },
    entryOut: function(id, entry) {
      return $.extend({}, entry);
    },
    finder: function(entry, filters) {
      var result;
      if (!$.isFunction(filters)) {
        var matchAll = true;
        var matchSome = false;
        for (var key in filters) {
          if (entry === undefined) {
            // problematic
            matchAll = false;
            break;        
          } else if (filters[key] !== entry[key]) {
            matchAll = false;
            break;        
          }
          matchSome = true; // make sure filter is non-empty
        }
        result = matchSome && matchAll; 
      } else {
        result = filters(entry);
      }
      return result;
    }
  }, conf);
  
  this.getName = function() {
    return conf.name;
  };

  this.findOnce = function(filters) {
    var result;
    for (var id in entries) {
      var entry = entries[id];

      var matched = conf.finder(entry, filters);
      if (matched) {
        result = id;
        break;
      }
    }
    return result;
  };
  this.find = function(filters) {
    var result = [];
    for (var id in entries) {
      var entry = entries[id];

      var matched = conf.finder(entry, filters);
      if (matched) {
        result.push(id);
      }
    }
    return result;
  };
  this.browse = function(fn, sumfn) {
    var count = 0;
    var cont;
    for (var id in entries) {
      cont = fn(id, entries[id]); 
      if (cont === false)
        break;
    }
    if (!!sumfn && $.isFunction(sumfn)) {
      sumfn(count, cont);      
    }
    return count;
  };
  this.read = function(entryId) { // "read into"
    if (entryId === undefined || entryId === null) {
      console.error(conf.name + ".read: invalid (null) input.");
      return;
    }
    var result;
    var rawentry = entries[entryId];
    if (rawentry !== undefined && rawentry !== null) {
      result = conf.entryOut(entryId, rawentry);
      if (result === undefined || result === null) {
        console.error(conf.name + ".read() conversion problem: " + entryId + '  ' + uneval(conf.entryOut));
      }
    }
    return result;
  };
  this.create = function(entry) {
    if (entry === undefined || entry === null) {
      throw(conf.name + ".create: invalid (null) input.");
    }
    var id = conf.setId(entry);
    if (id === undefined || id === null) {
      throw('id problem: ' + uneval(entry) + ' conf.setId: ' + uneval(conf.setId)  );
    }
    var content = conf.entryIn(id, entry);
    if (content === undefined || content === null) {
      throw('failed to convert entry: ' + uneval(entry));
    }
    entries[id] = content;
    return id;
  };
  this.update = function(entryId, newentry) {
    if (entryId === undefined || entryId === null || newentry === undefined || newentry === null) {
      // should not happen
      console.error(conf.name + ".update: invalid (null) input.");
      return false;
    }
    var result;
    var rawentry = entries[entryId];
    if (rawentry !== undefined && rawentry !== null) {
      result = conf.entryOut(entryId, rawentry);
      var converted = conf.entryIn(entryId, newentry);
      if (converted === undefined || converted === null) {
        console.error('problem with conversion: ' + entryId);
      }
      entries[entryId] = converted;
    } else {
      console.error('updating non-exist id: ' + entryId);
    }
    return result;
  };
  this.remove = function(entryId) {
    if (entryId === undefined) {
      console.error(conf.name + ".remove: invalid (null) input.");
      return;
    }
    var result;
    var rawentry = entries[entryId];
    if (rawentry !== undefined) {
      delete entries[entryId];
      if (rawentry !== undefined) {
        result = conf.entryOut(entryId, rawentry);
      }
    }
    return result;
  };
  this.removeAll = function() {
    var count = 0;
    var all = this.browse(function(id, item) {
      count++;
      this.remove(item);
    });
    return count;
  };
};

/**
 * Binder is a component for building data event mechanism.
 * 
 * @param conf
 * @returns {BareSet}
 *
 * @author: tyip AT beedesk DOT com
 */
function Binder(conf) {
  var handlers = new BareSet(conf);
  
  this.bind = function(type, fn) {
    return handlers.create({type: type, fn: fn});
  };
  this.unbind = function(type, fn) {
    return handlers.remove({type: type, fn: fn});
  };
  this.trigger = function(type, event) {
    var count = 0;
    var contin; // stop propagation

    var ids = handlers.find({type: type});
    for (var j=0, len=ids.length; j < len; j++) {
      var handler = handlers.read(ids[j]);
      if (handler === undefined) {
        console.error(conf.name + '.handlers:' + uneval(handlers));
      }
      count++;
      contin = handler.fn(event);
      if (contin === false) {
        break; 
      }
    }
    if (contin !== false) {
      ids = handlers.find({type: '*'});
      for (var j=0, len=ids.length; j < len; j++) {
        var handler = handlers.read(ids[j]);
        if (handler === undefined) {
          console.error(conf.name + '.handlers:' + uneval(handlers));
        }
        count++;
        contin = handler.fn(event);
        if (contin === false) {
          break;
        }
      }
    }
    return count;
  };
  this.getName = function() {
    return conf.name;
  };
};

/**
 * EntrySet is a simple and full implementation of DataSet.
 * 
 * By default, it use BareSet as the underneath components to 
 * store the actual entry. It can be overriden by conf.storeset.
 * 
 * @see DataSet
 */
function EntrySet(conf) {
  var started     = false;
  var initialized = false;

  var myconf = $.extend({
    init: function() {
    },
    start: function() {
    },
    storeset: new BareSet($.extend({name: conf.name + ':entry-inner'}, conf)),
    isEventEnabled: function() {
      return true;
    }
  }, conf);

  var entries = new DataSet();
  $.extend(entries, new Binder({name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')}));

  var storeset = myconf.storeset;

  entries.init = function() {
    myconf.init();
    initialized = true;
  };
  entries.start = function() {
    myconf.start();
    var count = storeset.browse(function(id, item) {
      entries.trigger('added', {entryId: id, entry: item});
    });
    if (count === 0) {
      entries.trigger('cut', {});
    }
    started = true;
  };
  entries.getName = function() {
    return myconf.name;
  };
  entries.read = function(entryId) {
    var result;
    result = storeset.read(entryId);
    return result;
  };
  entries.create = function(entry) {
    var result;
    result = storeset.create(entry);

    if (myconf.isEventEnabled()) {
      entries.trigger('added', {entryId: result, entry: entry});
    }
    return result;
  };
  entries.update = function(entryId, newentry) {
    var result;
    if (newentry !== undefined && newentry !== null) {
      result = storeset.update(entryId, newentry);
    } else {
      newentry = storeset.read(entryId);
    }

    if (myconf.isEventEnabled()) {
      var event = {entryId: entryId, entry: newentry, oldentry: result};
      if (myconf.useRemovedAdded === true) {
        entries.trigger('removed', event);
        entries.trigger('added', event);
      } else {
        entries.trigger('updated', event);
      }
    }
    return result;
  };
  entries.remove = function(entryId) {
    var result;
    result = storeset.remove(entryId);

    if (result !== undefined) {
      if (myconf.isEventEnabled()) {
        entries.trigger('removed', {entryId: entryId, oldentry: result});
      }
    }
    return result;
  };
  entries.browse = function(fn, filters) {
    return storeset.browse(fn, filters);
  };
  entries.findOnce = function(filters) {
    var result = storeset.findOnce(filters);
    return result;
  };
  entries.find = function(filters) {
    var result = storeset.find(filters);
    return result;
  };
  entries.removeAll = function() {
    var result = storeset.removeAll();
    return result;
  };
  return entries;
};

/**
 * CachedDataSet is a full implementation of DataSet that provides
 * caching.
 * 
 * The storeset is the authoritative that can be overridden. An Ajax source
 * might be such a storeset. The CachedDataSet cache all entries from 
 * storeset into a BareSet.
 * 
 * @see DataSet
 *
 * Author: tyip AT beedesk DOT com
 */
function CachedDataSet(conf) {

  var myconf = $.extend({ 
    tokens: function(item) {
      return [item.id];
    },
    normalize: function(data) {
      return data;
    },
    storeset: new BareSet(conf)
  }, conf);

  var storeset = myconf.storeset;

  var cacheset = new BareSet($.extend({name: conf.name + ':cache'}, conf));

  var entries = new EntrySet(myconf);

  entries.getName = function() {
    return conf.name;
  };
  
  var oldinit = entries.init;
  entries.init = function() {
    oldinit();
  };

  var oldstart = entries.start;
  entries.start = function() {
    var count = storeset.browse(function(id, item) {
      cacheset.create(item);
      entries.trigger('added', {entryId: id, entry: item});
    });
    return true;
  };

  entries.browse = function(fn, filter) {
    var count = 0;
    var cont;
    cont = cacheset.browse(fn, filter);
    if (cont !== false) {
      count = storeset.browse(function(id, item) {
        var cached = storeset.read(id);
        if (cached === undefined || cached !== null) {
          cacheset.create(item);
          entries.trigger('added', {entryId: id, entry: item});
        }
        cont = fn(id, item);
        return cont;
      }, filter);
    }
    return count;
  };

  entries.read = function(itemId) {
    var entry;
    if (itemId !== undefined && itemId !== null) { 
      entry = cacheset.read(itemId);
      if (entry === undefined || entry === null) {
        try {
          entry = storeset.read(itemId);
          if (entry !== undefined && entry !== null) {
            cacheset.create(entry);
          } else {
            console.warn('not found: ' + itemId);
          }
        } catch (e) {
          console.error(uneval(e));
        }
      }
    }
    return entry;
  };

  entries.update = function(itemId, newState) {
    var oldState = cacheset.read(itemId);
    storeset.update(itemId, newState, oldState);
    cacheset.update(itemId, newState, oldState);
  };

  entries.create = function(newState) {
    storeset.create(newState);
    cacheset.create(newState);
  };

  entries.remove = function(itemId) {
    var oldState = cacheset.read(itemId);
    storeset.remove(itemId, oldState);
    cacheset.remove(itemId, oldState);
  };

  entries.findOnce = function(filters) {
    //@TODO should check storeset also
    return cacheset.findOnce(filters);
  };

  entries.find = function(filters) {
    //@TODO should check storeset also
    return cacheset.find(filters);
  };

  // this object
  entries.getInnerSet = function() {
    return cacheset;
  };

  // closure return
  return entries;
}

/**
 * @author: tyip AT beedesk DOT com
 */
function RESTfulDataSet(conf) {
  // error check
  if (conf.baseurl === undefined) {
    console.error('Parameter "baseurl" is not specified.'); // fatal error
  }
  if (conf.entitytype=== undefined) {
    console.error('Parameter "entitytype" is not specified.'); // fatal error
  }

  var url = conf.baseurl + '/l/' + conf.entitytype;

  var errorHandler = new Binder({name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')});

  var processError = function(request, textStatus, errorThrown) {
    errorHandler.trigger(request.status.toString(), {request: request});
    $('#error-request').text("url: '" + url);
    $('#error-status').text("request.status: '" + request.status + "' status: '" + textStatus + "'");
    $('#error-console').html(request.responseText);
  };

  var ajaxBrowse = function(fn, filters) {
    $.ajax({
      type: 'GET',
      url: conf.baseurl + '/l/' + conf.entitytype, 
      dataType: 'json',
      success: function(raw) {
        var data = conf.normalize(raw);        
        var list = data.items;
        for (var j=0, len=list.length; j<len; j++) {
          var entry = list[j];
          var id = conf.getId(entry);
          try {
            fn(id, entry);
          } catch(e) {
            console.error('exception invoke: ' + e);
          }
        }
      },
      error: processError,
      data: {},
      async: true
    });
  };

  var ajaxcommon = function(options) {
    var ajaxoptions = $.extend({
        success: function(data) {
          $.extend(ajaxoptions.entity, data.entity);
          $.extend(ajaxoptions.oldentity, data.oldentity);
        },
        error: processError,
        dataType: 'json',
        async: false,
        entity: {},
        oldentity: {},
        data: {}
      }, options);
    
    if (ajaxoptions.entity != undefined) {
      delete ajaxoptions.entity;
    }
    if (ajaxoptions.oldentity != undefined) {
      delete ajaxoptions.oldentity;
    }
    $.ajax(ajaxoptions);
  };

  var storeset = new function() {
    this.create = function(entity) {
      var url = conf.baseurl + '/e/' + conf.entitytype + '/';
      ajaxcommon({type: 'PUT', url: url, data: $.toJSON({entity: entity}), entity: entity});
    };
  
    this.read = function(id, entity) {
      url: conf.baseurl + '/e/' + conf.entitytype + '/' + id, 
      ajaxcommon({type: 'GET', url: url, data: $.toJSON({entity:entity}), entity: entity});
    };
  
    this.update = function(id, entity, oldentity) {
      url: conf.baseurl + '/e/' + conf.entitytype + '/' + id, 
      ajaxcommon({type: 'POST', url: url, data: $.toJSON({entity:entity, oldentity: oldentity})});
    };
  
    this.remove = function(id, entity) {
      url: conf.baseurl + '/e/' + conf.entitytype + '/' + id, 
      ajaxcommon({type: 'DELETE', url: url, data: $.toJSON({oldentity: entity})});
    };

    this.browse = function(fn, filter) {
      return ajaxBrowse(fn, filter);
    };
  };

  var entries = new CachedDataSet($.extend(conf, {storeset: storeset}));

  var oldinit = entries.init;
  entries.init = function() {
    oldinit();
  };
  
  var oldstart = entries.start;
  entries.start = function() {
    oldstart();
  };

  entries.getErrorHandler = function() {
    return errorHandler;
  };

  return entries;
}
