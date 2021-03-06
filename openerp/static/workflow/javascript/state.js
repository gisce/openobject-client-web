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

// requires: mootools & draw2d

if (typeof(openerp) == "undefined") {
    openerp = new Object;
}

if (typeof(openerp.workflow) == "undefined") {
    openerp.workflow = new Object;
}


openerp.workflow.StateBase = function(id, action, kind, sname) {
    this.__init__(id, action, kind, sname);
} 
    
openerp.workflow.StateBase.prototype = {
    __init__ : function(id, action, kind, sname) {
        this.sname = sname;    
        this.act_id = id || null;
        this.action = action;
        this.kind = kind || '';        
        this.portR = null;
        this.portU = null;
        this.portL = null;
        this.portD = null;
    },
    
    init_label : function(flow_start, flow_stop) {
    
        this.setDimension(100, 60);
        this.setDeleteable(false);
        this.setResizeable(false);
        this.setLineWidth(2);
              
                       
        if(flow_start || flow_stop)          
            this.setBackgroundColor(new draw2d.Color(155, 155, 155))
        else
            this.setBackgroundColor(new draw2d.Color(255, 255, 255)); 
            
        var html = this.getHTMLElement();    
        html.style.textAlign = 'center';
        html.style.marginLeft = 'auto';
        html.style.marginRight = 'auto';           
        this.sgnl_dblclk = MochiKit.Signal.connect(html , 'ondblclick', this, this.ondblClick);  
        this.sgnl_clk = MochiKit.Signal.connect(html , 'onclick', this, this.onClick);
        this.disableTextSelection(html);
        
        var span = SPAN({'class': 'stateName', id: this.sname}, this.sname);
        MochiKit.DOM.appendChildNodes(html, span);
        
        if(!isUndefinedOrNull(this.sname)) {
            var n = this.sname.length;
            var width = 100;
            
            if(n>10) {
                width = width + Math.round((n-10)/2 * 10);
                this.setDimension(width,60);
            }            
        } 
        
    },
    
    initPort : function() {
        
        var workflow = this.getWorkflow();
        var width = this.getWidth();
        var height = this.getHeight();
        
        this.portR = new openerp.workflow.Port();       
        this.portR.setWorkflow(workflow);
        this.addPort(this.portR, width, height/2);
        
        this.portU = new openerp.workflow.Port();    
        this.portU.setWorkflow(workflow);        
        this.addPort(this.portU, width/2, 0);
        
        this.portL = new openerp.workflow.Port();              
        this.portL.setWorkflow(workflow);
         this.addPort(this.portL, 0, height/2);
        
        this.portD = new openerp.workflow.Port();      
        this.portD.setWorkflow(workflow);         
        this.addPort(this.portD, width/2, height);
    },
        
    
    edit : function() {
        
        params = {
        '_terp_model' : 'workflow.activity',
        '_terp_wkf_id' : WORKFLOW.id 
        }
        
        if(!isUndefinedOrNull(this.act_id))
            params['_terp_id'] = this.act_id;
            
        var act = getURL('/workflow/state/edit', params);
        openWindow(act);
        
    },
    

    ondblClick : function(event) {
        new InfoBox(this).show(event);
    },
    
    
    onClick : function(event) {
        
        if (WORKFLOW.selected==null)
            WORKFLOW.selected = this.workflow.currentSelection;
        else if (WORKFLOW.selected!=this)
            WORKFLOW.selected = this.workflow.currentSelection;            
        else {
            if (!this.dragged)
                new InfoBox(this).show(event);                
            else
                this.dragged = false;
        }
    },    
    
    
    onDragend : function() {
        this.dragged = this.isMoving
        draw2d.Node.prototype.onDragend.call(this);  
    },
    
    
    get_act_id : function() {
        return this.act_id;
    },
    
        
    __delete__ : function() {
        MochiKit.Signal.disconnectAll(this.getHTMLElement(), 'ondblclick', 'onclick');
    }
   
}

//Oval shape node

openerp.workflow.StateOval = new Class;
openerp.workflow.StateOval.prototype = $merge(openerp.workflow.StateOval.prototype, draw2d.Oval.prototype, openerp.workflow.StateBase.prototype)
openerp.workflow.StateOval.implement({
    
    initialize : function(params) {
        
        openerp.workflow.StateBase.call(this, params.id, params.action, params.kind, params.name);
        draw2d.Oval.call(this); 
        this.dragged = false;
        this.init_label(params.flow_start, params.flow_stop)
    }
        
});

//Rectangle shape node when it is a sub-workflow

openerp.workflow.StateRectangle = new Class;
openerp.workflow.StateRectangle.prototype = $merge(openerp.workflow.StateRectangle.prototype, draw2d.VectorFigure.prototype, openerp.workflow.StateBase.prototype)
openerp.workflow.StateRectangle.implement({
    
    initialize : function(params) {
        
        openerp.workflow.StateBase.call(this, params.id, params.action, params.kind, params.name);
        draw2d.VectorFigure.call(this);
        this.lineColor = new draw2d.Color(0,0,0);
        this.setLineWidth(1); 
        
        this.init_label(params.flow_start, params.flow_stop);
    },
    
    createHTMLElement : function() {
        
        var item = draw2d.VectorFigure.prototype.createHTMLElement.call(this);
        item.style.border = 1+"px solid "+this.lineColor.getHTMLStyle();
        
        if(this.bgColor!=null)
            item.style.backgroundColor=this.bgColor.getHTMLStyle();
            
        return item;
    }        
});

// vim: ts=4 sts=4 sw=4 si et

