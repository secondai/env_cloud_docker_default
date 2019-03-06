#!/bin/sh

# this should be wget'd and run 
# - fetches git repo and install

{ # this ensures the entire script is downloaded #

# expect to be root!!

# Welcome 
echo "-------------------------------"
echo "-    Second Cloud Launcher    -"
echo "-------------------------------"
sleep 1

# get variables (.env) 
# - startup nodes 

DEFAULT_ZIP="https://github.com/secondai/base.second.cloud/archive/master.zip"
read -p "Startup Zipped Nodes Url ($DEFAULT_ZIP): " ZIP
ZIP=${ZIP:-$DEFAULT_ZIP}
# echo $ZIP

DEFAULT_LAUNCH_STARTUP_PATH="services.second.default.startup"
read -p "Startup Node Path ($DEFAULT_LAUNCH_STARTUP_PATH): " LAUNCH_STARTUP_PATH
LAUNCH_STARTUP_PATH=${LAUNCH_STARTUP_PATH:-$DEFAULT_LAUNCH_STARTUP_PATH}

DEFAULT_INCOMING_PATH="services.second.default.input"
read -p "Incoming Path ($DEFAULT_INCOMING_PATH): " INCOMING_PATH
INCOMING_PATH=${INCOMING_PATH:-$DEFAULT_INCOMING_PATH}

DEFAULT_DB_TABLE_NODES="nodes"
read -p "Nodes Table ($DEFAULT_DB_TABLE_NODES): " DB_TABLE_NODES
DB_TABLE_NODES=${DB_TABLE_NODES:-$DEFAULT_DB_TABLE_NODES}

DEFAULT_PASSPHRASE="test"
read -p "Admin Passphrase ($DEFAULT_PASSPHRASE): " PASSPHRASE
PASSPHRASE=${PASSPHRASE:-$DEFAULT_PASSPHRASE}
echo "----"
echo "Dont forget your passphrase!!! It is: $PASSPHRASE"
echo "----"
echo ""
echo "Creating Second...getting code, containers, launching, etc."
sleep 2

# git second repo 
cd ~
git clone https://github.com/secondai/env_cloud_docker_default.git second
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

# setup hooks for updating via git push 
cd ~
git init --bare second.git
cp second/docker-config/git-hooks/post-receive second.git/hooks/post-receive
chmod +x second.git/hooks/post-receive 

# start containers 
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
