#!/bin/sh

# this should be wget'd and run 
# - fetches git repo and install

{ # this ensures the entire script is downloaded #


C_LCYAN='\033[1;36m'
C_CYAN='\033[0;36m'
C_LGREEN='\033[1;32m'
C_RED='\033[0;31m'
C_PURP='\033[0;35m'
C_NC='\033[0m' # No Color

# expect to be root!!

DEFAULT_PLATFORM_REPO="https://github.com/secondai/env_cloud_docker_default.git"
DEFAULT_ZIP="https://github.com/secondai/base.second.cloud/archive/master.zip"
DEFAULT_LAUNCH_STARTUP_PATH="services.second.default.startup"
DEFAULT_INCOMING_PATH="services.second.default.input"
DEFAULT_DB_TABLE_NODES="nodes"
DEFAULT_PASSPHRASE="test"
DEFAULT_SECOND_SUBDOMAIN="something.getasecond.com"
DEFAULT_AUTHORIZED_KEYS=""



# Welcome 
echo "--------------------------------"
echo "-    Second Cloud Installer    -"
echo "--------------------------------"
sleep 1


# get variables (.env) 
# - subdomain 
# - startup nodes 
# - codesandbox.io token (to get binary working) 

# url to a git repo to use for the base Second platform (dockerfiles, scripts, etc) 
echo -e -n "Domain/subdoman for Second (i.e. ${C_PURP}$DEFAULT_SECOND_SUBDOMAIN${C_NC}): "
read SECOND_SUBDOMAIN
SECOND_SUBDOMAIN=${SECOND_SUBDOMAIN:-$DEFAULT_SECOND_SUBDOMAIN}
[[ -z "$SECOND_SUBDOMAIN" ]] && { echo "Valid input required" ; exit 1; }
[[ "$SECOND_SUBDOMAIN" == "$DEFAULT_SECOND_SUBDOMAIN" ]] && { echo "Valid input required (cannot duplicate)" ; exit 1; }

# url to a git repo to use for the base Second platform (dockerfiles, scripts, etc) 
echo -e -n "Platform Git Repo Url (${C_CYAN}$DEFAULT_PLATFORM_REPO${C_NC}): "
read PLATFORM_REPO
PLATFORM_REPO=${PLATFORM_REPO:-$DEFAULT_PLATFORM_REPO}
[[ -z "$PLATFORM_REPO" ]] && { echo "Valid input required" ; exit 1; }

# url to a .zip file to use for default nodes/files  
echo -e -n "Startup Zipped Nodes Url (${C_CYAN}$DEFAULT_ZIP${C_NC}): "
read ZIP
ZIP=${ZIP:-$DEFAULT_ZIP}
[[ -z "$ZIP" ]] && { echo "Valid input required" ; exit 1; }
# echo $ZIP

# startup path (to a Second code node) 
echo -e -n "Startup Node Path (${C_CYAN}$DEFAULT_LAUNCH_STARTUP_PATH${C_NC}): " 
read LAUNCH_STARTUP_PATH
LAUNCH_STARTUP_PATH=${LAUNCH_STARTUP_PATH:-$DEFAULT_LAUNCH_STARTUP_PATH}
[[ -z "$LAUNCH_STARTUP_PATH" ]] && { echo "Valid input required" ; exit 1; }

# input path (to a Second code node)  
echo -e -n "Incoming Path (${C_CYAN}$DEFAULT_INCOMING_PATH${C_NC}): "
read INCOMING_PATH
INCOMING_PATH=${INCOMING_PATH:-$DEFAULT_INCOMING_PATH}
[[ -z "$INCOMING_PATH" ]] && { echo "Valid input required" ; exit 1; }

# table name  
echo -e -n "Nodes Table (${C_CYAN}$DEFAULT_DB_TABLE_NODES${C_NC}): "
read DB_TABLE_NODES
DB_TABLE_NODES=${DB_TABLE_NODES:-$DEFAULT_DB_TABLE_NODES}
[[ -z "$DB_TABLE_NODES" ]] && { echo "Valid input required" ; exit 1; }

# # TODO: check for valid `codesandbox` binary on PATH 
# echo "----"
# echo -e "Visit ${C_LCYAN}https://codesandbox.io/cli/login${C_NC} in your browser (login required) and get a Token to use for the next step"
# echo "----"
# # echo -e -n "${C_RED}Codesandbox${C_NC} Token: " 
# # read CODESANDBOX_TOKEN
# # [[ -z "$CODESANDBOX_TOKEN" ]] && { echo "Valid input required" ; exit 1; }
# echo -e -n "OK, I'm ready...(press ${C_LGREEN}enter${C_NC})"
# read
# # run Codesandbox login (Expect file) 
# codesandbox login
# # CODESANDBOX_TOKEN=$CODESANDBOX_TOKEN expect-codesandbox-login.exp 

# # todo: check for login success 
# echo "Logged into Codesandbox.io"
# echo "----"

# AUTHORIZED_KEYS 
echo -e -n "Enter your local ~/.ssh/id_rsa.pub public key for ssh access (${C_CYAN}$DEFAULT_AUTHORIZED_KEYS${C_NC}): "
read AUTHORIZED_KEYS
AUTHORIZED_KEYS=${AUTHORIZED_KEYS:-$DEFAULT_AUTHORIZED_KEYS}
[[ -z "$AUTHORIZED_KEYS" ]] && { echo "Valid input required" ; exit 1; }
# TODO: save authorized_keys to where? 
# - how do I get them into the docker-compose

# password 
echo -e -n "Enter your temporary Second Admin Passphrase (${C_CYAN}$DEFAULT_PASSPHRASE${C_NC}): "
read PASSPHRASE
PASSPHRASE=${PASSPHRASE:-$DEFAULT_PASSPHRASE}
echo "----"
echo -e "Dont forget your passphrase!!! It is: ${C_RED}$PASSPHRASE${C_NC}"
echo "----"
echo ""
echo "Creating Second...getting code, containers, launching, etc. (Takes ~3 minutes to get ready)"
sleep 4

# exit 1;

# git second repo 
cd ~
git clone $PLATFORM_REPO second
# write .env file for startup
cd second
cat <<EOF >.env
LAUNCH_NODES_ZIP_URL=$ZIP
LAUNCH_STARTUP_PATH=$LAUNCH_STARTUP_PATH
INCOMING_PATH=$INCOMING_PATH
DEFAULT_PASSPHRASE=$PASSPHRASE
DB_TABLE_NODES=$DB_TABLE_NODES
PORT=8080
EOF

# run Codesandbox login (Expect file) 
CODESANDBOX_TOKEN=$CODESANDBOX_TOKEN expect-codesandbox-login.exp 

# setup hooks for updating via git push 
cd ~
git init --bare second.git
cp second/docker-config/git-hooks/post-receive second.git/hooks/post-receive
chmod +x second.git/hooks/post-receive 

# start containers 
# - TODO: are environment variables passed in? 
cd ~/second
docker-compose -f docker-compose.prod.yml up -d 

echo "-------------------------------"
echo "-            Done!            -"
echo "-                             -"
echo "-                             -"
echo "- Visit your Second at the IP -"
echo "- address for your droplet    -"
echo "-------------------------------"
echo ""


} # this ensures the entire script is downloaded #
