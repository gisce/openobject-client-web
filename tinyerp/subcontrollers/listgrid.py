###############################################################################
#
# Copyright (C) 2007-TODAY Tiny ERP Pvt Ltd. All Rights Reserved.
#
# $Id$
#
# Developed by Tiny (http://openerp.com) and Axelor (http://axelor.com).
#
# WARNING: This program as such is intended to be used by professional
# programmers who take the whole responsibility of assessing all potential
# consequences resulting from its eventual inadequacies and bugs
# End users who are looking for a ready-to-use solution with commercial
# guarantees and support are strongly advised to contract a Free Software
# Service Company
#
# This program is Free Software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the 
# Free Software Foundation, Inc., 59 Temple Place - Suite 330, 
# Boston, MA  02111-1307, USA.
#
###############################################################################

import cherrypy

from turbogears import expose
from turbogears import controllers

from tinyerp import rpc
from tinyerp.tinyres import TinyResource

from tinyerp.utils import TinyDict
from tinyerp.utils import TinyForm
from tinyerp.utils import TinyFormError

import tinyerp.widgets as tw

import form
import search

class List(controllers.Controller, TinyResource):

    @expose('json')
    def save(self, **kw):
        params, data = TinyDict.split(kw)

        error = None
        error_field = None

        id = params.id or 0
        id = (id > 0) and id or 0

        model = params.parent.model
        
        if model != params.model and not params.parent.id:
            error = _("Parent record doesn't exists...")

        if error:
            return dict(error=error)

        try:
            proxy = rpc.RPCProxy(model)
            frm = TinyForm(**kw).to_python()

            data = {}
            if model != params.model:

                source = params.source
                data = frm.chain_get(source)
                
                if '__id' in data: data.pop('__id')
                
                fld = source.split('/')[-1]
                data = {fld : [(id and 1, id, data.copy())]} 
                myids = proxy.read([params.parent.id], [fld]);               

                proxy.write([params.parent.id], data, params.parent.context or {})
                
                myids2 = proxy.read([params.parent.id], [fld]);
                rec_id = [i for i in myids2[0][source] if i not in myids[0][source]]
            else:
                data = frm.copy()

                if id > 0:
                    proxy.write([id], data, params.parent.context or {})
                else:
                    proxy.create(data, params.parent.context or {})
                    id = proxy.create(data, params.parent.context or {})

        except TinyFormError, e:
            error_field = e.field
            error = ustr(e)
        except Exception, e:
            error = ustr(e)

        return dict(error_field=error_field, error=error, rec_id=rec_id)

    @expose('json')
    def remove(self, **kw):
        params, data = TinyDict.split(kw)

        error = None
        proxy = rpc.RPCProxy(params.model)

        if params.id:
            try:
                res = proxy.unlink([params.id])
            except Exception, e:
                error = ustr(e)

        return dict(error=error)

    @expose('json')
    def get(self, **kw):
        params, data = TinyDict.split(kw)

        params.ids = None
        source = (params.source or '') and str(params.source)

        params.view_type = 'form'

        if source == '_terp_list':
            params.view_type = 'tree'
            if params.search_domain:
                params.domain += params.search_domain

        frm = form.Form().create_form(params)

        wid = frm.screen.get_widgets_by_name(source, kind=tw.listgrid.List)[0]
        ids = wid.ids
        count = wid.count

        if params.edit_inline:
            wid.edit_inline = params.edit_inline

        return dict(ids=str(ids), count=count, view=ustr(wid.render()))
    
    @expose('json')
    def button_action(self, **kw):
        params, data = TinyDict.split(kw)
        
        error = None
        
        name = params.button_name
        btype = params.button_type
        
        id = params.id
        model = params.model

        id = (id or False) and int(id)
        ids = (id or []) and [id]
        
        try:
    
            if btype == 'workflow':
                rpc.session.execute('object', 'exec_workflow', model, name, id)
    
            elif btype == 'object':
                ctx = params.context or {}
                ctx.update(rpc.session.context.copy())
                rpc.session.execute('object', 'execute', model, name, ids, ctx)
    
            elif btype == 'action':
                from tinyerp.subcontrollers import actions
    
                action_id = int(name)
                action_type = actions.get_action_type(action_id)
    
                if action_type == 'ir.actions.wizard':
                    cherrypy.session['wizard_parent_form'] = params
    
                res = actions.execute_by_id(action_id, type=action_type, model=model, id=id, ids=ids)
                if res:
                    raise "Button action has returned another view..."
    
            else:
                raise 'Unallowed button type'
        except Exception, e:
            error = ustr(e)
            
        return dict(error=error)
    
    @expose('json')
    def get_editor(self, **kw):
        params, data = TinyDict.split(kw)
        source = (params.source or '') and str(params.source)
        
        current = params.chain_get(source)
       
        if current:
            model = current.model
            context = current.context or {}
        else:
            model = params.model
            context = params.context or {}
      
        proxy = rpc.RPCProxy(model)
        fields = proxy.fields_get()
        
        ctx = rpc.session.context.copy()
        ctx.update(context)
        
        if(params.edit_inline==-1):
            result = proxy.default_get(fields.keys(), ctx)
        else:
            result = proxy.read([params.edit_inline], [], ctx)[0];
            
        data = {}
        for k, v in result.items():
            if k == 'id': continue
            data[k] = {'type': fields[k]['type'], 'value': v}
        
        _form = TinyForm(**data)
        result = _form.from_python()
                
        for k, v in data.items():
            kind = v['type']
            value = v['value']
            
            if kind in ('many2one', 'many2many', 'reference'):
                result[k] = value
                
            if value and kind == 'many2one' and isinstance(value, int):
                value = rpc.RPCProxy(fields[k]['relation']).name_get([value], ctx)
                result[k] = value[0]
                
        return dict(source=source, res=result)
    