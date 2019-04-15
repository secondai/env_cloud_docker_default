# Second  

A Second can be installed on any hosting platform (AWS, GCP, DO, Azure, etc.). Digital Ocean is used as an example for simplicity. 

Install Video: [link] 

## Install  

1. On Digital Ocean, Create a Droplet w/ Docker (and docker-compose also should be included) 
1. In your termial, SSH to the droplet using `root@{ip}`  
1. Copy-paste the following line to your droplet's terminal window to run the install script (from this repository):  
```
bash <(curl -s https://raw.githubusercontent.com/secondai/env_cloud_docker_default/master/install.sh)
```

## Publish you changes to Git server on Droplet 

If you want to modify the core Second repository and easily push updates to your server, you can add your Second as a remote repository: 

In your local repository (of this repo), run the following git commands (replace `{ip}` with the IP or hostname of your Second's server): 
```
git remote add live ssh://root@{ip}/root/second.git
git push live master
```
