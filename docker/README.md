# Docker

## Build the docker image

```bash
docker build -t openerp-web .
```

## Run the docker image

```bash
docker run -d -p 8000:8000 openerp-web
```

## Configuration

You can configure the web client setting environment variables.

```bash
expose ERP_HOST=192.168.0.8
expose ERP_PORT=8069
expose ERP_PROTOCOL=http

docker run -d -p 8000:8000 openerp-web
```

Or passing the environment variables as parameters

```bash
docker run -e "ERP_HOST=192.168.0.8" -p 8000:8000 -d openerp-web
```
