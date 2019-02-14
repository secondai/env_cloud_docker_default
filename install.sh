#!/bin/sh

# this should be wget'd and run 
# - fetches git repo and install

{ # this ensures the entire script is downloaded #

# expect to be root!!

# git second repo 
cd ~
git clone https://github.com/secondai/env_cloud_docker_default.git second

# setup hooks for updating via git push 
cd ~
git init --bare second.git
cp second/docker-config/git-hooks/post-receive second.git/hooks/post-receive
chmod +x second.git/hooks/post-receive 

# start containers 
cd ~/second
docker-compose up -d 


} # this ensures the entire script is downloaded #
