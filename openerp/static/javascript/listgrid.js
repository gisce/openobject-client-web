////////////////////////////////////////////////////////////////////////////////
//
// Copyright (C) 2007-TODAY Tiny ERP Pvt Ltd. All Rights Reserved.
//
// $Id$
//
// Developed by Tiny (http://openerp.com) and Axelor (http://axelor.com).
//
// The OpenERP web client is distributed under the "OpenERP Public License".
// It's based on Mozilla Public License Version (MPL) 1.1 with following 
// restrictions:
//
// -   All names, links and logos of Tiny, Open ERP and Axelor must be 
//     kept as in original distribution without any changes in all software 
//     screens, especially in start-up page and the software header, even if 
//     the application source code has been changed or updated or code has been 
//     added.
//
// -   All distributions of the software must keep source code with OEPL.
// 
// -   All integrations to any other software must keep source code with OEPL.
//
// If you need commercial licence to remove this kind of restriction please
// contact us.
//
// You can see the MPL licence at: http://www.mozilla.org/MPL/MPL-1.1.html
//
////////////////////////////////////////////////////////////////////////////////

var ListView = function(name) {

    var elem = getElement(name);
    if (elem.__listview) {
        return elem.__listview;
    }

    var cls = arguments.callee;
    if (!(this instanceof cls)) {
        return new cls(name);
    }
  
    this.__init__(name);
}

ListView.prototype = {

    __init__: function(name){

        var prefix = name == '_terp_list' ? '' : name + '/';

        this.name = name;
        this.model = $(prefix + '_terp_model') ? $(prefix + '_terp_model').value : null;
        this.current_record = null;
    
        this.ids = getElement(prefix + '_terp_ids').value;

        var view_ids = getElement(prefix + '_terp_view_ids');
        var view_mode = getElement(prefix + '_terp_view_mode');
        var def_ctx = getElement(prefix + '_terp_default_get_ctx');
    
        this.view_ids = view_ids ? view_ids.value : null;
        this.view_mode = view_mode ? view_mode.value : null;
    
        // if o2m
        this.m2m = getElement(name + '_set');
        this.default_get_ctx = def_ctx ? def_ctx.value : null;

        // save the reference
        getElement(name).__listview = this;
    },

    checkAll: function(clear){

        clear = clear ? false : true;

        boxes = $(this.name).getElementsByTagName('input');
        forEach(boxes, function(box){
            box.checked = clear;
        });
    },
    
    getRecords: function() {
        var records = map(function(row){
            return parseInt(getNodeAttribute(row, 'record')) || 0;
        }, getElementsByTagAndClassName('tr', 'grid-row', this.name));
        
        return filter(function(rec){
            return rec;
        }, records);
    },

    getSelectedRecords: function() {
        return map(function(box){
            return box.value;
        }, this.getSelectedItems());
    },

    getSelectedItems: function() {
        return filter(function(box){
            return box.id && box.checked;
        }, getElementsByTagAndClassName('input', 'grid-record-selector', this.name));
    },

    getColumns: function(dom){
        dom = dom || this.name;
        var header = getElementsByTagAndClassName('tr', 'grid-header', dom)[0];
        
        return filter(function(c){
            return c.id ? true : false;
        }, getElementsByTagAndClassName('th', 'grid-cell', header));
    },

    makeArgs: function(){
        
        var args = {};
        var name = '/' + this.name;
        var names = name.split('/');

        var prefix = '';
        var items = MochiKit.DOM.getElementsByTagAndClassName('input');
        
        while(names.length) {
            
            var name = names.shift();
            prefix = prefix + (name ? name + '/' : '');
            
            var patern = prefix + '_terp_';
            
            forEach(items, function(item){
                if(item.name.match("^"+ patern) == patern && !item.name.match('^_terp_listfields/')) {
                	args[item.name] = item.value;
                }
            });
        }

        return args;
    }
}

// inline editor related functions
MochiKit.Base.update(ListView.prototype, {

    adjustEditors: function(newlist){

        var editors = this.getEditors(false, newlist);

        forEach(editors, function(e) {
            // disable autocomplete (Firefox < 2.0 focus bug)
            setNodeAttribute(e, 'autocomplete', 'OFF');
        });

        if (/MSIE/.test(navigator.userAgent)){
            return editors;
        }

        var widths = {};
        
        // set the column widths of the newlist
        forEach(this.getColumns(), function(c){
            widths[c.id] = parseInt(c.offsetWidth) - 8;
        });
     
        forEach(this.getColumns(newlist), function(c){
            c.style.width = widths[c.id] + 'px';
        });

        var widths = {};
        forEach(this.getEditors(), function(e){
            widths[e.id] = parseInt(e.offsetWidth);
        });

        return editors;
    },

    bindKeyEventsToEditors: function(editors){
        var self = this;
        var editors = filter(function(e){
            return e.type != 'hidden' && !e.disabled
        }, editors);

        forEach(editors, function(e){
            connect(e, 'onkeydown', self, self.onKeyDown);
            addElementClass(e, 'listfields');
        });
    },

    getEditors: function(named, dom){
        var editors = [];
        var dom = dom ? dom : this.name;

        editors = editors.concat(getElementsByTagAndClassName('input', null, dom));
        editors = editors.concat(getElementsByTagAndClassName('select', null, dom));
        editors = editors.concat(getElementsByTagAndClassName('textarea', null, dom));

        return filter(function(e){
            name = named ? e.name : e.id;
            return name &&  name.indexOf('_terp_listfields') == 0;
        }, editors);
    }

});

// pagination & reordering
MochiKit.Base.update(ListView.prototype, {

    moveUp: function(id) {

        var self = this;
        var args = {};
        
        args['_terp_model'] = this.model;
        args['_terp_ids'] = this.ids;
        args['_terp_id'] = id;
        
        var req = Ajax.JSON.post('/listgrid/moveUp', args);
        req.addCallback(function(){      
            self.reload();        
        });        
    },

    moveDown: function(id) {

        var self = this;
        var args = {};
        
        args['_terp_model'] = this.model;
        args['_terp_ids'] = this.ids;
        args['_terp_id'] = id;
        
        var req = Ajax.JSON.post('/listgrid/moveDown', args);
        req.addCallback(function(){      
            self.reload();        
        });
    }
});

// event handlers
MochiKit.Base.update(ListView.prototype, {

    onKeyDown: function(evt){
        var key = evt.key();
        var src = evt.src();

        if (!(key.string == "KEY_TAB" || key.string == "KEY_ENTER" || key.string == "KEY_ESCAPE")) {
            return;
        }

        if (key.string == "KEY_ESCAPE"){
            evt.stop();
            return this.reload();
        }

        if (key.string == "KEY_ENTER"){

            if (hasElementClass(src, "m2o")){

                var k = src.id;
                k = k.slice(0, k.length - 5);

                if (src.value && !getElement(k).value){
                    return;
                }
            }

            if (src.onchange) {
                src.onchange();
            }
            
            evt.stop();
            return this.save(this.current_record);
        }

        var editors = getElementsByTagAndClassName(null, 'listfields', this.name);

        var first = editors.shift();
        var last = editors.pop();

        if (src == last){
            evt.stop();
            first.focus();
            first.select();
        }
    },

    onButtonClick: function(name, btype, id, sure, context){

        if (sure && !confirm(sure)){
            return;
        }
        
        var self = this;
        var prefix = this.name == '_terp_list' ? '' : this.name + '/';

        if (btype == "open") {
            return window.open(get_form_action('/form/edit', {
                        id: id,
                        ids: $(prefix + '_terp_ids').value,
                        model: $(prefix + '_terp_model').value,
                        view_ids: $(prefix + '_terp_view_ids').value,
                        domain: $(prefix + '_terp_domain').value,
                        context: $(prefix + '_terp_context').value,
                        limit: $(prefix + '_terp_limit').value,
                        offset: $(prefix + '_terp_offset').value,
                        count: $(prefix + '_terp_count').value}));
        }

        name = name.split('.').pop();
        
        var params = {
            _terp_model : this.model,
            _terp_id : id,
            _terp_button_name : name,
            _terp_button_type : btype
        }

        var req = eval_domain_context_request({source: this.name, context : context || '{}'});
        req.addCallback(function(res){
            params['_terp_context'] = res.context;
            var req = Ajax.JSON.post('/listgrid/button_action', params);
            req.addCallback(function(obj){
                if (obj.error){
                    return alert(obj.error);
                }

                if (obj.result && obj.result.url) {
                    window.open(obj.result.url);
                }
                
                if(obj.wiz_result){                    
                    var act = get_form_action('action');                    
                    MochiKit.Base.update(params, {
                        '_terp_action': obj.wiz_result.action_id,
                        '_terp_id': obj.wiz_result.id,
                        '_terp_model': obj.wiz_result.model});
                    
                    window.open(getURL(act, params));
                }

                if (obj.reload) {
                    window.location.reload();
                } else
                    self.reload();
            });
        });
    }
});

// standard actions
MochiKit.Base.update(ListView.prototype, {

    create: function(default_get_ctx){
        this.edit(-1, default_get_ctx);
    },

    edit: function(edit_inline, default_get_ctx){
        this.reload(edit_inline, null, default_get_ctx);
    },

    save: function(id){

        if (Ajax.COUNT > 0) {
            return callLater(1, bind(this.save, this), id);
        }

        var parent_field = this.name.split('/');
        var data = getFormData(2);
        var args = getFormParams('_terp_concurrency_info');

        for(var k in data) {
            if (k.indexOf(this.name + '/') == 0 || this.name == '_terp_list') {
                args[k] = data[k];
            }
        }

        var prefix = this.name == '_terp_list' ? '' : this.name + '/';

        args['_terp_id'] = id ? id : -1;
        args['_terp_ids'] = $(prefix + '_terp_ids').value;
        args['_terp_model'] = this.model;

        if (parent_field.length > 0){
            parent_field.pop();
        }

        parent_field = parent_field.join('/');
        parent_field = parent_field ? parent_field + '/' : '';

        args['_terp_parent/id'] = $(parent_field + '_terp_id').value;
        args['_terp_parent/model'] = $(parent_field + '_terp_model').value;
        args['_terp_parent/context'] = $(parent_field + '_terp_context').value;
        args['_terp_source'] = this.name;

        var self = this;
        var req= Ajax.JSON.post('/listgrid/save', args);

        req.addCallback(function(obj){
            if (obj.error){
                alert(obj.error);

                if (obj.error_field) {
                    var fld = getElement('_terp_listfields/' + obj.error_field);

                    if (fld && getNodeAttribute(fld, 'kind') == 'many2one')
                        fld = getElement(fld.id + '_text');

                    if (fld) {
                        fld.focus();
                        fld.select();
                    }
                }
            } else {

                $(prefix + '_terp_id').value = obj.id;
                $(prefix + '_terp_ids').value = obj.ids;

                self.reload(id > 0 ? null : -1, prefix ? 1 : 0);
             }
         });
    },

    remove: function(ids){

        var self = this;
        var args = getFormParams('_terp_concurrency_info');;
        
        if(!ids) {
            var ids = this.getSelectedRecords();
            if(ids.length > 0){
                ids = '[' + ids.join(',') + ']';
            }
        }
        
        if (ids.length == 0) {
            return alert(_('You must select at least one record.'));
        }
        else if (!confirm(_('Do you really want to delete selected record(s) ?'))) {
            return false;
        }
        
        args['_terp_model'] = this.model;
        args['_terp_ids'] = ids;

        var req = Ajax.JSON.post('/listgrid/remove', args);

        req.addCallback(function(obj){
            if (obj.error){
                alert(obj.error);
            } else {
                if(obj.msg) {
                    getElement('request_messages').innerHTML = obj.msg
                }
                self.reload();
                
            }
        });
    },

    go: function(action){
        
        if (Ajax.COUNT > 0){
            return;
        }

        var prefix = this.name == '_terp_list' ? '' : this.name + '/';

        var o = $(prefix + '_terp_offset');
        var l = $(prefix + '_terp_limit');
        var c = $(prefix + '_terp_count');

        var ov = o.value ? parseInt(o.value) : 0;
        var lv = l.value ? parseInt(l.value) : 0;
        var cv = c.value ? parseInt(c.value) : 0;

        switch(action) {
            case 'next':
                o.value = ov + lv;
                break;
            case 'previous':
                o.value = lv > ov ? 0 : ov - lv;
                break;
            case 'first':
                o.value = 0;
                break;
            case 'last':
                o.value = cv - (cv % lv);
                break;
        }

        this.reload();
    },

    reload: function(edit_inline, concurrency_info, default_get_ctx){

        if (Ajax.COUNT > 0) {
            return callLater(1, bind(this.reload, this), edit_inline, concurrency_info);
        }

        var self = this;
        var args = this.makeArgs();
        
        var current_id = edit_inline ? (parseInt(edit_inline) || 0) : edit_inline;

        // add args
        args['_terp_source'] = this.name;
        args['_terp_edit_inline'] = edit_inline;
        args['_terp_source_default_get'] = default_get_ctx;
        args['_terp_concurrency_info'] = concurrency_info;
        args['_terp_editable'] = $('_terp_editable').value;

        if (this.name == '_terp_list') {
            args['_terp_search_domain'] = $('_terp_search_domain').value;
        }

        var req = Ajax.JSON.post('/listgrid/get', args);
        req.addCallback(function(obj){

            var _terp_id = $(self.name + '/_terp_id') || $('_terp_id');
            var _terp_ids = $(self.name + '/_terp_ids') || $('_terp_ids');
            var _terp_count = $(self.name + '/_terp_count') || $('_terp_count');
            
            _terp_id.value = current_id > 0 ? current_id : 'False';
            
            if(obj.ids) {
            
                if (typeof(current_id) == "undefined" && obj.ids.length) {
                    current_id = obj.ids[0];
                }
            
                _terp_id.value = current_id > 0 ? current_id : 'False';
                
                _terp_ids.value = '[' + obj.ids.join(',') + ']';
                _terp_count.value = obj.count;
            }

            var d = DIV();
            d.innerHTML = obj.view;

            var newlist = d.getElementsByTagName('table')[0];
            var editors = self.adjustEditors(newlist);
            
            if (editors.length > 0)
                self.bindKeyEventsToEditors(editors);
                
            self.current_record = edit_inline;

            var __listview = getElement(self.name).__listview;
            swapDOM(self.name, newlist);
            getElement(self.name).__listview = __listview;

            var ua = navigator.userAgent.toLowerCase();

            if ((navigator.appName != 'Netscape') || (ua.indexOf('safari') != -1)) {
                // execute JavaScript
                var scripts = getElementsByTagAndClassName('script', null, newlist);
                forEach(scripts, function(s){
                    eval(s.innerHTML);
                });
            }
            
            // update concurrency info
            for(var key in obj.info) {
                try {
                    var items = getElementsByAttribute(['name', '_terp_concurrency_info'], ['value', '*=' + key]);
                    var value = "('" + key + "', '" + obj.info[key] + "')";
                    for(var i=0; i<items.length;i++) {
                        items[i].value = value;
                    }
                }catch(e){}
            }

            // set focus on the first field
            var first = getElementsByTagAndClassName(null, 'listfields', self.name)[0] || null;
            if (first) {
                first.focus();
                first.select();
            }
            
            // call on_change for default values
            if (editors.length && edit_inline == -1) {
                forEach(editors, function(e){
                    if (e.value && getNodeAttribute(e, 'callback')) {
                        MochiKit.Signal.signal(e, 'onchange');
                    }
                });
            }

            MochiKit.Signal.signal(__listview, 'onreload');
        });
    }

});

// export/import functions
MochiKit.Base.update(ListView.prototype, {

    exportData: function(){
        
        var ids = this.getSelectedRecords();
        
        if (ids.length == 0) {
            ids = this.getRecords();
        }
        
        ids = '[' + ids.join(',') + ']';
        
        openWindow(getURL('/impex/exp', {_terp_model: this.model,
        								 _terp_context: $('_terp_context').value, 
                                         _terp_source: this.name, 
                                         _terp_search_domain: $('_terp_search_domain').value, 
                                         _terp_ids: ids,
                                         _terp_view_ids : this.view_ids,
                                         _terp_view_mode : this.view_mode}));
    },

    importData: function(){
        openWindow(getURL('/impex/imp', {_terp_model: this.model,
        								 _terp_context: $('_terp_context').value,
                                         _terp_source: this.name,
                                         _terp_view_ids : this.view_ids,
                                         _terp_view_mode : this.view_mode}));
    }        
});

// vim: ts=4 sts=4 sw=4 si et

