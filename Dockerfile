FROM python:2.7

COPY . /build
COPY ./docker/entrypoint.sh ./entrypoint.sh
COPY ./docker/openerp-web.cfg.tmpl ./tmp/openerp-web.cfg.tmpl

WORKDIR /build
RUN python setup.py install

ENTRYPOINT ["/entrypoint.sh"]
CMD ["openerp-web-client"]
