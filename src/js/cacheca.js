/*
 * Copyright (c) 2010, BeeDesk, Inc., unless otherwise noted.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BeeDesk, Inc. AND ITS LICENSORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

/**
 * BareSet is a generic model (as in Model/View/Control). It provides
 * a few common functionalities:
 *
 * 1) CRUD method to access item in the set
 * 2) Finders methods
 * 3) interface for initialization / finalization
 *
 * @author: tyip AT beedesk DOT com
 */
function BareSet(conf) {

  this.init = function() {};

  this.start = function() {};

  // CRUDB ([C]create, [R]read, [U]update, [D]remove, [B]browse and find)
  this.browse = function(fn, sumfn) {};

  this.find = function(filters) {};

  this.findOnce = function(filters) {};

  this.read = function(itemId, fn) {};

  this.update = function(itemId, newState) {};

  this.create = function(newState) {};

  this.remove = function(itemId) {};

  this.name = (conf && conf.name) || "Generic DataSet";

}

/**
 * Binder is a dispatch multiplexer.
 *
 * @param conf
 * @author: tyip AT beedesk DOT com
 */
function Binder(conf) {

  this.bind = function(type, fn) {};

  this.unbind = function(type, fn) {};

  this.trigger = function(type, event) {};
}

/**
 * DataSet is a BareSet that provides events.
 *
 * @author: tyip AT beedesk DOT com
 */
function DataSet(conf) {

  var instance = $.extend(new BareSet(conf), new Binder(conf));

  return instance;
}

/**
 * SimpleBareSet is an implementation of BareSet. It keeps all entry
 * in an associate hash object.
 *
 * @author: tyip AT beedesk DOT com
 */
function SimpleBareSet(conf) {
  var instance = this;

  conf = $.extend({
    name: "SimpleBareSet",
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

  var EMPTY_FN = function() {};
  var DEFAULT_ERR = function(msg) { console.error(msg); };

  var idcount    = 10000;
  var entries    = {};

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

  this.browse = function(fn, sumfn, errFn) {
    var count = 0;
    var cont;
    for (var id in entries) {
      count++;
      cont = fn(id, entries[id]);
      if (cont === false)
        break;
    }
    if (!!sumfn && $.isFunction(sumfn)) {
      sumfn(count, cont);
    }
    return count;
  };

  this.read = function(entryId, fn, errFn) { // "read into"
    Arguments.assertNonNull(entryId, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = errFn || DEFAULT_ERR;

    var result;
    var rawentry = entries[entryId];
    if (!!rawentry) {
      result = conf.entryOut(entryId, rawentry);
      if (!!result) {
        fn(entryId, result);
      } else {
        errFn(entryId, conf.name + ".read() conversion problem: " + entryId + '  ' + uneval(conf.entryOut));
      }
    } else {
      errFn(entryId, conf.name + ".read() cannot find item: " + entryId);
    }
    return result;
  };

  this.create = function(entry, fn, errFn) {
    Arguments.assertNonNull(entry, conf.name + ".create: expect argument 'entry'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var id = conf.setId(entry);
    if (Arguments.isNonNull(id)) {
      var content = conf.entryIn(id, entry);
      if (Arguments.isNonNull(content)) {
        entries[id] = content;
        fn(id, entry);
      } else {
        errFn('failed to convert entry: ' + uneval(entry));
      }
    } else {
      errFn('id problem: ' + uneval(entry) + ' conf.setId: ' + uneval(conf.setId)  );
    }
  };

  this.update = function(entryId, newentry, oldentry, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(newentry, conf.name + ".update: expect argument 'newentry'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var rawentry = entries[entryId];
    if (Arguments.isNonNull(rawentry)) {
      result = conf.entryOut(entryId, rawentry);
      var converted = conf.entryIn(entryId, newentry);
      if (Arguments.isNonNull(converted)) {
        entries[entryId] = converted;
        fn(entryId, newentry);
      } else {
        errFn(id, 'problem with conversion: ' + entryId);
      }
    } else {
      errFn('updating non-exist id: ' + entryId);
    }
  };

  this.remove = function(entryId, fn, errFn) {
    // @TODO add back optional entity for dirty-check
    Arguments.assertNonNull(entryId, conf.name + ".remove: invalid (null) input.");
    Arguments.warnNonNull(entryId, conf.name + ".remove: invalid (null) input.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var rawentry = entries[entryId];
    if (Arguments.isNonNull(rawentry)) {
      delete entries[entryId];
      result = conf.entryOut(entryId, rawentry);
      fn(entryId, result);
    } else {
      errFn(entryId, 'cannot find item: ' + entryId);
    }
  };

  this.removeAll = function() {
    var count = 0;
    var all = this.browse(function(id, item) {
      count++;
      instance.remove(id);
    });
    return count;
  };
};

/**
 * SimpleBinder is a simple implementation of Binder which a dispatch multiplexer.
 *
 * @param conf
 * @author: tyip AT beedesk DOT com
 */
function SimpleBinder(conf) {
  var EMPTY_FN = function() {};

  var handlers = new SimpleBareSet(conf);
  this.bind = function(type, fn) {
    return handlers.create({type: type, fn: fn}, EMPTY_FN);
  };
  this.unbind = function(type, fn) {
    return handlers.remove({type: type, fn: fn}, EMPTY_FN);
  };
  this.trigger = function(type, event) {
    var count = 0;
    var contin; // stop propagation

    var ids = handlers.find({type: type});
    for (var j=0, len=ids.length; j < len; j++) {
      handlers.read(ids[j], function(id, handler) {
        count++;
        contin = handler.fn(event);
        if (contin === false) {
          break;
        }
      }, function(id, msg) {
        console.error(conf.name + '.handlers:' + uneval(handlers));
      });
    }
    if (contin !== false) {
      ids = handlers.find({type: '*'});
      for (var j=0, len=ids.length; j < len; j++) {
        handlers.read(ids[j], function(id, handler) {
          count++;
          contin = handler.fn(event);
          if (contin === false) {
            break;
          }
        }, function(id) {
          console.error(conf.name + '.handlers:' + uneval(handlers));
        });
      }
    }
    return count;
  };
};

/**
 * EntrySet is a simple implementation of DataSet.
 *
 * By default, it use SimpleBareSet as the underneath components to
 * store the actual entry. It can be overriden by conf.innerset.
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
    isEventEnabled: function() {
      return true;
    }
  }, conf);

  var EMPTY_FN = function() {};
  var DEFAULT_ERR = function(msg) { console.error(msg); };

  var entries = new DataSet(conf);
  $.extend(entries, new SimpleBinder({name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')}));

  var innerset = myconf.innerset || new BareSet($.extend({name: conf.name + ':entry-inner'}, conf));

  entries.init = function() {
    myconf.init();
    if (!!innerset.init) {
      innerset.init();
    }
    initialized = true;
  };

  entries.start = function() {
    myconf.start();
    if (!!innerset.start) {
      innerset.start();
    }
    started = true;
  };

  entries.read = function(entryId, fn, errFn) {
    Arguments.assertNonNull(entryId, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = errFn || DEFAULT_ERR;

    innerset.read(entryId, fn, errFn);
  };

  entries.create = function(entry, fn, errFn) {
    Arguments.assertNonNull(entry, conf.name + ".create: expect argument 'entry'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    innerset.create(entry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        entries.trigger('added', {entryId: id, entry: item});
      }
    }, errFn);
  };

  entries.update = function(entryId, newentry, oldentry, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(newentry, conf.name + ".update: expect argument 'newentry'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    innerset.update(entryId, newentry, oldentry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        var event = {entryId: entryId, entry: newentry};
        if (myconf.useRemovedAdded === true) {
          entries.trigger('removed', event);
          entries.trigger('added', event);
        } else {
          entries.trigger('updated', event);
        }
      }
    }, errFn);
  };

  entries.remove = function(entryId, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(entryId, conf.name + '.remove: expect entryId.');
    Arguments.warnNonNull(fn, conf.name + '.remove: expect fn.');

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    innerset.remove(entryId, oldentry, function(id, item) {
      fn(id, item);
      if (myconf.isEventEnabled()) {
        entries.trigger('removed', {entryId: id, oldentry: item});
      }
    });
  };

  entries.browse = function(fn, filters) {
    innerset.browse(fn, filters);
  };

  entries.findOnce = function(filters) {
    var result = innerset.findOnce(filters);
    return result;
  };

  entries.find = function(filters) {
    var result = innerset.find(filters);
    return result;
  };

  entries.removeAll = function() {
    var result = innerset.removeAll();
    return result;
  };

  return entries;
};

/**
 * CachedDataSet is an simple implementation of DateSet that provides
 * caching.
 *
 * The conf.storeset is mandatory. An Ajax source might be such a storeset.
 * It is the authoritative set.
 *
 * The conf.cacheset is an SimpleBareSet by default. It can be
 * overridden.
 *
 * The CachedBareSet cache all entries from storeset into an cacheset.
 *
 * @see DataSet
 * Author: tyip AT beedesk DOT com
 */
function CachedDataSet(conf) {

  var myconf = $.extend({
    tokens: function(item) {
      return [item.id];
    },
    normalize: function(data) {
      return data;
    }
  }, conf);

  Arguments.assertNonNullString(name, "[CachedBareSet] " + "Conf 'name' must be defined.");
  Arguments.assertNonNull(myconf.storeset, "[model:" + myconf.name + "] " + "Conf 'storeset' must be defined.");
  Arguments.warnNonNull(myconf.cacheset, "[model:" + myconf.name + "] " + "Default 'in-meory' cache is used.");

  var EMPTY_FN = function() {};
  var DEFAULT_ERR = function(msg) { console.error(msg); };

  var storeset = myconf.storeset;
  var cacheset = myconf.cacheset || new BareSet($.extend({name: myconf.name + ':cache'}, conf));

  var innerset = new DataSet({name: myconf.name + ':cache-wrapper'});

  var fullset = new EntrySet($.extend({
    name: conf.name + ':cachedstore',
    innerset: innerset
  }, conf));

  storeset.bind('added', function(event) {
    cacheset.read(event.entryId, function() {
      console.warn('[cacheset merge] item added to storeset is already exists the cache.')
    }, function(id, item) {
      storeset.read(id, function(id, item) {
        cacheset.create(item, function(id, item) {
          fullset.trigger('added', {entryId: id, entry: item});
        });
      });
    });
  });
  storeset.bind('removed', function(event) {
    cacheset.read(event.entryId, function(id, item) {
      cacheset.remove(id, function(id, item) {
        fullset.trigger('removed', {entryId: id, entry: item});
      });
    }, function(id) {
      console.warn('[cacheset merge] item removed from storeset cannot be found. id: ' + id);
    });
  });
  storeset.bind('updated', function(event) {
    storeset.read(id, function(id, item) {
      cacheset.read(event.entryId, function(id, item) {
        cacheset.update(item, function(id, item) {
          fullset.trigger('update', {entryId: id, entry: item});
        });
      }, function(id) {
        cacheset.create(item, function(id, item) {
          fullset.trigger('added', {entryId: id, entry: item});
        }, function(id) {
          console.warn('[cacheset merge] update item cannot be added or updated. id: ' + id);
        });
      });
    }, function(id) {
      console.warn('[cacheset merge] update item to storeset is deleted. id: ' + id);
    });
  });

  var oldinit = innerset.init;
  innerset.init = function() {
    if (!!oldinit) {
      oldinit();
    }
    if (!!cacheset.init) {
      cacheset.init();
    }
    if (!!storeset.init) {
      storeset.init();
    }
  };

  var oldstart = innerset.start;
  innerset.start = function() {
    if (!!oldstart) {
      oldstart();
    }
    if (!!cacheset.start) {
      cacheset.start();
    }
    cacheset.browse(function(id, item) {
      fullset.trigger('added', {entryId: id, entry: item});
    });
    if (!!storeset.start) {
      storeset.start();
    }

    var merge = function(since) {
      console.log('merge() called');
      storeset.browse(function(id, item) { // this query have all item modified since
        cacheset.read(id, function() {}, function(id) { // make sure cache does *not* have it.
          storeset.read(id, function(id, item) {
            console.log('[read from pf] id: ' + id + '--' + uneval(item));
            cacheset.create(item, function(id, item) { // create item
              fullset.trigger('added', {entryId: id, entry: item});
            });
          });
        });
      }, {namedquery: 'modified-since', params: [since]});
    };

    // We need localStorage to keep the bookmark for this entity
    // storage will obtain a list, and merge with cacheset
    // storage will receive event, and merge with cacheset
    cacheset.browse(function(id, item) { // this query get last-modified time
      console.log('checking modified since: [' + item.modified + ']' + ' typeof: ' + typeof(item.modified));
      var lastmodified = item.modified;
      if (!Arguments.isNonNullString(lastmodified)) {
        lastmodified = Dates.toISODate(new Date(0));
      }
      var date = Dates.fromISODate(lastmodified);

      console.log('parsed: ' + date.toISOString());
      console.log('minus: ' + Dates.toISODate(date.add({hours: -1})));
      merge(Dates.toISODate(date.add({hours: -1})));
      return false; // we only need one item
    }, function(count) {
      if (count >= 0) {
        merge(Dates.toISODate(new Date(0)));
      }
    }, {namedquery: 'last-modified'});
    return true;
  };

  innerset.browse = function(fn, filter) {
    var count = 0;
    var cont;
    cont = cacheset.browse(fn, filter);
    if (cont !== false) {
      count = storeset.browse(function(id, item) {
        cacheset.read(id, function() {}, function(id) {
          innerset.read(id, fn);
        });
        return cont;
      }, filter);
    }
    return count;
  };

  innerset.read = function(itemId, fn, errFn) {
    Arguments.assertNonNull(itemId, conf.name + '.read: expect itemid.');
    Arguments.assertNonNull(fn, conf.name + '.read: expect fn.');

    errFn = errFn || DEFAULT_ERR;

    cacheset.read(itemId, fn, function(id) {
      try {
        entry = storeset.read(itemId, function(id, item) {
          cacheset.create(item, function(id, item) {
            //innerset.trigger('added', {entryId: id, entry: item});
            fn(id, item);
          });
        });
      } catch (e) {
        console.error(uneval(e));
      }
    }, function(id) {
      errFn(id);
    });
  };

  innerset.update = function(itemId, newentry, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(itemId, conf.name + '.update: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.updated: expect fn.');

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var oldState = cacheset.read(itemId);
    storenewentryte(itemId, newentry, oldentry, function(id, newentry, oldentry) {
      cachenewentryte(itemId, newentry, oldentry, fn, errFn);
    }, errFn);
  };

  innerset.create = function(newState, fn, errFn) {
    Arguments.assertNonNull(newState, conf.name + '.create: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.create: expect fn.');

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    storeset.create(newState, function(id, entry) {
      cacheset.create(newState, function(id, entry) {
        //innerset.trigger('added', {entryId: id, entry: entry});
        fn(id, entry);
      }, function(id, error) {
        errFn(id, 'cached cacheset error: ' + id + ' .. ' + error);
      });
    }, function(id, error) {
      errFn(id, 'cached cacheset error: ' + id + ' .. ' + error);
    });
  };

  innerset.remove = function(itemId, oldentry, fn, errFn) {
    // adjust argument for optional 'oldentry'
    if (Arguments.isNonNull(oldentry) && $.isFunction(oldentry)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentry;
      oldentry = undefined;
    }

    Arguments.assertNonNull(itemId, conf.name + '.remove: expect itemid.');
    Arguments.warnNonNull(fn, conf.name + '.remove: expect fn.');

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    storeset.remove(itemId, oldentry, function(itemId, item) {
      cacheset.remove(itemId, oldentry, fn, errFn);
    }, errFn);
  };

  innerset.findOnce = function(filters) {
    //@TODO should check storeset also
    return cacheset.findOnce(filters);
  };

  innerset.find = function(filters) {
    //@TODO should check storeset also
    return cacheset.find(filters);
  };

  innerset.getInnerSet = function() {
    return cacheset;
  };

  return fullset;
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

  var url = conf.baseurl + '/' + conf.entitytype;

  var errorHandler = new SimpleBinder({name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')});

  var processError = function(request, textStatus, errorThrown) {
    errorHandler.trigger(request.status.toString(), {request: request});
    $('#error-request').text("url: '" + url);
    $('#error-status').text("request.status: '" + request.status + "' status: '" + textStatus + "'");
    $('#error-console').html(request.responseText);
    console.error("url: '" + url);
    console.error("request.status: '" + request.status + "' status: '" + textStatus + "'");
    console.error("text: " + request.responseText);
  };

  var normalize = conf.normalize || function(raw) { return raw; };

  var itemize = conf.itemize || function(fn, item) {
    fn(item.id, item);
  };

  var EMPTY_FN = function() {};
  var DEFAULT_ERR = function(msg) { console.error(msg); };

  var ajaxBrowse = function(fn, filters) {
    if (!fn) {
      console.error('Expect fn parameter.');
      throw 'Expect fn parameter.';
    }
    var searchString = HashSearch.getSearchString(filters) || '';
    $.ajax({
      type: 'GET',
      url: conf.baseurl + '/' + conf.entitytype + searchString,
      dataType: 'json',
      success: function(raw) {
        var data = normalize(raw);
        var list = data.items;
        for (var j=0, len=list.length; j<len; j++) {
          try {
            itemize(fn, list[j]);
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

  var ajaxcommon = function(options, fn, err) {
    var ajaxoptions = $.extend({
        success: function(data) {
          $.extend(ajaxoptions.entity, data.entity);
          $.extend(ajaxoptions.oldentity, data.oldentity);
          fn(data);
        },
        error: function(request, textStatus, errorThrown) {
          processError(request, textStatus, errorThrown);
          err(textStatus);
        },
        dataType: 'json',
        async: true,
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

  this.read = function(id, fn, errFn) {
    Arguments.assertNonNull(entryId, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = errFn || DEFAULT_ERR;

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var fn = function(data) {
      // @TODO
    };
    ajaxcommon({type: 'GET', url: url, data: $.toJSON({}), entity: {}}, fn, errFn);
  };

  this.create = function(entity, fn, errFn) {
    Arguments.assertNonNull(entity, conf.name + ".create: expect argument 'entity'.");
    Arguments.warnNonNull(fn, conf.name + ".create: expect argument 'fn'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var url = conf.baseurl + '/' + conf.entitytype + '/';
    var fn = function(data) {
    };
    ajaxcommon({type: 'PUT', url: url, data: $.toJSON({entity: entity}), entity: entity}, fn, errFn);
  };

  this.update = function(id, entity, oldentity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(oldentity) && $.isFunction(oldentity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = oldentity;
      oldentity = undefined;
    }

    Arguments.assertNonNull(id, conf.name + ".update: expect argument 'entryId'.");
    Arguments.assertNonNull(entity, conf.name + ".update: expect argument 'newentry'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    ajaxcommon({type: 'POST', url: url, data: $.toJSON({entity:entity, oldentity: oldentity})}, fn, errFn);
  };

  this.remove = function(id, fn, errFn) {
    // @TODO add back optional entity for dirty-check
    Arguments.assertNonNull(id, conf.name + ".remove: invalid (null) input.");
    Arguments.warnNonNull(id, conf.name + ".remove: invalid (null) input.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    var url = conf.baseurl + '/' + conf.entitytype + '/' + id;
    var fn = function(data) {

    };
    ajaxcommon({type: 'DELETE', url: url, data: $.toJSON({oldentity: entity})}, fn, errFn);
  };

  this.browse = function(fn, filter) {
    return ajaxBrowse(fn, filter);
  };

  var entries = $.extend(this, new SimpleBinder({name: 'pageforest-binder'}));

  entries.getErrorHandler = function() {
    return errorHandler;
  };

  return entries;
} // function RESTfulDataSet()

function AjaxDataSet(conf) {

  var innerset = new BareSet($.extend({name: conf.name + ':ajax-inner'}, conf));
  var myconf = $.extend({
    tokens: function(item) {
      return [item.id];
    },
    normalize: function(data) {
      return data;
    },
    storeset: innerset
  }, conf);

  var entries = new EntrySet(myconf);

  var oldinit = entries.init;
  entries.init = function() {
    oldinit();
  };

  var oldstart = entries.start;
  entries.start = function() {
    $.ajax({
      type: 'GET',
      url: myconf.url,
      dataType: 'json',
      success: function(data) {
        var raw = myconf.normalize(data);

        var list = raw.items;
        for (var j=0, len=list.length; j<len; j++) {
          var entry = list[j];
          innerset.create(entry);
          entries.trigger('added', {entryId: entry.id, entry: entry});
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        console.error("ajax error '" + XMLHttpRequest.status + "' ajax error '" + " url '" + myconf.url + "'. " + textStatus);
      },
      data: {},
      async: false
    });
    oldstart();
  };

  // error check
  if (myconf.url === undefined) {
    console.error('Url is not specified.'); // fatal error
  }
  return entries;
}

function FilteredEntries(conf) {
  // @tyip: currently, it ignore what has already in upstream.
  // so, it is used in case where the Filtered is binded to
  // the unfilitered in the beginning.

  if (conf.upstream === undefined || conf.upstream === null) {
    console.error('expect upstream to be set.');
  }
  if (conf.match === null) {
    console.error('expect match fn to be set.');
  }

  var entries = new BareSet(conf);

  var self = new SimpleBinder({name: ((myconf? myconf.name? myconf.name + '.' :'':'') + 'event-handler')});

  var myconf = $.extend({
    entryIn: function(id, entry) {
      return id;
    },
    entryOut: function(id, entry) {
      var result;
      if (entry !== undefined && entry != null) {
        result = conf.upstream.read(id);
      } else {
        result = {id: id};
      }
      return result;
    },
    match: function(entry) {
      return true;
    },
    useRemovedAdded: false
  }, conf);

  var upstream = myconf.upstream;
  upstream.bind('added', function(event) {
    if (myconf.match(event.entry)) {
      entries.create(event.entry);

      self.trigger('added', event);
    }
  });
  upstream.bind('removed', function(event) {
    var existed = entries.read(event.entryId);
    if (existed !== undefined) {
      entries.remove(event.entryId);

      self.trigger('removed', event);
    }
  });
  upstream.bind('updated', function(event) {
    var existed = entries.read(event.entryId);
    if (existed !== undefined) {
      entries.update(event.entryId, event.entry);

      if (myconf.useRemovedAdded === true) {
        self.trigger('removed', event);
        self.trigger('added', event);
      } else {
        self.trigger('updated', event);
      }
    }
  });
  self.getName = function() {
    return myconf.name;
  };
  self.read = function(entryId) { // "read into"
    var result;
    result = upstream.read(entryId);
    return result;
  };
  self.create = function(entry) {
    var result;
    result = upstream.create(entry);
    return result;
  };
  self.update = function(entryId, newentry) {
    var result;
    result = upstream.update(entryId, newentry);
    return result;
  };
  self.remove = function(entryId) {
    var result;
    result = upstream.remove(entryId);
    return result;
  };
  self.removeAll = function() {
    var count;
    var selection = conf.upstream.find(conf.match);
    for (var i=0, len=selection.length; i < len; i++) {
      count++;
      var result = upstream.remove(selection[i]);
    }
    return count;
  };
  self.browse = function(fn, filters) {
    return entries.browse(fn, filters);
  };
  self.findOnce = function(filters) {
    var result = entries.findOnce(filters);
    return result;
  };
  self.find = function(filters) {
    var result = entries.find(filters);
    return result;
  };
  self.refresh = function() {
    var existing = [];
    entries.browse(Arrays.collect(existing));
    var selection = conf.upstream.find(conf.match).sort();
    var result = Arrays.intersect(existing, selection, true);
    //console.error('left: ' + uneval(result.left) + ' middle: ' + uneval(result.middle)+ ' right: ' + uneval(result.right));
    for (var i=0, len=result.left.length; i < len; i++) {
      var id = result.left[i];
      var entry = conf.upstream.read(id);
      entries.remove(id);
      this.trigger('removed', {entryId: id, entry: entry});
    }
    result.right.reverse();
    for (var i=0, len=result.right.length; i < len; i++) {
      var id = result.right[i];
      var entry = conf.upstream.read(id);
      entries.create(entry);
      this.trigger('added', {entryId: id, entry: entry});
    }
  };

  return self;
}

function SelectedEntries(conf) {

  var selected;
  var filtered = {};

  if (conf.upstream === undefined || conf.upstream === null) {
    console.error('expect upstream to be set.');
  }
  if (conf.match !== undefined) {
    console.error('match fn will be overriden.');
  }

  var entries = new FilteredEntries($.extend(conf, {
    match: function(entry) {
      var result = false;
      if (selected !== undefined && selected !== null) {
        if (entry.id === selected) {
          result = true;
        } else {
          var contained = conf.upstream.find({container: selected});
          for (var j=0, len=contained.length; j<len; j++) {
            if (contained[j] === entry.id) {
              result = true;
              break;
            }
          }

          if (!result) {
            var selectedEntry = conf.upstream.read(selected);
            var children = selectedEntry.children;
            for (var child in children) {
              if (child === entry.id) {
                result = true;
                break;
              }
            }
          }
        }
      }
      return result;
    }
  }));
  entries.setSelected = function(id) {
    selected = id;
    entries.refresh();
  };
  entries.getSelected = function() {
    return selected;
  };

  return entries;
};

function DatabaseDesc(conf) {
  conf = $.extend(conf, {
    version: "0.1",
    desc: "My HTML5 DB",
    maxsize: 5000000
  });

  // error check
  if (conf.name === undefined) {
    throw('Parameter for database "name" is not specified.'); // fatal error
  }

  var db = null;
  conf.open = function() {
    try {
      if (db === null) {
        db = openDatabase(conf.name, conf.version, conf.desc, conf.size);
      }
      return db;
    } catch (error) {
      console.error('Could no open database, "' + conf.name + '". Please make sure your iPhone has iOS 4.0+, or up-to-date browser.');
    }
  };

  conf.renew = function() {
    if (db !== null) {
      // anyway to close it?
    }
    db = null;
  };
  return conf;
};

function EntityDesc(conf) {
  // error check
  if (!conf) {
    throw('Parameter for entity is not specified.'); // fatal error
  }
  if (!conf.db) {
    throw('Parameter for entity "db" is not specified.'); // fatal error
  }
  if (!conf.name) {
    throw('Parameter for entity "name" is not specified.'); // fatal error
  }
  if (!conf.id) {
    throw('Parameter for entity "id" is not specified.'); // fatal error
  }
  if (!conf.fields) {
    throw('Parameter for entity "fields" is not specified.'); // fatal error
  }
  var assertField = function(field) {
    if (!field || !field.name) {
      throw('Parameter [key] in "fields" is empty.');
    }
    if (!field.type) {
      throw('Nested parameter for entity "field[n].type" is not specified.');
    }
  };
  assertField(conf.id);
  Arrays.apply(assertField, conf.fields);

  // take in default value
  conf = $.extend(conf, {
    autocreate: true,
    keygen: false
  });

  return conf;
}

function DatabaseBareSet(conf) {
  if (!conf.entity) {
    throw('Parameter "entity" is not specified.'); // fatal error
  }
  if (!conf.entity.db) {
    throw('Parameter "entity.db" is not specified.'); // fatal error
  }

  var instance = this;

  conf = $.extend(conf, {
    errorhandler: null
  });

  var errorHandler = new SimpleBinder({
    name: ((conf? conf.name? conf.name + '.' :'':'') + 'event-handler')
  });

  var processError = !!conf.errorhandler? conf.errorhandler: new function() {};

  // main
  var entity = conf.entity;
  var db = entity.db.open();

  var EMPTY_FN = function() {};
  var DEFAULT_ERR = function(msg) { console.error(msg); };

  var getName = function(item) {
    return item.name;
  };

  var namequote = Strings.mysqlquote;

  var idfield = entity.id.name;
  var colfields = Arrays.apply(getName, entity.fields);

  var dbname = entity.db.name;
  var entityname = entity.name;

  var fieldAndType = function(field) {
    return namequote(field.name) + ' ' + field.type;
  };

  var verifyTable = function() {
    db.transaction(function(tx) {
      tx.executeSql("SELECT COUNT(*) FROM " + entityname, [],
        function(result) {},
        function(tx, error) {
          if (entity.autocreate) {
            var idstring = fieldAndType(entity.id) + ' PRIMARY KEY' + (entity.keygen === 'seq'? ' AUTO INCREMENT' : '');
            var fieldstring = Arrays.apply(fieldAndType, entity.fields);
            var sql = "CREATE TABLE " + namequote(entityname)
            + " ( " + idstring + ", " + fieldstring + " )";
            console.log('create table: ' + sql);
            tx.executeSql(sql, [],
              function(result) {}
            );
          } else {
            throw('Table "' + entity.name + '" does not exist and autocreate option is off.');
          }
        }
      );
    });
  };

  this.browse = function(fn, sumfn, filter) {
    // adjust argument
    if (!Arguments.isNonNullFn(sumfn)) {
      filter = sumfn;
      sumfn = null;
    }

    sumfn = sumfn || function() {};

    var cont;
    var idstring = namequote(idfield);
    var fieldstring = Strings.join(', ', Arrays.apply(namequote, colfields));
    var conds = [];
    var sorts = [];
    var limit = [];
    var values = [];
    if (Hashs.has(filter, 'namedquery')) {
      switch(filter.namedquery) {
      case 'last-modified':
        console.log('named query: last-modified');
        sorts.push('modified');
        limit = [0, 1];
        break;
      default:
        break;
      }
    }
    db.transaction(function(tx) {
      var sql = "SELECT " + idstring + ", " + fieldstring
      + " FROM " + namequote(entityname)
      + (sorts.length == 0? "": " ORDER BY " + Strings.join(", ", Arrays.apply(namequote, sorts)) + " DESC ")
      + (limit.length != 2? "": " LIMIT " + limit[0] + ", " + limit[1]);
      console.log('sql: ' + sql);
      tx.executeSql(sql, values,
        function(tx, resultset) {
          for (var i = 0; i < resultset.rows.length; ++i) {
            var row = resultset.rows.item(i);
            cont = fn(row[idfield], row);
            if (cont === false)
              break;
          }
          if (resultset.rows.length == 0) {
            sumfn(0);
          }
        }, function(tx, error) {
          console.error('Failed to retrieve [' + entityname + '] from database - ' + uneval(error));
          sumfn(0);
        }
      );
    });
    return cont;
  };

  this.create = function(entity, fn, errFn) {
    Arguments.assertNonNull(entity, conf.name + '.create: expect entity.');
    Arguments.warnNonNull(fn, conf.name + '.create: expect fn.');

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    db.transaction(function(tx) {
      var effectiveFields;
      if (conf.keygen) {
        effectiveFields = colfields;
      } else {
        effectiveFields = [];
        effectiveFields.push(idfield);
        effectiveFields = effectiveFields.concat(colfields);
      }
      var values = Arrays.extract(effectiveFields, entity);
      var id = entity[idfield];
      var sql = "INSERT INTO " + namequote(entityname) + " ( " + Strings.join(", ", Arrays.apply(namequote, effectiveFields))
          + " ) VALUES ( " + Strings.join(', ', Strings.fill('?', (effectiveFields.length))) + " )";
      console.log('sql: ' + sql + ' values: ' + uneval(values) + ' fields: ' + uneval(colfields));
      console.log('entity: ' + uneval(entity));
      tx.executeSql(sql, values, function(result) {
        fn(id, entity);
      }, function(tx, error) {
        errFn(id, 'insert error: ' + uneval(error));
      });
    });
  };

  this.read = function(id, fn, errFn) {
    Arguments.assertNonNull(id, conf.name + ".read: expect argument 'entryId'.");
    Arguments.assertNonNull(fn, conf.name + ".read: expect argument 'fn'.");

    errFn = errFn || DEFAULT_ERR;

    var effectiveFields = [];
    effectiveFields.push(idfield);
    effectiveFields = effectiveFields.concat(colfields);

    var values = [];
    values.push(id);

    var sql = "SELECT " + Strings.join(", ", Arrays.apply(namequote, effectiveFields)) + " FROM " + namequote(entityname)
    + " WHERE " + namequote(idfield) + "=?";

    console.log('sql: ' + sql);
    db.transaction(function(tx) {
      tx.executeSql(sql, values, function(tx, resultset) {
        if (resultset.rows.length > 0) {
          row = resultset.rows.item(0);
          fn(id, row);
          //console.log('result: ' + uneval(row));
        } else {
          errFn(id, 'no row for id: ' + id);
        }
      }, function(tx, error) {
        errFn(id, 'select error: ' + uneval(error));
      });
    });
  };

  this.update = function(id, entity, oldentity) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(entity) && $.isFunction(entity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = entity;
      entity = undefined;
    }

    Arguments.assertNonNull(entry, conf.name + ".update: expect argument 'id'.");
    Arguments.warnNonNull(fn, conf.name + ".update: expect argument 'fn'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    throw('not implemented');
  };

  this.remove = function(id, entity, fn, errFn) {
    // adjust arguments if 'oldentry' is not specified
    if (Arguments.isNonNull(entity) && $.isFunction(entity)) {
      if (Arguments.isNonNull(fn) && $.isFunction(fn)) {
        errFn = fn;
      }
      fn = entity;
      entity = undefined;
    }

    Arguments.assertNonNull(id, conf.name + ".remove: expect argument 'id'.");
    Arguments.warnNonNull(fn, conf.name + ".remove: expect argument 'fn'.");

    fn = fn || EMPTY_FN;
    errFn = errFn || DEFAULT_ERR;

    db.transaction(function(tx) {
      var values = [];
      values.push(id);
      var sql = "DELETE FROM " + namequote(entityname) + " WHERE " + namequote(idfield) + "=?";
      console.log('sql: ' + sql + ' id: ' + uneval(idfield) + ' values: ' + uneval(values));
      tx.executeSql(sql, values, function(result) {
        fn(values[0], null); //@TODO
      }, function(tx, error) {
        errFn(values[0], 'delete error: ' + uneval(error));
      });
    });
  };
  this.init = function() {
    verifyTable();
  };
  this.start = function() {
  };
};

function CachedDatabaseEntityDataSet(conf) {
  var entries = new CachedDataSet($.extend(conf, {storeset: storeset}));

  var oldinit = entries.init;
  entries.init = function() {
    verifyTable();
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
};

