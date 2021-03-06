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

if (typeof(openerp) == "undefined") {
    openerp = {};
}

if (typeof(openerp.process) == 'undefined') {
    openerp.process = {};
}

openerp.process.NAME = "openerp.process";
openerp.process.__repr__ = openerp.process.toString = function () {
    return "[" + this.NAME + "]";
};

/**
 * openerp.process.Workflow
 */
openerp.process.Workflow = function(canvas) {
    this.__init__(canvas);
}

openerp.process.Workflow.prototype = new draw2d.Workflow();
MochiKit.Base.update(openerp.process.Workflow.prototype, {

    __super__: draw2d.Workflow,

    __init__: function(canvas) {

        this.__super__.call(this, canvas);
        this.setBackgroundImage(null, false);
        
        this.nodes = {};
        this.transitions = {};
    },

    load: function(id, res_model, res_id) {

        this.process_id = id;
        this.res_model = res_model;
        this.res_id = res_id;

        var self = this;
        var req = Ajax.JSON.post('/process/get', {id: id, res_model: res_model, res_id: res_id});
        req.addCallback(function(obj){
            self._render(obj.title, obj.perm, obj.notes, obj.nodes, obj.transitions, obj.related);            
        });

    },

    reload: function() {
        this.load(this.process_id, this.res_model, this.res_id);
    },

    _render: function(title, perm, notes, nodes, transitions, related) {

        var h = 0;
        var w = 0;

        var subflows = {};
        var related = related || {};

    	for(var id in nodes){
    		var data = nodes[id];

            data['res_model'] = this.res_model;
            data['res_id'] = this.res_id;

    		var n = new openerp.process.Node(data);
	    	this.addFigure(n, data.x, data.y);
	    	
	    	this.nodes[id] = n; // keep reference

            h = Math.max(h, data.y);
            w = Math.max(w, data.x);

            if (data.subflow && data.subflow.length) {
                subflows[data.subflow[0]] = data.subflow[1];
            }

	    }

        h += 100 + 10; // add height of node + some margin
        w += 150 + 10; // add width of node + some margin

        MochiKit.DOM.setElementDimensions(this.html, {h: h, w: w});
	    
	    for(var id in transitions){
    		var data = transitions[id];
    		
    		var src = this.nodes[data.source];
    		var dst = this.nodes[data.target];

            // make active
            data.active = src.data.active && !dst.data.gray;

            var t = new openerp.process.Transition(data);
    		
    		t.setSource(src.outPort);
    		t.setTarget(dst.inPort);
    		
    		this.addFigure(t);
    		
    		this.transitions[id] = t; // keep reference
    	}

        // create notes
        var note = this._create_note(notes, subflows, perm, related);
        var canvas = getElement('process_canvas');
        canvas.parentNode.insertBefore(note, canvas);

        // check whether any node overlaps the notes
        var npos = getElementPosition(note, note.parentNode);
        var ndim = getElementDimensions(note);
        var mx = 0;

        for(var id in nodes){
    		var data = nodes[id];
            if ((data.x >= npos.x && data.x <= npos.x + ndim.w) && (data.y >= npos.y && data.y <= npos.y + ndim.h)) {
                mx = Math.max(mx, npos.y + ndim.h - data.y);
            }
        }
        canvas.style.marginTop = mx + 4 + 'px';

        // set title
        MochiKit.DOM.getElement('process_title').innerHTML = title;

        var elems = MochiKit.DOM.getElementsByTagAndClassName('*', null, this.html);
        elems = MochiKit.Base.filter(function(e){
            return MochiKit.DOM.getNodeAttribute(e, 'title');
        }, elems);

        if (elems.length) {
            new Tips(elems);
        }
    },

    _create_note:  function(notes, subflows, perm, related) {

        var self = this;
        var elem = MochiKit.DOM.DIV({'class': 'process-notes'});
        var perm = perm || {};

        var sflows = "";
        var rflows = "";

        for(var k in subflows) {
            if (k != this.process_id)
                sflows += "<a href='" + getURL('/process', {id: k, res_model: self.res_model, res_id: self.res_id}) + "'>" + subflows[k] + "</a><br/>";
        }

        for(var k in related) {
            if (k != this.process_id)
                rflows += "<a href='" + getURL('/process', {id: k, res_model: self.res_model, res_id: self.res_id}) + "'>" + related[k] + "</a><br/>";
        }

        var text = (
                    "<dl>"+
                    "<dt>"+ _("Notes:") + "</dt>" +
                    "<dd>" +
                        notes + 
                    "</dd>"+
                    "<dt>"+ perm.text + "</dt>"+
                    "<dd>"+ perm.value + "</dd>");

        if (sflows.length) {
            text += "<dt>" + _("Subflows:") + "</dt><dd>" + sflows + "</dd>";
        }

        if (rflows.length) {
            text += "<dt>" + _("Related:") + "</dt><dd>" + rflows + "</dd>";
        }

        text += "</dl>";

        elem.innerHTML = text;

        return elem;
    }
   
});

/**
 * openerp.process.Node
 */
openerp.process.Node = function(data) {
    this.__init__(data);
}

openerp.process.Node.prototype = new draw2d.Node();
MochiKit.Base.update(openerp.process.Node.prototype, {

    __super__: draw2d.Node,

    __init__: function(data) {
        this.data = data;
        
        this.__super__.call(this);
        
        this.setDimension(150, 100);
        this.setResizeable(false);
        this.setSelectable(false);
        this.setCanDrag(false);
        this.setColor(null);
    },

    createHTMLElement: function() {
        var elem = this.__super__.prototype.createHTMLElement.call(this);
        
        var bg = "node";        
        bg = this.data.kind == "subflow" ? "node-subflow" : "node"; 
        bg = this.data.gray ? bg + "-gray" : bg;

        elem.style.background = "url(/static/workflow/images/" + bg + ".png) no-repeat";

        elem.innerHTML = (
        "<div class='node-title'></div>"+
        "<div class='node-text'></div>"+
        "<div class='node-bottom'>"+
        "   <table>"+
        "	    <tr>"+
        "		    <td class='node-buttons' nowrap='nowrap'></td>"+
        "		    <td class='node-menu' align='right'></td>"+
        "	    </tr>"+
        "   </table>"+
        "</div>");

        var title = MochiKit.DOM.getElementsByTagAndClassName('div', 'node-title', elem)[0];
        var text = MochiKit.DOM.getElementsByTagAndClassName('div', 'node-text', elem)[0];
        var bbar = MochiKit.DOM.getElementsByTagAndClassName('td', 'node-buttons', elem)[0];        
        var menu = MochiKit.DOM.getElementsByTagAndClassName('td', 'node-menu', elem)[0];

        title.innerHTML = this.data.name || '';
        text.innerHTML = this.data.notes || '';

        if (this.data.subflow && this.data.subflow.length) {
            var href = getURL('/process', {id: this.data.subflow[0], res_model: this.data.res_model, res_id: this.data.res_id});
            title.innerHTML = "<a href='" + href + "'>" + this.data.name + "</a>";
        }

        if (this.data.res) {
            text.innerHTML= '<b>' + this.data.res.name + '</b><br>' + (this.data.notes || '');
            var perm = this.data.res.perm || {};
            text.title = perm.text + ": " + perm.value;
        }

        if (this.data.menu) {
            var menu_img = IMG({src: '/static/images/stock/gtk-jump-to.png'});
            menu_img.title = this.data.menu.name;
            menu_img.onclick = MochiKit.Base.bind(function(){
                window.open(getURL('/tree/open', {model: 'ir.ui.menu', id: this.data.menu.id}));
            }, this);
            MochiKit.DOM.appendChildNodes(menu, menu_img);
        }

        var buttons = [IMG({src: '/static/images/stock/gtk-info.png', title: _('Help')})];
        buttons[0].onclick = MochiKit.Base.bind(this.onHelp, this);

        if (this.data.res) {
            buttons.push(IMG({src: '/static/images/stock/gtk-open.png', title: _('Open')}));
            buttons.push(IMG({src: '/static/images/stock/gtk-print.png', title: _('Print')}));

            buttons[1].onclick = MochiKit.Base.bind(this.onView, this);
            buttons[2].onclick = MochiKit.Base.bind(this.onPrint, this);
        }

        if (this.data.workflow && this.data.res) {
            var btn = IMG({src: '/static/images/stock/gtk-execute.png', title: _('Print workflow')});
            btn.onclick = MochiKit.Base.bind(this.onPrintWorkflow, this);
            buttons.push(btn);
        }

        if ((this.data.res && this.data.res.directory) || (this.data.directory)) {
            var btn = IMG({src: '/static/images/stock/gtk-directory-remote.png', title: _('Documents')});
            btn.onclick = MochiKit.Base.bind(this.onDocument, this);
            buttons.push(btn);
        }

        if (this.data.active){
            elem.style.background = "url(/static/workflow/images/node-current.png) no-repeat";
        }

        MochiKit.DOM.appendChildNodes(bbar, buttons);

		elem.className = 'node';
        return elem;
    },
    
    setWorkflow: function(workflow) {
    	this.__super__.prototype.setWorkflow.call(this, workflow);
    	
    	this.outPort = new draw2d.OutputPort();
        this.inPort = new draw2d.OutputPort();
        
        this.outPort.setWorkflow(workflow);
        this.inPort.setWorkflow(workflow);
        
        this.addPort(this.outPort, this.width, this.height/2);
        this.addPort(this.inPort, 0, this.height/2);
        
        this.inPort.getHTMLElement().style.display = 'none';    
    	this.outPort.getHTMLElement().style.display = 'none';
    },

    onView: function() {
        var params = {model: this.data.res.model, id: this.data.res.id};
        openWindow(getURL("/process/resource/edit", params));
    },

    onPrint: function() {
        window.open(getURL("/form/report", {
            _terp_model: this.workflow.res_model, 
            _terp_id: this.workflow.res_id}));
    },

    onDocument: function() {
        if (this.data.res && this.data.res.directory)
            window.open(this.data.res.directory);
        else if (this.data.directory)
            window.open(this.data.directory);
    },

    onPrintWorkflow: function() {
        var id = this.data.res ? this.data.res.id : "False";
        window.open(getURL('/process/print_workflow', {model: this.data.model, id: id}));
    },

    onHelp: function() {
    	window.open(this.data.url || "http://doc.openerp.com/index.php?model=" + this.data.model);
        //window.open(this.data.url || "http://openerp.com/scripts/context_index.php?model=" + this.data.model);
    }
});

/**
 * openerp.process.Transition
 */
openerp.process.Transition = function(data) {
    this.__init__(data);
}

openerp.process.Transition.prototype = new draw2d.Connection();
MochiKit.Base.update(openerp.process.Transition.prototype, {

    __super__: draw2d.Connection,

    __init__: function(data) {
        this.__super__.call(this);

        this.setSourceAnchor(new draw2d.ChopboxConnectionAnchor());
        this.setTargetAnchor(new draw2d.ChopboxConnectionAnchor());
        this.setRouter(new draw2d.NullConnectionRouter());
        //this.setRouter(new draw2d.ManhattanConnectionRouter());

        var color = data.active && data.buttons && data.buttons.length ? new draw2d.Color(128, 0, 0) : new draw2d.Color(179, 179, 179);

        this.setTargetDecorator(new openerp.process.TargetDecorator(color));
        this.setColor(color);
        this.setLineWidth(3);
        this.setSelectable(false);

        this.data = data;

        var roles = data.roles || [];

        var elem = this.getHTMLElement();
        elem.style.cursor = 'pointer';
//        elem.title = this._makeTipText();
        MochiKit.Signal.connect(elem, 'ondblclick', this, this._makeTipText);

        if (data.active && data.buttons && data.buttons.length) {

            var description = MochiKit.Base.map(function(role){
                return TD({align: 'center'}, IMG({src: '/static/images/stock/stock_person.png'}), BR(), role.name);
            }, roles);

            description = roles.length ? TABLE({'style': 'height: 70px; font-size: 10px'},
                                            TBODY(null, TR(null, description))) : '';

            this.infoBox = new InfoBox({
                'title': this.data.name,
                'description': description,
                'buttons': data.buttons || [],
                'buttonClick': MochiKit.Base.bind(this.onBtnClick, this)
            });

            MochiKit.Signal.connect(elem, 'onclick', this, this.onClick);
        }

        if (roles.length) {
            var role_img = new draw2d.ImageFigure('/static/images/stock/stock_person.png');
            role_img.setDimension(32, 32);
            role_img.html.style.cursor = "pointer";
            this.addFigure(role_img, new draw2d.ManhattenMidpointLocator(this));
        }

    },

    _makeTipText: function() {

		var params = {};
        var data = this.data;
        var title = data.name + '::' + (data.notes || '');

        var roles = data.roles || [];
        var buttons = data.buttons || [];

        var _mkList = function(values) {
            var r = '<ul style="margin-bottom: 0px; margin-top: 0px;">';
            MochiKit.Base.map(function(v){
                r += '<li>' + v.name + '</li>';
            }, values);
            return r + '</ul>';
        }

        if (roles.length || buttons.length) {
            title += '<hr noshade="noshade"/>'
        }

        if (roles.length) {
            title += '<span>Roles:</span>' + _mkList(roles);
        }

        if (buttons.length) {
            title += '<span>Actions:</span>' + _mkList(buttons);
        }
        
        params['title_tip'] = MochiKit.DOM.emitHTML(title);
        openWindow(getURL("/process/open_tip", params), {width: 450, height: 250});
    },

    onClick: function(evt) {
        this.infoBox.show(evt);
    },

    onBtnClick: function(evt, button) {
        this.infoBox.hide();

        if (button.state == "dummy" || !button.action)
            return;

        var req = Ajax.JSON.post('/process/action', {
            _terp_model: this.workflow.res_model,
            _terp_id: this.workflow.res_id,
            _terp_kind: button.state,
            _terp_action: button.action
        });


        req.addCallback(function(res){
            if (res.error) {
                alert(res.error);
            } else {
                window.location.reload();
            }
        });

    }
});

/**
 * openerp.process.TargetDecorator
 */
openerp.process.TargetDecorator = function(color) {
    this.__init__(color);
}

openerp.process.TargetDecorator.prototype = new draw2d.ArrowConnectionDecorator();
MochiKit.Base.update(openerp.process.TargetDecorator.prototype, {

    __super__: draw2d.ArrowConnectionDecorator,

    __init__: function(color) {
        this.__super__.call(this);
	    this.setBackgroundColor(color);
        this.setColor(color);
    },
    
    paint: function(/*draw2d.Graphics*/ g) {
		
		if(this.backgroundColor!=null) {
     		g.setColor(this.backgroundColor);
     		g.fillPolygon([0, 6, 6, 0], [0, 6, -6, 0]);
  		}

		 // draw the border
		g.setColor(this.color);
		g.setStroke(1);
		g.drawPolygon([0, 6, 6, 0], [0, 6, -6, 0]);
	}
});

// vim: ts=4 sts=4 sw=4 si et


