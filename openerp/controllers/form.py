###############################################################################
#
# Copyright (C) 2007-TODAY Tiny ERP Pvt Ltd. All Rights Reserved.
#
# $Id$
#
# Developed by Tiny (http://openerp.com) and Axelor (http://axelor.com).
#
# The OpenERP web client is distributed under the "OpenERP Public License".
# It's based on Mozilla Public License Version (MPL) 1.1 with following
# restrictions:
#
# -   All names, links and logos of Tiny, Open ERP and Axelor must be
#     kept as in original distribution without any changes in all software
#     screens, especially in start-up page and the software header, even if
#     the application source code has been changed or updated or code has been
#     added.
#
# -   All distributions of the software must keep source code with OEPL.
#
# -   All integrations to any other software must keep source code with OEPL.
#
# If you need commercial licence to remove this kind of restriction please
# contact us.
#
# You can see the MPL licence at: http://www.mozilla.org/MPL/MPL-1.1.html
#
###############################################################################

import re
import base64

from openerp.tools import expose
from openerp.tools import validate
from openerp.tools import redirect
from openerp.tools import error_handler
from openerp.tools import exception_handler

import cherrypy

from openerp import rpc
from openerp import tools
from openerp import common
from openerp import cache
from openerp import validators

from openerp import widgets as tw

from openerp.controllers.base import SecuredController

from openerp.utils import TinyDict
from openerp.utils import TinyForm

from openerp.widgets.binary import generate_url_for_picture

def make_domain(name, value, kind='char'):
    """A helper function to generate domain for the given name, value pair.
    Will be used for search window...
    """
        
    if isinstance(value, int) and not isinstance(value, bool):
        return [(name, '=', value)]

    if isinstance(value, dict):

        start = value.get('from')
        end = value.get('to')

        if start and end:
            return [(name, '>=', start), (name, '<=', end)]

        elif start:
            return [(name, '>=', start)]

        elif end:
            return [(name, '<=', end)]

        return None
    
    if kind == "selection" and value:
        return [(name, '=', value)]
    
    if isinstance(value, basestring) and value:
        return [(name, 'ilike', value)]

    if isinstance(value, bool) and value:
        return [(name, '=', 1)]

    return []

def search(model, offset=0, limit=20, domain=[], context={}, data={}):
    """A helper function to search for data by given criteria.

    @param model: the resource on which to make search
    @param offset: offset from when to start search
    @param limit: limit of the search result
    @param domain: the domain (search criteria)
    @param context: the context
    @param data: the form data

    @returns dict with list of ids count of records etc.
    """

    domain = domain or []
    context = context or {}
    data = data or {}
    
    proxy = rpc.RPCProxy(model)
    fields = proxy.fields_get([], {})
    
    search_domain = domain[:]
    search_data = {}

    for k, v in data.items():
        t = fields.get(k, {}).get('type', 'char')
        t = make_domain(k, v, t)

        if t:
            search_domain += t
            search_data[k] = v

    l = limit
    o = offset

    if l < 1: l = 20
    if o < 0: o = 0

    ctx = rpc.session.context.copy()
    ctx.update(context)

    ids = proxy.search(search_domain, o, l, 0, ctx)
    count = proxy.search_count(search_domain, ctx)

    return dict(model=model, ids=ids, count=count, offset=o, limit=l,
                search_domain=search_domain, search_data=search_data)

def get_validation_schema(self):
    """Generate validation schema for the given Form instance. Should be used
    to validate form inputs with @validate decorator.

    @param self: and instance of Form

    @returns a new instance of Form with validation schema
    """

    kw = cherrypy.request.params
    params, data = TinyDict.split(kw)

    # bypass validations, if saving from button in non-editable view
    if params.button and not params.editable and params.id:
        return None

    cherrypy.request.terp_validators = {}
    cherrypy.request.terp_data = data
    
    params.nodefault = True
    
    form = self.create_form(params)
    cherrypy.request.terp_form = form

    vals = cherrypy.request.terp_validators
    keys = vals.keys()
    for k in keys:
        if k not in kw:
            vals.pop(k)

    form.validator = validators.Schema(**vals)
    return form

def default_error_handler(self, tg_errors=None, **kw):
    """ Error handler for the given Form instance.

    @param self: an instance for Form
    @param tg_errors: errors
    """
    params, data = TinyDict.split(kw)
    return self.create(params, tg_errors=tg_errors)

def default_exception_handler(self, tg_exceptions=None, **kw):
    """ Exception handler for the given Form instance.

    @param self: an instance for Form
    @param tg_exceptions: exception
    """
    # let _cp_on_error handle the exception
    raise tg_exceptions

class Form(SecuredController):

    path = '/form'    # mapping from root

    def create_form(self, params, tg_errors=None):
        if tg_errors:
            return cherrypy.request.terp_form

        params.offset = params.offset or 0
        params.limit = params.limit or 20
        params.count = params.count or 0
        params.view_type = params.view_type or params.view_mode[0]

        return tw.form_view.ViewForm(params, name="view_form", action="/form/save")

    @expose(template="templates/form.mako")
    def create(self, params, tg_errors=None):

        params.view_type = params.view_type or params.view_mode[0]

        if params.view_type == 'tree':
            params.editable = True

        form = self.create_form(params, tg_errors)

        if not tg_errors:
            try:
                cherrypy.session.pop('remember_notebooks')
            except:
                self.reset_notebooks()

        editable = form.screen.editable
        mode = form.screen.view_type
        id = form.screen.id
        ids = form.screen.ids

        buttons = TinyDict()    # toolbar
        links = TinyDict()      # bottom links (customise view, ...)

        buttons.new = not editable or mode == 'tree'
        buttons.edit = not editable and mode == 'form'
        buttons.save = editable and mode == 'form'
        buttons.cancel = editable and mode == 'form'
        buttons.delete = not editable and mode == 'form'
        buttons.pager =  mode == 'form' # Pager will visible in edit and non-edit mode in form view.

        buttons.search = 'tree' in params.view_mode and mode != 'tree'
        buttons.graph = 'graph' in params.view_mode and mode != 'graph'
        buttons.form = 'form' in params.view_mode and mode != 'form'
        buttons.calendar = 'calendar' in params.view_mode and mode != 'calendar'
        buttons.gantt = 'gantt' in params.view_mode and mode != 'gantt'
        buttons.can_attach = id and mode == 'form'
        buttons.has_attach = buttons.can_attach and len(form.sidebar.attachments)
        buttons.i18n = not editable and mode == 'form'

        target = getattr(cherrypy.request, '_terp_view_target', None)
        
        show_header = target != 'new'
        if not int(cherrypy.request.params.get('_terp_header_footer', 1)):
            show_header = False
        cherrypy.request.show_header_footer = show_header
            
        buttons.toolbar = target != 'new' and not form.is_dashboard

        if cache.can_write('ir.ui.view'):
            links.view_manager = True
            
        if cache.can_write('workflow'):
            links.workflow_manager = True
            
        buttons.process = cache.can_read('process.process')

        pager = None
        if buttons.pager:
            pager = tw.pager.Pager(id=form.screen.id, ids=form.screen.ids, offset=form.screen.offset,
                                   limit=form.screen.limit, count=form.screen.count, view_type=params.view_type)

        return dict(form=form, pager=pager, buttons=buttons, links=links, path=self.path, show_header_footer=show_header)

    @profile("form.edit", log=['model', 'id'])
    @expose()
    def edit(self, model, id=False, ids=None, view_ids=None, view_mode=['form', 'tree'],
             source=None, domain=[], context={}, offset=0, limit=20, count=0, search_domain=None, **kw):

        params, data = TinyDict.split({'_terp_model': model,
                                       '_terp_id' : id,
                                       '_terp_ids' : ids,
                                       '_terp_view_ids' : view_ids,
                                       '_terp_view_mode' : view_mode,
                                       '_terp_source' : source,
                                       '_terp_domain' : domain,
                                       '_terp_context' : context,
                                       '_terp_offset': offset,
                                       '_terp_limit': limit,
                                       '_terp_count': count,
                                       '_terp_search_domain': search_domain})

        params.editable = True
        params.view_type = 'form'
        
        if kw.get('default_date'):
            params.context.update({'default_date' : kw.get('default_date')})
            
        cherrypy.request._terp_view_target = kw.get('target')

        if params.view_mode and 'form' not in params.view_mode:
            params.view_type = params.view_mode[-1]

        if params.view_type == 'tree':
            params.view_type = 'form'

        if not params.ids:
            params.count = 0
            params.offset = 0

        # On New O2M
        if params.source:
            current = TinyDict()
            current.id = False
            params[params.source] = current

        return self.create(params)

    @expose()
    def view(self, model, id, ids=None, view_ids=None, view_mode=['form', 'tree'],
            source=None, domain=[], context={}, offset=0, limit=20, count=0, search_domain=None, **kw):
        params, data = TinyDict.split({'_terp_model': model,
                                       '_terp_id' : id,
                                       '_terp_ids' : ids,
                                       '_terp_view_ids' : view_ids,
                                       '_terp_view_mode' : view_mode,
                                       '_terp_source' : source,
                                       '_terp_domain' : domain,
                                       '_terp_context' : context,
                                       '_terp_offset': offset,
                                       '_terp_limit': limit,
                                       '_terp_count': count,
                                       '_terp_search_domain': search_domain})

        params.editable = False
        params.view_type = 'form'
        
        cherrypy.request._terp_view_target = kw.get('target')

        if params.view_mode and 'form' not in params.view_mode:
            params.view_type = params.view_mode[-1]

        if params.view_type == 'tree':
            params.view_type = 'form'

        if not params.ids:
            params.count = 1
            params.offset = 0

        return self.create(params)

    @expose()
    def cancel(self, **kw):
        params, data = TinyDict.split(kw)

        if params.button:
            res = self.button_action(params)
            if res:
                return res
            raise redirect('/')

        if not params.id and params.ids:
            params.id = params.ids[0]

        if params.id and params.editable:
            raise redirect(self.path + "/view", model=params.model,
                                               id=params.id,
                                               ids=ustr(params.ids),
                                               view_ids=ustr(params.view_ids),
                                               view_mode=ustr(params.view_mode),
                                               domain=ustr(params.domain),
                                               context=ustr(params.context),
                                               offset=params.offset,
                                               limit=params.limit,
                                               count=params.count,
                                               search_domain=ustr(params.search_domain))

        params.view_type = 'tree'
        return self.create(params)

    @expose()
    @validate(form=get_validation_schema)
    @error_handler(default_error_handler)
    @exception_handler(default_exception_handler)
    def save(self, terp_save_only=False, **kw):
        """Controller method to save/button actions...

        @param tg_errors: TG special arg, used durring validation
        @param kw: keyword arguments

        @return: form view
        """
        params, data = TinyDict.split(kw)

        # remember the current page (tab) of notebooks
        cherrypy.session['remember_notebooks'] = True

        # bypass save, for button action in non-editable view
        if not (params.button and not params.editable and params.id):

            proxy = rpc.RPCProxy(params.model)

            if not params.id:
                ctx = params.context or {}
                ctx.update(rpc.session.context.copy())
                id = proxy.create(data, ctx)
                params.ids = (params.ids or []) + [int(id)]
                params.id = int(id)
                params.count += 1
            else:
                ctx = tools.context_with_concurrency_info(params.context, params.concurrency_info)
                id = proxy.write([params.id], data, ctx)

        button = params.button

        # perform button action
        if params.button:
            res = self.button_action(params)
            if res:
                return res

        current = params.chain_get(params.source or '')
        if current:
            current.id = None
            if not params.id:
                params.id = int(id)
        elif not button:
            params.editable = False

        if terp_save_only:
            return dict(params=params, data=data)


        def get_params(p, f):

            pp = p.chain_get(f)
            px = rpc.RPCProxy(p.model)

            _ids = pp.ids
            _all = px.read([p.id], [f])[0][f]
            _new = [i for i in _all if i not in _ids]

            pp.ids = _all
            if _new:
                pp.id = _new[0]

            return pp

        if params.source and len(params.source.split("/")) > 1:

            path = params.source.split("/")
            p = params
            for f in path:
                p = get_params(p, f)

            return self.create(params)

        args = {'model': params.model,
                'id': params.id,
                'ids': ustr(params.ids),
                'view_ids': ustr(params.view_ids),
                'view_mode': ustr(params.view_mode),
                'domain': ustr(params.domain),
                'context': ustr(params.context),
                'offset': params.offset,
                'limit': params.limit,
                'count': params.count,
                'search_domain': ustr(params.search_domain)}
                
        if not int(cherrypy.request.params.get('_terp_header_footer', 1)):
            args['target'] = 'new'

        if params.editable or params.source or params.return_edit:
            raise redirect(self.path + '/edit', source=params.source, **args)

        raise redirect(self.path + '/view', **args)

    def button_action(self, params):

        button = params.button

        name = ustr(button.name)
        name = name.rsplit('/', 1)[-1]

        btype = button.btype
        model = button.model
        id = button.id or params.id

        id = (id or False) and int(id)
        ids = (id or []) and [id]

        ctx = (params.context or {}).copy()
        ctx.update(rpc.session.context.copy())
        ctx.update(button.context or {})

        if btype == 'cancel':
            if name:
                button.btype = "object"
                params.id = False
                res = self.button_action(params)
                if res:
                    return res

            return """<html>
        <head>
            <script type="text/javascript">
                window.onload = function(evt){
                    if (window.opener) {
                        window.opener.setTimeout("window.location.reload()", 0);
                        window.close();
                    } else {
                        window.location.href = '/';
                    }
                }
            </script>
        </head>
        <body></body>
        </html>"""

        elif btype == 'save':
            params.id = False

        elif btype == 'workflow':
            res = rpc.session.execute('object', 'exec_workflow', model, name, id)
            if isinstance(res, dict):
                from openerp.controllers import actions
                return actions.execute(res, ids=[id])

        elif btype == 'object':
            res = rpc.session.execute('object', 'execute', model, name, ids, ctx)

            if isinstance(res, dict):
                from openerp.controllers import actions
                result = actions.execute(res, ids=[id])
                
                if result is None or type(result) == type({}):
                    return """<html>
                                <head>
                                    <script type="text/javascript">
                                        window.onload = function(evt){
                                            if (window.opener) {
                                                window.opener.setTimeout("window.location.reload()", 0);
                                                window.close();
                                            } else {
                                                window.location.href = '/';
                                            }
                                        }
                                    </script>
                                </head>
                                <body></body>
                            </html>"""
                else:
                    return result

        elif btype == 'action':
            from openerp.controllers import actions

            action_id = int(name)
            action_type = actions.get_action_type(action_id)

            if action_type == 'ir.actions.wizard':
                cherrypy.session['wizard_parent_form'] = self.path
                cherrypy.session['wizard_parent_params'] = params.parent_params or params

            res = actions.execute_by_id(action_id, type=action_type,
                                        model=model, id=id, ids=ids,
                                        context=ctx or {})
            if res:
                return res

        else:
            raise common.warning(_('Invalid button type'))

        params.button = None

    @expose()
    def duplicate(self, **kw):
        params, data = TinyDict.split(kw)

        id = params.id
        ctx = params.context
        model = params.model

        proxy = rpc.RPCProxy(model)
        new_id = proxy.copy(id, {}, ctx)

        if new_id:
            params.id = new_id
            params.ids += [int(new_id)]
            params.count += 1

        args = {'model': params.model,
                'id': params.id,
                'ids': ustr(params.ids),
                'view_ids': ustr(params.view_ids),
                'view_mode': ustr(params.view_mode),
                'domain': ustr(params.domain),
                'context': ustr(params.context),
                'offset': params.offset,
                'limit': params.limit,
                'count': params.count,
                'search_domain': ustr(params.search_domain)}

        if new_id:
            raise redirect(self.path + '/edit', **args)

        raise redirect(self.path + '/view', **args)

    @expose()
    def delete(self, **kw):
        params, data = TinyDict.split(kw)

        current = params.chain_get(params.source or '') or params
        proxy = rpc.RPCProxy(current.model)

        idx = -1
        if current.id:
            ctx = tools.context_with_concurrency_info(current.context, params.concurrency_info)
            res = proxy.unlink([current.id], ctx)
            idx = current.ids.index(current.id)
            current.ids.remove(current.id)
            params.count = 0 # invalidate count

            if idx == len(current.ids):
                idx = -1

        current.id = (current.ids or None) and current.ids[idx]

        self.reset_notebooks()

        args = {'model': params.model,
                'id': params.id,
                'ids': ustr(params.ids),
                'view_ids': ustr(params.view_ids),
                'view_mode': ustr(params.view_mode),
                'domain': ustr(params.domain),
                'context': ustr(params.context),
                'offset': params.offset,
                'limit': params.limit,
                'count': params.count,
                'search_domain': ustr(params.search_domain)}

        if not params.id:
            raise redirect(self.path + '/edit', **args)

        raise redirect(self.path + '/view', **args)

    @expose(content_type='application/octet-stream')
    def save_binary_data(self, _fname='file.dat', **kw):
        params, data = TinyDict.split(kw)

        cherrypy.response.headers['Content-Disposition'] = 'filename="%s"' % _fname;

        if params.datas:
            form = params.datas['form']
            res = form.get(params.field)
            return base64.decodestring(res)

        if len(params.model) > 1:
            params.model = params.model[0]
        if len(params.id) > 1:
            params.id = params.id[0]
        proxy = rpc.RPCProxy(params.model)
        res = proxy.read([params.id],[params.field], rpc.session.context)

        return base64.decodestring(res[0][params.field])

    @expose()
    def clear_binary_data(self, **kw):
        params, data = TinyDict.split(kw)

        proxy = rpc.RPCProxy(params.model)
        ctx = tools.context_with_concurrency_info(params.context, params.concurrency_info)

        if params.fname:
            proxy.write([params.id], {params.field: False, params.fname: False}, ctx)
        else:
            proxy.write([params.id], {params.field: False}, ctx)
            
        args = {'model': params.model,
                'id': params.id,
                'ids': ustr(params.ids),
                'view_ids': ustr(params.view_ids),
                'view_mode': ustr(params.view_mode),
                'domain': ustr(params.domain),
                'context': ustr(params.context),
                'offset': params.offset,
                'limit': params.limit,
                'count': params.count,
                'search_domain': ustr(params.search_domain)}
                
        raise redirect(self.path + '/edit', **args)

    @expose()
    @validate(form=get_validation_schema)
    @error_handler(default_error_handler)
    @exception_handler(default_exception_handler)
    def filter(self, **kw):
        params, data = TinyDict.split(kw)

        l = params.limit or 20
        o = params.offset or 0
        c = params.count or 0

        id = params.id or False
        ids = params.ids or []

        filter_action = params.filter_action

        if ids and filter_action == 'FIRST':
            o = 0
            id = ids[0]

        if ids and filter_action == 'LAST':
            o = c - c % l
            id = ids[-1]

        if ids and filter_action == 'PREV':
            if id == ids[0]:
                o -= l
            elif id in ids:
                id = ids[ids.index(id)-1]

        if ids and filter_action == 'NEXT':
            if id == ids[-1]:
                o += l
            elif id in ids:
                id = ids[ids.index(id)+1]
            elif id == False:
                o = 0
                id = ids[0]

        if filter_action:
            # remember the current page (tab) of notebooks
            cherrypy.session['remember_notebooks'] = True

        if params.offset != o:

            domain = params.domain
            if params.search_domain is not None:
                domain = params.search_domain
                data = params.search_data
            
            ctx = params.context or {}
            ctx.update(rpc.session.context.copy())            
            res = search(params.model, o, l, domain=domain, context=ctx, data=data)

            o = res['offset']
            l = res['limit']
            c = res['count']

            params.search_domain = res['search_domain']
            params.search_data = res['search_data']

            ids = res['ids']
            id = False

            if ids and filter_action in ('FIRST', 'NEXT'):
                id = ids[0]

            if ids and filter_action in ('LAST', 'PREV'):
                id = ids[-1]

        params.id = id
        params.ids = ids
        params.offset = o
        params.limit = l
        params.count = c

        return self.create(params)

    @expose()
    def find(self, **kw):
        kw['_terp_offset'] = None
        kw['_terp_limit'] = None

        kw['_terp_search_domain'] = None
        kw['_terp_search_data'] = None
        kw['_terp_filter_action'] = 'FIND'

        return self.filter(**kw)

    @expose()
    def first(self, **kw):
        kw['_terp_filter_action'] = 'FIRST'
        return self.filter(**kw)

    @expose()
    def last(self, **kw):
        kw['_terp_filter_action'] = 'LAST'
        return self.filter(**kw)

    @expose()
    def previous(self, **kw):
        if '_terp_source' in kw:
            return self.previous_o2m(**kw)

        kw['_terp_filter_action'] = 'PREV'
        return self.filter(**kw)

    @expose()
    def next(self, **kw):
        if '_terp_source' in kw:
            return self.next_o2m(**kw)

        kw['_terp_filter_action'] = 'NEXT'
        return self.filter(**kw)

    @expose()
    def previous_o2m(self, **kw):
        params, data = TinyDict.split(kw)

        current = params.chain_get(params.source or '') or params

        idx = -1

        if current.id:

            # save current record
            if params.editable:
                self.save(terp_save_only=True, **kw)

            idx = current.ids.index(current.id)
            idx = idx-1

            if idx == len(current.ids):
                idx = len(current.ids) -1

        if current.ids:
            current.id = current.ids[idx]

        return self.create(params)

    @expose()
    def next_o2m(self, **kw):
        params, data = TinyDict.split(kw)
        c = params.count or 0

        current = params.chain_get(params.source or '') or params

        idx = 0

        if current.id:

            # save current record
            if params.editable:
                self.save(terp_save_only=True, **kw)

            idx = current.ids.index(current.id)
            idx = idx + 1

            if idx == len(current.ids):
                idx = 0

        if current.ids:
            current.id = current.ids[idx]

        return self.create(params)

    @expose()
    def switch(self, **kw):
        params, data = TinyDict.split(kw)

        # switch the view
        params.view_type = params.source_view_type
        return self.create(params)

    @expose()
    def switch_o2m(self, **kw):

        params, data = TinyDict.split(kw)
        current = params.chain_get(params.source or '') or params

        current.view_type = params.source_view_type

        current.ids = current.ids or []
        if not current.id and current.ids:
            current.id = current.ids[0]

        try:
            frm = self.create_form(params)
            wid = frm.screen.get_widgets_by_name(params.source)[0]
        except Exception, e:
            return 'ERROR: ' + str(e)

        return wid.render()

    def do_action(self, name, adds={}, datas={}):
        params, data = TinyDict.split(datas)

        model = params.model

        id = params.id or False
        ids = params.selection or params.ids or []

        if params.view_type == 'form':
            #TODO: save current record
            ids = (id or []) and [id]

        if id and not ids:
            ids = [id]

        if len(ids):
            from openerp.controllers import actions
            return actions.execute_by_keyword(name, adds=adds, model=model, id=id, ids=ids, report_type='pdf')
        else:
            raise common.message(_("No record selected!"))

    @expose()
    def report(self, **kw):
        return self.do_action('client_print_multi', adds={'Print Screen': {'report_name':'printscreen.list',
                                                                           'name': _('Print Screen'),
                                                                           'type':'ir.actions.report.xml'}}, datas=kw)

    @expose()
    def action(self, **kw):
        params, data = TinyDict.split(kw)
        
        id = params.id or False
        ids = params.selection or []
        context = params.context or {}
        action = {}

        if data.get('datas'):
            action = eval(data.get('datas'))
            if not context and 'context' in action:
                context = eval(action['context'])
        type = action.get('type')
        act_id = params.action

        if not ids and id:
            ids = [id]

        if not id and ids:
            id = ids[0]

        domain = params.domain or []
        if not params.selection and not params.id:
            raise common.message(_('You must save this record to use the sidebar button!'))
        
        if not act_id:
            return self.do_action('client_action_multi', datas=kw)
        if type is None:
            action_type = rpc.RPCProxy('ir.actions.actions').read(act_id, ['type'], rpc.session.context)['type']
            action = rpc.session.execute('object', 'execute', action_type, 'read', act_id, False, rpc.session.context)

        action['domain'] = domain or []
        action['context'] = context or {}
        
        from openerp.controllers import actions
        return actions.execute(action, model=params.model, id=id, ids=ids, report_type='pdf')

    @expose()
    def dashlet(self, **kw):
        params, data = TinyDict.split(kw)
        current = params.chain_get(str(params.source) or '') or params

        return self.create(current)

    @expose('json', methods=('POST',))
    def on_change(self, **kw):

        data = kw.copy()

        callback = data.pop('_terp_callback')
        caller = data.pop('_terp_caller')
        model = data.pop('_terp_model')
        context = data.pop('_terp_context')

        try:
            context = eval(context) # convert to python dict
        except:
            context = {}

        match = re.match('^(.*?)\((.*)\)$', callback)

        if not match:
            raise common.error(_('Application Error!'), _('Wrong on_change trigger: %s') % callback)

        for k, v in data.items():
            try:
                data[k] = eval(v)
            except:
                pass

        result = {}

        prefix = ''
        if '/' in caller:
            prefix = caller.rsplit('/', 1)[0]

        ctx = TinyForm(**kw).to_python(safe=True)
        pctx = ctx

        if prefix:
            ctx = ctx.chain_get(prefix)

            if '/' in prefix:
                pprefix = prefix.rsplit('/', 1)[0]
                pctx = pctx.chain_get(pprefix)

        ctx2 = rpc.session.context.copy()
        ctx2.update(context or {})

        ctx['parent'] = pctx
        ctx['context'] = ctx2

        func_name = match.group(1)
        arg_names = [n.strip() for n in match.group(2).split(',')]

        ctx_dict = dict(**ctx)
        args = [tools.expr_eval(arg, ctx_dict) for arg in arg_names]

        proxy = rpc.RPCProxy(model)

        ids = ctx.id and [ctx.id] or []

        try:
            response = getattr(proxy, func_name)(ids, *args)
        except Exception, e:
            return dict(error=ustr(e))
        
        if response is False: # response is False when creating new record for inherited view.
            response = {}
            
        if 'value' not in response:
            response['value'] = {}
            
        result.update(response)

        # apply validators (transform values from python)
        values = result['value']
        values2 = {}
        
        for k, v in values.items():
            key = ((prefix or '') and prefix + '/') + k
            kind = ''
            if data.get(key):
                kind =  data[key].get('type')
            
            if key in data and key != 'id':
                values2[k] = data[key]
                values2[k]['value'] = v
            else:
                values2[k] = {'value': v}
            
            if kind == 'float':
                field = proxy.fields_get([k], ctx2)
                digit = field[k].get('digits')
                if digit: digit = digit[1]
                values2[k]['digit'] = digit or 2

        values = TinyForm(**values2).from_python().make_plain()

        # get name of m2o and reference fields
        for k, v in values2.items():
            kind = v.get('type')
            relation = v.get('relation')

            if relation and kind in ('many2one', 'reference') and values.get(k):
                values[k] = [values[k], tw.many2one.get_name(relation, values[k])]

            if kind == 'picture':
                values[k] = generate_url_for_picture(model, k, ctx.id, values[k])                
                
        result['value'] = values

        # convert domains in string to prevent them being converted in JSON
        if 'domain' in result:
            for k in result['domain']:
                result['domain'][k] = ustr(result['domain'][k])

        return result

    @expose('json')
    def get_context_menu(self, model, field, kind="char", relation=None, value=None):

        defaults = []
        actions = []
        relates = []

        defaults = [{'text': 'Set to default value', 'action': "set_to_default('%s', '%s')" % (field, model)},
                    {'text': 'Set as default', 'action': "set_as_default('%s', '%s')"  % (field, model)}]

        if kind=='many2one':

            act = (value or None) and "javascript: void(0)"

            actions = [{'text': 'Action', 'action': act and "do_action(null, '%s', '%s', this)" %(field, relation)},
                       {'text': 'Report', 'action': act and "do_report('%s', '%s')" %(field, relation)}]

            res = rpc.RPCProxy('ir.values').get('action', 'client_action_relate', [(relation, False)], False, rpc.session.context)
            res = [x[2] for x in res]

            for x in res:
                act = (value or None) and "javascript: void(0)"
                x['string'] = x['name']
                relates += [{'text': '... '+x['name'],
                             'action': act and "do_action(%s, '%s', '%s', this)" %(x['id'], field, relation),
                             'domain': x.get('domain', []),
                             'context': x.get('context', {})}]

        return dict(defaults=defaults, actions=actions, relates=relates)

    @expose('json')
    def get_default_value(self, model, field):

        field = field.split('/')[-1]

        res = rpc.RPCProxy(model).default_get([field])
        value = res.get(field)

        return dict(value=value)

    def reset_notebooks(self):
        for name in cherrypy.request.cookie.keys():
            if name.endswith('TGTabber'):
                cherrypy.response.cookie[name] = 0

    @expose('json')
    def change_default_get(self, **kw):
        params, data = TinyDict.split(kw)

        ctx = rpc.session.context.copy()
        ctx.update(params.context or {})

        model = params.model
        field = params.caller.split('/')[-1]
        value = params.value or False

        proxy = rpc.RPCProxy('ir.values')
        values = proxy.get('default', '%s=%s' % (field, value), [(model, False)], False, ctx)

        data = {}
        for index, fname, value in values:
            data[fname] = value

        return dict(values=data)


# vim: ts=4 sts=4 sw=4 si et
