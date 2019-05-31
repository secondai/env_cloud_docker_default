# Second  

## Why? 

A Second acts as an electronic buffer between you and the world; you use it to store all your customized apps and personal data. You need it because the amount of data you own and have to respond to is unwieldy to manage, and because 3rd party platforms can't be trusted. Your Second is meant to act as your trusted, always-connected assistant, doing as you wish and responding to everyone on your behalf. 


## How? 

A cloud-based, scalable, consumer-friendly platform with standards for data storage, APIs, apps, and blockchain-based identities and routing. 

Easy to own your data, control who has access to it, and use any UI you want to do it all. 


## Install  

Visit [www.getasecond.com](www.getasecond.com) or follow the instructions below: 

A Second can be installed on any hosting platform (AWS, GCP, DO, Azure, etc.). The current install method uses Digital Ocean and Cloudflare to setup a server and SSL on a subdomain. 

Requirements:  

1. [Cloudflare API Key](https://support.cloudflare.com/hc/en-us/articles/200167836-Where-do-I-find-my-Cloudflare-API-key-)  
1. Cloudflare account email address 
1. [Cloudflare Zone ID for base domain](https://blog.cloudflare.com/cloudflare-tips-frequently-used-cloudflare-ap/#thingsyouneedtoknoworgetbeforeusingtheapibr)  (note that this is NOT your domain, but a long string of random numbers and letters). [API docs for finding zone](https://api.cloudflare.com/#zone-list-zones). [online REPL for finding Zone ID](https://repl.it/@nicholasareed/cloudflare-find-zone-id-for-domain) 
1. [Digital Ocean API Key](https://www.digitalocean.com/community/questions/where-i-can-find-my-client-id-and-api-key)  
1. [FQDN](https://kb.iu.edu/d/aiuv) (i.e. mycustomsecond.getasecond.com)  


See and run the script from the online REPL: [https://repl.it/@nicholasareed/second-create-digitalocean-cloudflare]() 


## Publish you changes to Git server on Droplet 

If you want to modify the core Second repository and easily push updates to your server, you can add your Second as a remote repository: 

In your local repository (of this repo), run the following git commands (replace `{ip}` with the IP or hostname of your Second's server): 
```
git remote add live ssh://root@{ip}/root/second.git
git push live master
```
