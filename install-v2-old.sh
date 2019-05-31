#!/bin/sh

# Deploy our cool tool to DigitalOCean.
# Make sure you set the DIGITALOCEAN_TOKEN environment variable to your API token before running.

set -e     # Stop on first error  
set -u     # Stop if an unbound variable is referenced

DIGITALOCEAN_TOKEN=
CLOUDFLARE_TOKEN=
# DIGITALOCEAN_TOKEN=123
# CLOUDFLARE_TOKEN=456
CLOUDFLARE_EMAIL=
CLOUDFLARE_ZONE_ID=


DEFAULT_PLATFORM_REPO="https://github.com/secondai/env_cloud_docker_default.git"
DEFAULT_ZIP="https://github.com/secondai/base.second.cloud/archive/master.zip"
DEFAULT_LAUNCH_STARTUP_PATH="services.second.default.startup"
DEFAULT_INCOMING_PATH="services.second.default.input"
DEFAULT_DB_TABLE_NODES="nodes"
DEFAULT_SECOND_SUBDOMAIN="test1246.getasecond.com"
DEFAULT_AUTHORIZED_KEYS=""
DEFAULT_PASSPHRASE="test"


PLATFORM_REPO=${PLATFORM_REPO:-$DEFAULT_PLATFORM_REPO}
ZIP=${ZIP:-$DEFAULT_ZIP}
LAUNCH_STARTUP_PATH=${LAUNCH_STARTUP_PATH:-$DEFAULT_LAUNCH_STARTUP_PATH}
INCOMING_PATH=${INCOMING_PATH:-$DEFAULT_INCOMING_PATH}
DB_TABLE_NODES=${DB_TABLE_NODES:-$DEFAULT_DB_TABLE_NODES}
SECOND_SUBDOMAIN=${SECOND_SUBDOMAIN:-$DEFAULT_SECOND_SUBDOMAIN}
AUTHORIZED_KEYS=${AUTHORIZED_KEYS:-$DEFAULT_AUTHORIZED_KEYS}
PASSPHRASE=${PASSPHRASE:-$DEFAULT_PASSPHRASE}

RUNCMD=$(cat <<-END
#cloud-config

runcmd:  
  - apt-get update
  - apt-get -y install git curl
  - export HOSTNAME=\$(curl -s http://169.254.169.254/metadata/v1/hostname)
  - export PUBLIC_IPV4=\$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
  - 'curl -X POST "http://requestbin.fullcontact.com/1jef3zw1" -H "X-Auth-Email: $CLOUDFLARE_EMAIL" -H "X-Auth-Key: $CLOUDFLARE_TOKEN" -H "Content-Type: application/json" --data "{"type":"A","name":"$SECOND_SUBDOMAIN","content":"\$PUBLIC_IPV4","ttl":1,"priority":10,"proxied":false}"'
END
)

# http://requestbin.fullcontact.com/1jef3zw1
# https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records
echo "$RUNCMD"


# curl -X POST http://requestbin.fullcontact.com/1jef3zw1 \
curl -X POST https://api.digitalocean.com/v2/droplets \
-H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
-H 'Content-Type: application/json' \
-d "{\"name\":\"$SECOND_SUBDOMAIN\", \"region\":\"nyc3\", \"size\":\"512mb\", 
     \"image\":\"47402941\", \"ssh_keys\":[\"76:32:9a:ba:37:98:03:fe:09:b4:43:21:42:dd:0e:03\"],
     \"user_data\":\"$RUNCMD\"}"



# RUNCMD=$(cat <<-'END'
# #cloud-config

# runcmd:  
#   - export HOSTNAME=$(curl -s http://169.254.169.254/metadata/v1/hostname)
#   - export PUBLIC_IPV4=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
# END
# )

# # printf -v RUNCMD "%q\n" "$RUNCMD"

# curl -X POST http://requestbin.fullcontact.com/1jef3zw1 -v \
# -H 'Content-Type: application/json' \
# -d "{\"user_data\":\"$RUNCMD\"}"



