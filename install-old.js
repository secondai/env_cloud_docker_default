#!/bin/node 

const https = require('https')


let DIGITALOCEAN_TOKEN=process.argv.DIGITALOCEAN_TOKEN || "";
let CLOUDFLARE_TOKEN=process.argv.CLOUDFLARE_TOKEN || "";
let CLOUDFLARE_EMAIL=process.argv.CLOUDFLARE_EMAIL || "";
let CLOUDFLARE_ZONE_ID=process.argv.CLOUDFLARE_ZONE_ID || "";

let SECOND_SUBDOMAIN = process.argv.SECOND_SUBDOMAIN || ""; // fqdn: test1.getasecond.com

let PLATFORM_REPO = process.argv.PLATFORM_REPO || "https://github.com/secondai/env_cloud_docker_default.git";
let ZIP = process.argv.ZIP || "https://github.com/secondai/base.second.cloud/archive/master.zip";;
let LAUNCH_STARTUP_PATH = process.argv.LAUNCH_STARTUP_PATH || "services.second.default.startup";;
let INCOMING_PATH = process.argv.INCOMING_PATH || "services.second.default.input";;
let DB_TABLE_NODES = process.argv.DB_TABLE_NODES || "nodes";
let AUTHORIZED_KEYS = process.argv.AUTHORIZED_KEYS || "";
let PASSPHRASE = process.argv.PASSPHRASE || "test";


let RUNCMD = `#cloud-config

runcmd:  
  - apt-get update
  - apt-get -y install git curl
  - export HOSTNAME=\$(curl -s http://169.254.169.254/metadata/v1/hostname)
  - export PUBLIC_IPV4=\$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
  - 'curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" -H "X-Auth-Key: ${CLOUDFLARE_TOKEN}" -H "Content-Type: application/json" -d "{\\"type\\":\\"A\\",\\"name\\":\\"${SECOND_SUBDOMAIN}\\",\\"content\\":\\"\$PUBLIC_IPV4\\",\\"ttl\\":1,\\"priority\\":10,\\"proxied\\":false}"'
`

// additional runcmd's (from install-old.sh):
// - run docker-compose with correct environment variables (instead of keeping in .env) 


console.log('RUNCMD:', RUNCMD);
// throw 'OK'

// curl -X POST "http://requestbin.fullcontact.com/1jef3zw1" -H "Content-Type: application/json" -d "{"type":"A","name":"test1","content":"ok","ttl":1,"priority":10,"proxied":false}"

// # http://requestbin.fullcontact.com/1jef3zw1
// # https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records
// echo "$RUNCMD"


// // # curl -X POST http://requestbin.fullcontact.com/1jef3zw1 \
// curl -X POST https://api.digitalocean.com/v2/droplets \
// -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
// -H 'Content-Type: application/json' \
// -d "{\"name\":\"$SECOND_SUBDOMAIN\", \"region\":\"nyc3\", \"size\":\"512mb\", 
//      \"image\":\"47402941\", \"ssh_keys\":[\"76:32:9a:ba:37:98:03:fe:09:b4:43:21:42:dd:0e:03\"],
//      \"user_data\":\"$RUNCMD\"}"



const data = JSON.stringify({
	"name": SECOND_SUBDOMAIN,
	"region":"nyc3",
	"size":"512mb",
	"image":"47402941", // FIX THIS IMAGE ID! (should be a docker-compose image) 
	"ssh_keys":["76:32:9a:ba:37:98:03:fe:09:b4:43:21:42:dd:0e:03"],
	"user_data": RUNCMD
 },null,2)

const options = {
  hostname: 'api.digitalocean.com',
  path: '/v2/droplets',
  // hostname: 'requestbin.fullcontact.com',
  // path: '/1jef3zw1',
  port: 443,
  method: 'POST',
  headers: {
  	'Authorization' : `Bearer ${DIGITALOCEAN_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`)

  res.on('data', (d) => {
    process.stdout.write(d)
  })
})

req.on('error', (error) => {
  console.error(error)
})

req.write(data)
req.end()



// # Deploy our cool tool to DigitalOCean.
// # Make sure you set the DIGITALOCEAN_TOKEN environment variable to your API token before running.

// set -e     # Stop on first error  
// set -u     # Stop if an unbound variable is referenced

// DIGITALOCEAN_TOKEN=02ba11f5dee46a7f196ec0cbf2910bbb8e8660b270abe863f39c30c89d26fc39
// CLOUDFLARE_TOKEN=c45e0f6bec6c6b62578f986cdb7ef59228d5d
// # DIGITALOCEAN_TOKEN=123
// # CLOUDFLARE_TOKEN=456
// CLOUDFLARE_EMAIL=nicholas.a.reed@gmail.com
// CLOUDFLARE_ZONE_ID=7fd9efef81bfa6e8a14f2a61da313b0b


// DEFAULT_PLATFORM_REPO="https://github.com/secondai/env_cloud_docker_default.git"
// DEFAULT_ZIP="https://github.com/secondai/base.second.cloud/archive/master.zip"
// DEFAULT_LAUNCH_STARTUP_PATH="services.second.default.startup"
// DEFAULT_INCOMING_PATH="services.second.default.input"
// DEFAULT_DB_TABLE_NODES="nodes"
// DEFAULT_SECOND_SUBDOMAIN="test1246.getasecond.com"
// DEFAULT_AUTHORIZED_KEYS=""
// DEFAULT_PASSPHRASE="test"


// PLATFORM_REPO=${PLATFORM_REPO:-$DEFAULT_PLATFORM_REPO}
// ZIP=${ZIP:-$DEFAULT_ZIP}
// LAUNCH_STARTUP_PATH=${LAUNCH_STARTUP_PATH:-$DEFAULT_LAUNCH_STARTUP_PATH}
// INCOMING_PATH=${INCOMING_PATH:-$DEFAULT_INCOMING_PATH}
// DB_TABLE_NODES=${DB_TABLE_NODES:-$DEFAULT_DB_TABLE_NODES}
// SECOND_SUBDOMAIN=${SECOND_SUBDOMAIN:-$DEFAULT_SECOND_SUBDOMAIN}
// AUTHORIZED_KEYS=${AUTHORIZED_KEYS:-$DEFAULT_AUTHORIZED_KEYS}
// PASSPHRASE=${PASSPHRASE:-$DEFAULT_PASSPHRASE}

// RUNCMD=$(cat <<-END
// #cloud-config

// runcmd:  
//   - apt-get update
//   - apt-get -y install git curl
//   - export HOSTNAME=\$(curl -s http://169.254.169.254/metadata/v1/hostname)
//   - export PUBLIC_IPV4=\$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
//   - 'curl -X POST "http://requestbin.fullcontact.com/1jef3zw1" -H "X-Auth-Email: $CLOUDFLARE_EMAIL" -H "X-Auth-Key: $CLOUDFLARE_TOKEN" -H "Content-Type: application/json" --data "{"type":"A","name":"$SECOND_SUBDOMAIN","content":"\$PUBLIC_IPV4","ttl":1,"priority":10,"proxied":false}"'
// END
// )

// # http://requestbin.fullcontact.com/1jef3zw1
// # https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records
// echo "$RUNCMD"


// # curl -X POST http://requestbin.fullcontact.com/1jef3zw1 \
// curl -X POST https://api.digitalocean.com/v2/droplets \
// -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
// -H 'Content-Type: application/json' \
// -d "{\"name\":\"$SECOND_SUBDOMAIN\", \"region\":\"nyc3\", \"size\":\"512mb\", 
//      \"image\":\"47402941\", \"ssh_keys\":[\"76:32:9a:ba:37:98:03:fe:09:b4:43:21:42:dd:0e:03\"],
//      \"user_data\":\"$RUNCMD\"}"



// # RUNCMD=$(cat <<-'END'
// # #cloud-config

// # runcmd:  
// #   - export HOSTNAME=$(curl -s http://169.254.169.254/metadata/v1/hostname)
// #   - export PUBLIC_IPV4=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
// # END
// # )

// # # printf -v RUNCMD "%q\n" "$RUNCMD"

// # curl -X POST http://requestbin.fullcontact.com/1jef3zw1 -v \
// # -H 'Content-Type: application/json' \
// # -d "{\"user_data\":\"$RUNCMD\"}"



