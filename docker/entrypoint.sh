#!/bin/bash

echo "Creating /etc/openerp-web.cfg"
cd /etc/
sh /tmp/openerp-web.cfg.tmpl

if [ "$1" == "" ] || [ "$1" == "openerp-web-client" ]; then
    echo "Running web client"
    exec openerp-web -c /etc/openerp-web.cfg
else
  exec "$@"
fi