# Second  

## Install  

1. Create Droplet 
1. SSH via root@{ip} 
1. Run install script: 
```
curl -o- https://raw.githubusercontent.com/secondai/env_cloud_docker_default/master/install.sh | bash
```

## Publish Update to Git Server on Droplet 

Replace `{ip}` with the IP or hostname of your Second's server: 
```
git remote add live ssh://root@{ip}/root/second.git
```
