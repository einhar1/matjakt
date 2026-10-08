# The exact verified dist directory is packaged; no second frontend build.
FROM nginxinc/nginx-unprivileged:1.28.2-alpine@sha256:209331cfcaec00da781f5b8a38e0d1c0abd00cb2b51e6ad385a30abbbdb04e15
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 8080
