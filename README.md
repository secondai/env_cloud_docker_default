# Second  

## Why? 

A Second acts as an electronic buffer between you and the world; you use it to store all your customized apps and personal data. You need it because the amount of data you own and have to respond to is unwieldy to manage, and because 3rd party platforms can't be trusted. Your Second is meant to act as your trusted, always-connected assistant, doing as you wish and responding to everyone on your behalf. 


## How? 

A cloud-based, scalable, consumer-friendly platform with standards for data storage, APIs, apps, and blockchain-based identities and routing. 

We want to make it easy to own your data, control who has access to it, and use any UI you want to do it all. 


## Install  

A Second can be installed on any hosting platform (AWS, GCP, DO, Azure, etc.). Digital Ocean is used as an example for simplicity. 

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
