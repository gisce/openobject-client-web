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

import time
import math
import copy
import locale
import xml.dom.minidom

import cherrypy

from openerp import rpc
from openerp import tools
from openerp import icons
from openerp import common

from openerp.i18n import format

import form

from pager import Pager

from interface import TinyWidget
from interface import TinyInputWidget
from interface import ConcurrencyInfo

from base import CSSLink, JSLink

class List(TinyWidget):

    template = "templates/listgrid.mako"
    params = ['name', 'data', 'columns', 'headers', 'model', 'selectable', 'editable',
              'pageable', 'selector', 'source', 'offset', 'limit', 'show_links', 'editors',
              'hiddens', 'edit_inline', 'field_total', 'link', 'checkbox_name', 'm2m', 'min_rows']

    member_widgets = ['pager', 'buttons', 'editors', 'concurrency_info']

    pager = None
    field_total = {}
    editors = {}
    hiddens = []
    buttons = []

    edit_inline = None
    data = None
    columns = 0
    headers = None
    model = None
    selectable = False
    editable = False
    pageable = False
    show_links = 1
    source = None
    checkbox_name = True
    min_rows = 5

    css = [CSSLink('openerp', 'css/listgrid.css')]
    javascript = [JSLink('openerp', 'javascript/listgrid.js'),
                  JSLink('openerp', 'javascript/sortablegrid.js')]

    def __init__(self, name, model, view, ids=[], domain=[], context={}, **kw):

        super(List, self).__init__(name=name, model=model, ids=ids)

        self.context = context or {}
        self.domain = domain or []

        if name.endswith('/'):
            self._name = name[:-1]

        if name != '_terp_list':
            self.source = self.name.replace('/', '/') or None

        self.selectable = kw.get('selectable', 0)
        self.editable = kw.get('editable', False)
        self.pageable = kw.get('pageable', True)

        self.offset = kw.get('offset', 0)
        self.limit = kw.get('limit', 0)
        self.count = kw.get('count', 0)
        self.link = kw.get('nolinks', 1)
        self.attr_limit = 0
        self.m2m = False
        self.concurrency_info = None
        self.selector = None

        if self.selectable == 1:
            self.selector = 'radio'

        if self.selectable == 2:
            self.selector = 'checkbox'

        fields = view['fields']
        dom = xml.dom.minidom.parseString(view['arch'].encode('utf-8'))
        root = dom.childNodes[0]

        attrs = tools.node_attributes(root)
        self.string = attrs.get('string','')

        # is relational field (M2M/O2M)
        if self.source:            
            self.attr_limit = cherrypy.request.app.config['openerp-web'].get('child.listgrid.limit', 20)
            self.attr_limit = int(attrs.get('limit', self.attr_limit))            
        else:
            self.min_rows = 5

        try:
            self.min_rows = int(attrs.get('min_rows'))
        except:
            pass

        try:
            if self.limit == 0:
                self.limit = self.attr_limit

        except:
            pass

        self.colors = {}
        for color_spec in attrs.get('colors', '').split(';'):
            if color_spec:
                colour, test = color_spec.split(':')
                self.colors[colour] = test

        proxy = rpc.RPCProxy(model)

        if ids == None:
            if self.limit > 0:
                ids = proxy.search(domain, self.offset, self.limit, 0, context)
            else:
                ids = proxy.search(domain, 0, 0, 0, context)

            self.count = proxy.search_count(domain, context)

        self.data_dict = {}
        data = []

        if ids and not isinstance(ids, list):
            ids = [ids]

        if ids and len(ids) > 0:

            ctx = rpc.session.context.copy()
            ctx.update(context)
            
            if self.limit and len(ids) > self.limit and self.limit != -1:
                new_ids = ids[self.offset:self.offset+self.limit]
                data = proxy.read(new_ids, fields.keys() + ['__last_update'], ctx)
            else:
                data = proxy.read(ids, fields.keys() + ['__last_update'], ctx)
            self._update_concurrency_info(self.model, data)
            self.concurrency_info = ConcurrencyInfo(self.model, ids)

            for item in data:
                self.data_dict[item['id']] = item.copy()

            self.ids = ids

        self.values = copy.deepcopy(data)
        self.headers, self.hiddens, self.data, self.field_total, self.buttons = self.parse(root, fields, data)

        for k, v in self.field_total.items():
            self.field_total[k][1] = self.do_sum(self.data, k)

        self.columns = len(self.headers)

        self.columns += (self.selectable or 0) and 1
        self.columns += (self.editable or 0) and 2
        self.columns += (self.buttons or 0) and 1

        if self.pageable:
            self.pager = Pager(ids=self.ids, offset=self.offset, limit=self.limit, count=self.count, def_limit=self.attr_limit)
            self.pager._name = self.name

        # make editors
        if self.editable and attrs.get('editable') in ('top', 'bottom'):

            for f, fa in self.headers:
                k = fa.get('type', 'char')
                if k not in form.WIDGETS:
                    k = 'char'

                fa['prefix'] = '_terp_listfields' + ((self.name != '_terp_list' or '') and '/' + self.name)
                fa['inline'] = True
                self.editors[f] = form.WIDGETS[k](**fa)

            # generate hidden fields
            for f, fa in self.hiddens:
                k = fa.get('type', 'char')
                if k not in form.WIDGETS:
                    k = 'char'

                fa['prefix'] = '_terp_listfields' + ((self.name != '_terp_list' or '') and '/' + self.name)
                self.editors[f] = form.Hidden(**fa)

        # limit the data
        if self.pageable and len(self.data) > self.limit and self.limit != -1:
            self.data = self.data[self.offset:]
            self.data = self.data[:min(self.limit, len(self.data))]

    def do_sum(self, data, field):
        sum = 0.0

        for d in data:
            value = d[field].value
            sum += value

        attrs = {}
        if data:
            d = data[0]
            attrs = d[field].attrs

        digits = attrs.get('digits', (16,2))
        if isinstance(digits, basestring):
            digits = eval(digits)

        integer, digit = digits
        return format.format_decimal(sum or 0.0, digit)

    def display(self, value=None, **params):

        # set editor values
        if self.editors and self.edit_inline:

            ctx = rpc.session.context.copy()
            ctx.update(self.context)

            fields = [f for f, fa in self.headers]
            fields += [f for f, fa in self.hiddens]

            proxy = rpc.RPCProxy(self.model)

            values = {}
            defaults = {}

            # update values according to domain
            for d in self.domain:
                if d[0] in fields:
                    if d[1] == '=':
                        values[d[0]] = d[2]
                    if d[1] == 'in' and len(d[2]) == 1:
                        values[d[0]] = d[2][0]

            if self.edit_inline > 0:
                values = self.data_dict[self.edit_inline]
            else:
                defaults = proxy.default_get(fields, ctx)

            for k, v in defaults.items():
                values.setdefault(k, v)

            for f in fields:
                if f in values:
                    self.editors[f].set_value(values[f])

        return super(List, self).display(value, **params)

    def parse(self, root, fields, data=[]):
        """Parse the given node to generate valid list headers.

        @param root: the root node of the view
        @param fields: the fields

        @return: an instance of List
        """

        headers = []
        hiddens = []
        buttons = []
        field_total = {}
        values  = [row.copy() for row in data]

        myfields = [] # check for duplicate fields

        for node in root.childNodes:

            if node.nodeName == 'button':
                attrs = tools.node_attributes(node)
                buttons += [Button(**attrs)]

            elif node.nodeName == 'field':
                attrs = tools.node_attributes(node)

                if 'name' in attrs:

                    name = attrs['name']

                    if name in myfields:
                        print "-"*30
                        print " malformed view for:", self.model
                        print " duplicate field:", name
                        print "-"*30
                        raise common.error(_('Application Error!'), _('Invalid view, duplicate field: %s') % name)

                    myfields.append(name)

                    if attrs.get('widget', False):
                        if attrs['widget']=='one2many_list':
                            attrs['widget']='one2many'
                        attrs['type'] = attrs['widget']

                    try:
                        fields[name].update(attrs)
                    except:
                        print "-"*30,"\n malformed tag for:", attrs
                        print "-"*30
                        raise

                    kind = fields[name]['type']

                    if kind not in CELLTYPES:
                        kind = 'char'

                    fields[name].update(attrs)

                    invisible = False
                    try:
                        visval = fields[name].get('invisible', 'False')
                        invisible = eval(visval, {'context': self.context})
                    except:
                        pass

                    if invisible:
                        hiddens += [(name, fields[name])]
                        continue

                    if 'sum' in attrs:
                        field_total[name] = [attrs['sum'], 0.0]

                    for i, row in enumerate(data):

                        row_value = values[i]
                        cell = CELLTYPES[kind](value=row_value.get(name, False), **fields[name])

                        for color, expr in self.colors.items():
                            try:

                                d = row_value.copy()
                                d['current_date'] = time.strftime('%Y-%m-%d')
                                d['time'] = time
                                d['active_id'] = rpc.session.active_id or False

                                if tools.expr_eval(expr, d):
                                    cell.color = color
                                    break
                            except:
                                pass

                        row[name] = cell

                    headers += [(name, fields[name])]

        return headers, hiddens, data, field_total, buttons

class Char(TinyWidget):

    template = """\
    <span>${text}</span>
    """

    params = ['text', 'link', 'value']

    def __init__(self, **attrs):

        super(Char, self).__init__(**attrs)

        self.attrs = attrs.copy()

        self.text = self.get_text()
        self.link = self.get_link()

        self.color = None
        self.onclick = None

    def get_text(self):
        return self.value or ''

    def get_link(self):
        return None

    def get_sortable_text(self):
        """ If returns anything other then None, the return value will be
        used to sort the listgrid. Useful for localized data.
        """
        return None

    def __unicode__(self):
        return ustr(self.text)

    def __str__(self):
        return ustr(self.text)

class M2O(Char):

    template = """\
        <span id="${name}" class="m2o" name="${name}" ${py.attrs(value=val, relation=relation, context=ctx, domain=domain, link=link)}>
            % if link:
                <a href="${link}">${text}</a>
            % else:
                ${text}
            % endif
        </span>
    """
    
    params=['relation', 'text', 'domain', 'context', 'link', 'readonly', 'val']
    
    def __init__(self, **attrs):        
        super(M2O, self).__init__(**attrs)

    def get_text(self):

        if isinstance(self.value, int):
            from many2one import get_name as _m2o_get_name
            self.value = self.value, _m2o_get_name(self.attrs['relation'], self.value)
            
        self.val = self.value
        if self.value and len(self.value) > 0:
            self.val = self.value[0]
            return self.value[-1]

        return ''

    def get_link(self):
        m2o_link = int(self.attrs.get('link', 1))

        if m2o_link == 1:
            return tools.url('/form/view', model=self.attrs['relation'], id=(self.value or False) and self.value[0])
        else:
            return None

class O2M(Char):

    def get_text(self):
        return "(%d)" % len(self.value)

class M2M(Char):

    def get_text(self):
        return "(%d)" % len(self.value)

class Selection(Char):

    def get_text(self):
        if self.value:

            if isinstance(self.value, (tuple, list)):
                self.value = self.value[0]

            selection = self.attrs['selection']
            for k, v in selection:
                if k == self.value:
                    return v
        return ''

class Float(Char):

    def get_text(self):
        digits = self.attrs.get('digits', (16,2))
        if isinstance(digits, basestring):
            digits = eval(digits)

        integer, digit = digits
        return format.format_decimal(self.value or 0.0, digit)

    def get_sortable_text(self):
        return ustr(self.value or '0.0')

class FloatTime(Char):

    def get_text(self):
        val = self.value or 0.0
        t = '%02d:%02d' % (math.floor(abs(val)),round(abs(val)%1+0.01,2) * 60)

        hour, min = t.split(':')
        if int(min) == 60:
            t = str(int(hour) + 1) + ":00"
        if val < 0:
            t = '-' + t

        return t

class Int(Char):

    def get_text(self):
        if self.value:
            return int(self.value)

        return 0

class ProgressBar(Char):

    params = ['range']

    template = """
        <div style="position: relative; border: 1px solid gray; font-size: 11px;">&nbsp;
            <div style="position: absolute; top:0px; left: 0px; background: #afafaf; width: ${range}%; height: 100%;"></div>
            <div style="position: absolute; top:0px; left: 0px; width: 100%; height: 100%; text-align: center">${text}%</div>
        </div>
    """

    def get_text(self):
        if isinstance(self.value, float):
            self.value = '%.2f' % (self.value)
            self.value = float(self.value)

            if self.value > 100.0:
                self.range = 100.0
            else:
                self.range = self.value
            return self.value
        else:
            self.value = '%d' % (self.value)
            return self.value

class DateTime(Char):

    def get_text(self):
        return format.format_datetime(self.value, kind=self.attrs.get('type', 'datetime'))

    def get_sortable_text(self):
        return ustr(self.value or '')

class Boolean(Char):

    def get_text(self):
        if int(self.value) == 1:
            return _('Yes')
        else:
            return _('No')

class Button(TinyInputWidget):

    params = ['icon', 'id', 'parent_grid', 'btype', 'confirm', 'width', 'context']

    template="""
    % if visible and not icon:
    <button type="button" ${py.attrs(attrs, context=ctx)} title="${help}" style="min-width: ${width}px;"
        onclick="new ListView('${parent_grid}').onButtonClick('${name}', '${btype}', ${id}, '${confirm}', getNodeAttribute(this, 'context'))">
        ${string}
    </button>
    % endif
    % if visible and icon:
    <img height="16" width="16" class="listImage" src="${icon}" title="${help}" context="${ctx}" ${py.attrs(attrs)}
        onclick="new ListView('${parent_grid}').onButtonClick('${name}', '${btype}', ${id}, '${confirm}', getNodeAttribute(this, 'context'))"/>
    % endif
    % if not visible and not icon:
    <span>&nbsp;</span>
    % endif
    """

    def __init__(self, **attrs):
        super(Button, self).__init__(**attrs)

        self.states = attrs.get('states')
        if self.states:
            self.states = self.states.split(',')

        self.btype = attrs.get('special', attrs.get('type', 'workflow'))
        self.icon = attrs.get('icon')

        if self.icon:
            self.icon = icons.get_icon(self.icon)

        self.context = attrs.get('context', {})

        self.help = self.help or self.string
        self.confirm = attrs.get('confirm') or ''
        self.readonly = False

        self.width = attrs.get('width', 16)

    def params_from(self, data):

        id = data.get('id')
        visible = True

        if self.states:
            state = data.get('state')
            state = ((state or False) and state.value) or 'draft'
            visible = state in self.states
        visible = not self.attrs.get('invisible') and visible

        return dict(id=id, visible=visible)


CELLTYPES = {
        'char':Char,
        'many2one':M2O,
        'datetime':DateTime,
        'date':DateTime,
        'one2many':O2M,
        'many2many':M2M,
        'selection':Selection,
        'float':Float,
        'float_time':FloatTime,
        'integer':Int,
        'boolean' : Boolean,
        'progressbar' : ProgressBar
}

# vim: ts=4 sts=4 sw=4 si et

