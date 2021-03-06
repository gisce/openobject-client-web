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

var onSelect = function(evt, node){
}

var getXPath = function(node) {
    
    var path = node.getPath(1);
    
    var xp = '';
    var nd = path.pop()
    
    while (nd.record.items.localName != 'view') {
        
        var similar = MochiKit.Base.filter(function(n){
            return n.record.items.localName == nd.record.items.localName; 
        }, nd.parentNode.childNodes);
        
        var idx = MochiKit.Base.findIdentical(similar, nd) + 1
        
        xp = '/' + nd.record.items.localName + '[' + idx + ']' + xp;
        nd = path.pop();
    }
    
    return xp;
}

var onDelete = function(node){
    
    var tree = view_tree;
    var selected = node || tree.selection[0] || null;
    
    if (!selected) {
        return;
    }        
    
    var record = selected.record;
    var data = record.items;
    
    if (data.localName == 'view' && !selected.parentNode.element) {
        return;
    }
    
    if (!confirm(_('Do you really want to remove this node?'))) {
        return;
    }
    
    var act = data.localName == 'view' ? '/viewed/remove_view' : '/viewed/save/remove';
    
    var req = Ajax.JSON.post(act, {view_id: data.view_id, xpath_expr: getXPath(selected)});
    req.addCallback(function(obj){
        
        if (obj.error){
            return alert(obj.error);
        }
        
        selected.parentNode.removeChild(selected);
    });
}

var onAdd = function(node){

    var tree = view_tree;
    var selected = node || tree.selection[0] || null;
    
    if (!selected) {
        return;
    }
    
    var record = selected.record;
    var data = record.items;
    
    if (data.localName == 'view') {
        return;
    }
    
    var req = Ajax.post('/viewed/add', {view_id: data.view_id, xpath_expr: getXPath(selected)});
    req.addCallback(function(xmlHttp){
        var el = window.mbox.content;
        el.innerHTML = xmlHttp.responseText;

        var scripts = getElementsByTagAndClassName('script', null, el);
        forEach(scripts, function(s){
            eval('(' + s.innerHTML + ')');
        });

        var dim = getElementDimensions(document.body);

        window.mbox.width = 400;
        window.mbox.height = 150;
        window.mbox.onUpdate = doAdd;

        window.mbox.show();
    });
}

var doAdd = function() {
    
    var tree = view_tree;
    var selected = tree.selection[0] || null;
    
    if (!selected) {
        return;
    }

    var form = document.forms['view_form'];
    var params = {};
    
    forEach(form.elements, function(el){
        params[el.name] = el.value;
    });
    
    var act = MochiKit.DOM.getElement('node').value == 'view' ? '/viewed/create_view' : '/viewed/save/node';
    
    var req = Ajax.JSON.post(act, params);
    req.addCallback(function(obj) {
        
        if (obj.error){
            return alert(obj.error);
        }
        
        var node = tree.createNode(obj.record);
        var pnode = selected.parentNode;
        
        var pos = MochiKit.DOM.getElement('position').value;
        
        if (pos == 'after') {
            pnode.insertBefore(node, selected.nextSibling);    
        }
        
        if (pos == 'before') {
            pnode.insertBefore(node, selected);
        }
        
        if (pos == 'inside') {
            selected.appendChild(node);
        }
        
        node.onSelect();

        if (obj.record.items && obj.record.items.edit)
            MochiKit.Async.callLater(0.1, onEdit, node);
    });

    req.addBoth(function(obj){
        window.mbox.hide();
    });
    
    return false;
}

var onEdit = function(node) {

    var tree = view_tree;
    var selected = node || tree.selection[0] || null;
    
    if (!selected) {
        return;
    }
    
    var record = selected.record;
    var data = record.items;
    
    if (data.localName == 'view') {
        return;
    };
    
    var req = Ajax.post('/viewed/edit', {view_id: data.view_id, xpath_expr: getXPath(selected)});
    req.addCallback(function(xmlHttp){
        
        var el = window.mbox.content;
        el.innerHTML = xmlHttp.responseText;
        
        var scripts = getElementsByTagAndClassName('script', null, el);
        forEach(scripts, function(s){
            eval(s.innerHTML);
        });

        var dim = getElementDimensions(document.body);

        window.mbox.width = Math.max(dim.w - 100, 0);
        window.mbox.height = Math.max(dim.h - 100, 0);
        window.mbox.onUpdate = doEdit;

        window.mbox.show();
    });
}

var doEdit = function() {
    
    var tree = view_tree;
    var selected = tree.selection[0] || null;
    
    if (!selected) {
        return;
    }

    var form = document.forms['view_form'];
    var params = {};
    
    forEach(form.elements, function(el){
        
        if (!el.name) return;
        
        var val = el.type == 'checkbox' ? el.checked ? 1 : null : el.value;
                        
        if (el.type == 'select-multiple') {
        
            val = MochiKit.Base.filter(function(o){
                return o.selected;
            }, el.options); 
            
            val = MochiKit.Base.map(function(o){
                return o.value;
            }, val);
            
            val = val.join(',');
        }
        
        if (val) {
           params[el.name] = val;
        }
    });
    
    var req = Ajax.JSON.post('/viewed/save/properties', params);
    req.addCallback(function(obj){
        
        if (obj.error){
            alert(obj.error);
        }
        
        selected.updateDOM(obj.record);
    });
    
    req.addBoth(function(obj){
        window.mbox.hide();
    });

    return false;
}

var onMove = function(direction, node) {
    
    var tree = view_tree;
    var selected = node || tree.selection[0] || null;
    
    if (!selected) {
        return;
    }
    
    var refNode = direction == 'up' ? selected.previousSibling : selected;
    var node = direction == 'up' ? selected : selected.nextSibling;
    
    if (!node || (direction == 'up' && !refNode)) {
        return;
    }
    
    var record = node.record;
    var data = record.items;
    
    var params = {
        view_id: data.view_id, 
        xpath_expr: getXPath(node),
        xpath_ref: getXPath(refNode)
    }
    
    var req = Ajax.JSON.post('/viewed/save/move', params);
    
    req.addCallback(function(obj) {
        
        if (obj.error){
            return alert(obj.error);
        }
        
        var pnode = node.parentNode;
        var nnode = tree.createNode(record);
        
        pnode.removeChild(node)
        pnode.insertBefore(nnode, refNode);
        
        if (direction == 'up') {
            nnode.onSelect();
        } else {
            refNode.onSelect();
        }
    });
    
    return true;
}

var onButtonClick = function(evt, node) {
    
    var src = evt.src();
    
    switch (src.name) {
        case 'edit': 
            return onEdit(node);
        case 'delete': 
            return onDelete(node);
        case 'add':
            return onAdd(node);
        case 'up':
        case 'down': 
            return onMove(src.name, node);
    }
}

var onInherit = function() {
    
    if (!confirm(_('Do you really wants to create an inherited view here?'))) {
        return;
    }
    
    var tree = view_tree;
    var selected = tree.selection[0] || null;
    
    if (!selected) {
        return;
    }
    
    params = {
        view_id: getElement('view_id').value,
        xpath_expr: getXPath(selected)
    };
    
    var req = Ajax.JSON.post('/viewed/create_view', params);
    req.addCallback(function(obj) {
        
        if (obj.error){
            return alert(obj.error);
        }
        
        var node = tree.createNode(obj.record);
        selected.appendChild(node);
    });
    
    return false;
}

var onPreview = function() {
   var act = getURL('/viewed/preview/show', {'model' : getElement('view_model').value, 
                                             'view_id' : getElement('view_id').value,
                                             'view_type' : getElement('view_type').value});
   
    if (window.browser.isGecko19) {
        return openWindow(act);
    } 
    
    window.open(act);
}

var onNew = function(model){                          
    var act = getURL('/viewed/new_field/edit', {'for_model' : model});
    openWindow(act, {width: 650, height: 400});
}

var onClose = function(){
    window.opener.setTimeout("window.location.reload()", 1);
    window.close();
}

var toggleFields = function(selector) {
    MochiKit.DOM.getElement('name').style.display = selector.value == 'field' ? '' : 'none';
    MochiKit.DOM.getElement('new_field').style.display = selector.value == 'field' ? '' : 'none';
}

var onUpdate = function(){
    window.mbox.onUpdate();
}

var addNewFieldName = function(name) {
    var op = getElement("name").options;
    op[op.length] = new Option(name, name, 0, 1);
}

MochiKit.DOM.addLoadEvent(function(evt){

    window.mbox = new ModalBox({
        title: 'Properties',
        buttons: [
            {text: 'Update', onclick: onUpdate}
        ]
    });

});

// vim: sts=4 st=4 et
