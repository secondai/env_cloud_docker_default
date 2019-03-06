# Second  

## Install  

1. Create Droplet w/ Docker (and docker-compose also should be included) 
1. SSH via root@{ip} 
1. Run install script: 
```
bash <(curl -s https://raw.githubusercontent.com/secondai/env_cloud_docker_default/master/install.sh)
```

## Publish you changes to Git server on Droplet 

Replace `{ip}` with the IP or hostname of your Second's server: 
```
git remote add live ssh://root@{ip}/root/second.git
git push live master
```
