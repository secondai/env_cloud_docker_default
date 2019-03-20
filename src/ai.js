
import { spawn, exec } from 'child_process';

import bigi from 'bigi'
// import bitcoin from 'bitcoinjs-lib'
import request from 'request-promise-native'

import _ from 'lodash'
import path from 'path'

const fs = require('fs-extra');

const util = require('util');

const execP = util.promisify(exec);

// const stdlib = require('@stdlib/stdlib');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

let defaultPopulate = require('./default-populate');

const {NodeVM, VM} = require('vm2');
let lodash = _;
require("underscore-query")(lodash);

let cJSON = require('circular-json');

let requestsCache = {};
App.requestsCache = requestsCache;

const uuidv4 = require('uuid/v4');
const events = require('events');
let eventEmitter = new events.EventEmitter();
App.eventEmitter = eventEmitter;


const Op = App.sharedServices.db.Sequelize.Op;


// Create Second 
// - handle inputs 

let secondReadyResolve;
const secondReady = new Promise(resolve=>{
  secondReadyResolve = resolve;
  // resolve(); // todo: build if not ready! 
});

class Second {
	constructor(){

		// console.log('Second constructor!');

		this.startup = this.startup.bind(this);
		this.runRequest = this.runRequest.bind(this);

		this.startup();

	}
	async startup(){

		// Get existing Nodes in memory 
		// - create a new memory if none exists! 
		console.log('Second startup!');

  	secondReadyResolve(); //

	  let startupResponse;

  	let vals = await App.sharedServices.db.Node.findAll();
  	if(!vals.length){ //  || process.env.RUN_POPULATE
  		// TODO
  		// - fill 
  		// - launch "after-fill" node 
  		console.error('Missing nodes, filling...');
  		await defaultPopulate();
  		
  		startupResponse = await this.startupRequest({
  			type: 'types.second.default.startup_input',
  			data: {
  				didPopulate: true,
  				needsBuild: true
  			}
  		});

  		// console.log('Finished defaultPopulate');
  		// return false;
  	} else {
	  	// console.log("populate done");
	  	// return false;

	    // run "startup" action
	    // - initiates server, heartbeat/cron 
	    startupResponse = await this.startupRequest({
  			type: 'types.second.default.startup_input',
  			data: {
  				didPopulate: false,
  				needsBuild: false
  			}
  		});
	  }
	  
    console.log('StartupResponse:', startupResponse);

	}

	runRequest(InputNode, skipWrappingInputNode, reqObj, resObj, wsClientId, socketioResponseFunc){

		// Run an "external" request (from outside the universe, goes to "incoming_from_uni" for the default App) 
    return new Promise((resolve, reject)=>{

			let thisRequestId = uuidv4();
			requestsCache[thisRequestId] = {
				keyvalue: {},
				stack: [],
				res: resObj,
				req: reqObj,
				wsClientId,
				socketioResponseFunc
			};

			// clear request cache after 30 seconds 
			// - should just do on completion? 
			setTimeout(()=>{
				console.log('freememory-requestscache');
				delete requestsCache[thisRequestId];
			}, 30 * 1000);

      secondReady.then(async ()=>{
        // console.log('Running incoming request (expecting express_obj, websocket_obj):', InputNode.type); //, this.state.nodesDb);

        // fetch and run code, pass in 
        // - using a specific "app_base" that is at the root 
        //   - defined by appId: "a22a4864-773d-4b0b-bf69-0b2c0bc7f3e0" 
        // - platform_nodes.data.platform = 'cloud' 

        let nodes,
        	nodePath,
        	UniverseInputNode,
        	CodeNode,
        	foundIncomingNode;


        // cache starting point 
	      App.globalCache = App.globalCache || {};
	      App.globalCache.SearchFilters = App.globalCache.SearchFilters || {};

	      App.memoryCache = cacheManager.caching({
	      	store: 'memory',
	      	max: 100,
	      	ttl: 10 // seconds
	      });


        let pathToProcessIncomingNode = process.env.INCOMING_PATH || 'services.second.cloud_default.incoming_from_universe';

	      // Get the node for handling input 
	      CodeNode = await App.sharedServices.db.Node.findOne({
	      	where: {
	      		name: pathToProcessIncomingNode
	      	}
	      });

        if(!CodeNode){
        	console.error('--invalid incoming_from_universe path-- :', pathToProcessIncomingNode);
        	return false;
        }

        // console.log('Got CodeNode', CodeNode._id); //, CodeNode.data.key);

        UniverseInputNode = {};

        if(skipWrappingInputNode){
          UniverseInputNode = InputNode;
        } else {
          UniverseInputNode = {
            type: 'types.second.default.incoming_generic_request', //incoming_web_request:0.0.1:local:29832398h4723',
            data: InputNode // type:express_obj
          }
        }

	      // Set context
	      let safeContext = {
	        SELF: CodeNode, 
	        INPUT: UniverseInputNode, // this is NOT validated at this step, cuz we are just passing in a Node (type, data) that I can decide how to handle. Ideally the passed-in schema types includes:  (inputData, outputFormat/info)
	      }
	      let threadEventHandlers = {};

	      // tempary test of requires 
	      let requires = [
	      	// 'vm2',
	      	// '@stdlib/stdlib',
	      	'lodash'
	      ];

	      // this is NOT limited 
	      // - let the brain handle responses! 
	      // - potentially the brain could install software that watches this and prevents more attacks, but doesn't need to be built-in 
	      let safedData;
	      // console.log('thisRequestId1:', thisRequestId);
	      try {
		      safedData = await runSafe({ 
		      	code: CodeNode.data.code, 
		      	safeContext, 
		      	requires, 
		      	threadEventHandlers, 
		      	requestId: thisRequestId, 
		      	mainIpcId: null, // from top of file
		      	nodePath: pathToProcessIncomingNode, 
		      	timeout: 20 * 1000 
		     	})
		    }catch(err){
		    	console.error('Failed safedData for external request:', err);
		    	safedData = {
		    		type: 'err:2390',
		    		data: {
		    			msg: 'Failed safedData',
		    			err,
		    			errStr: (err && err.toString) ? err.toString():err // might be undefined!
		    		}
		    	}
		    }

		    return resolve(safedData);

      })

    });

	}

	startupRequest(startupInputNode){

		// Run an "external" request (from outside the universe, goes to "incoming_from_uni" for the default App) 
    return new Promise((resolve, reject)=>{

			let thisRequestId = uuidv4();
			requestsCache[thisRequestId] = {
				keyvalue: {},
				stack: []
			};

			// clear request cache after 30 seconds 
			// - should just do on completion? 
			setTimeout(()=>{
				// console.log('freememory-requestscache');
				delete requestsCache[thisRequestId];
			}, 30 * 1000);

      secondReady.then(async ()=>{
        // console.log('Exec service.startup w/o wrapping node:'); //, this.state.nodesDb);

        // fetch and run code, pass in 
        // - using a specific "app_base" that is at the root 
        //   - defined by appId: "a22a4864-773d-4b0b-bf69-0b2c0bc7f3e0" 
        // - platform_nodes.data.platform = 'cloud' 

        let startupPath = process.env.LAUNCH_STARTUP_PATH || 'services.second.default.startup';
        // startupPath = 'app.second.sample_install';

        console.log('Startup Path:', startupPath);

	      // Get the node for handling input 
	      let CodeNode = await App.sharedServices.db.Node.findOne({
	      	where: {
	      		name: startupPath
	      	}
	      });

        if(!CodeNode){
        	console.error('--invalid startup path-- :', startupPath);
        	return false;
        }

        // console.log('Running Startup Node:', CodeNode.name);

	      // Set context
	      let safeContext = {
	        SELF: CodeNode, 
	        INPUT: startupInputNode || {}, // this is NOT validated at this step, cuz we are just passing in a Node (type, data) that I can decide how to handle. Ideally the passed-in schema types includes:  (inputData, outputFormat/info)
	      }
	      let threadEventHandlers = {};

	      // tempary test of requires 
	      let requires = [
	      	// 'vm2',
	      	// '@stdlib/stdlib',
	      	'lodash'
	      ];

	      // this is NOT limited 
	      // - let the brain handle responses! 
	      // - potentially the brain could install software that watches this and prevents more attacks, but doesn't need to be built-in 
	      let safedData;
	      // console.log('thisRequestId1:', thisRequestId);
	      try {
		      safedData = await runSafe({ 
		      	code: CodeNode.data.code, 
		      	safeContext, 
		      	requires, 
		      	threadEventHandlers, 
		      	requestId: thisRequestId, 
		      	mainIpcId: null, // from top of file
		      	nodePath: startupPath, 
		      	timeout: 20 * 1000 
		     	})
		    }catch(err){
		    	console.error('Failed safedData for startupRequest:', startupPath, err);
		    	safedData = {
		    		type: 'err:2390',
		    		data: {
		    			msg: 'Failed safedData',
		    			err,
		    			errStr: (err && err.toString) ? err.toString():err // might be undefined!
		    		}
		    	}
		    }

		    return resolve(safedData);

      })

    });

	}

	putNodeAtPath(path, node, value, opts){
  	return new Promise(async (resolve,reject)=>{

  		// Create an entry if doesn't already exist 
  		// - if updating, could require previous hash/version 

			// TODO: allow key to be a path on the node, like "type" or "data.xyz" or "data.[xyz.lol].more"
			if(typeof value == typeof 'str'){
				console.error('Not expecting key in putNodeAtPath to work yet! overwriting/inserting whole "data" object');
			} else {
				opts = value;
			}

  		// TODO: validate path/name validity

  		let parentPaths = [];
  		let parentPathSplit = path.split('.');
  		parentPathSplit.forEach((tmpPath,i)=>{
  			parentPaths.push(parentPathSplit.slice(0,i+1).join('.'));
  		})
  		parentPaths.pop();
  		// parentPaths.reverse(); // correct order of parent paths, from myself 
  		

		  let existingNode = await App.sharedServices.db.Node.find({
		    where: {
		    	name: path
		    }
		  });

  		// entry exists? 
  		if(existingNode){

  			// update node 
        existingNode.type = node.hasOwnProperty('type') ? node.type : existingNode.type;
        existingNode.data = node.hasOwnProperty('data') ? node.data : existingNode.data;
        existingNode.placeholder = false;
        let savedNode = await existingNode.save();

        resolve(savedNode);

  		} else {
  			// insert new node 
  			// - parent paths must exist! 
  			//   - create them if they dont exist 
  			//     - same as if moving a node to a name that doesnt exist? 

  			// create blank/empty/placeholder nodes for in-between keys 
  			// - pub.myapp needs to exist for pub.myapp.mydata to have a valid nodeId for us to dynamically create paths 

  			// find parent paths needed 
  			// create parents sequentially from root->down

  			let parentNodes = [];
  			for(let parentPathIdx in parentPaths){
  				try {
    				let parentPath = parentPaths[parentPathIdx];
    				let addrName = parentPath.split('.')[ parentPath.split('.').length - 1 ];

    				// create placeholder if not exists 

				    let parentResult = await App.sharedServices.db.Node.findOrCreate({
				    	where: {
					      name: parentPath
					    },
				    	defaults: {
				    		type: '',
				    		data: {},
					      // placeholder: true
					    }
				    });
				  }catch(err){
				  	console.error('Failed parentPath check:', parentPaths[parentPathIdx], 'ALL:', parentPaths, err);
				  }

			    // console.log('parentResult', parentResult);

  			}


  			// save this new node 

		    let newNode = await App.sharedServices.db.Node.create({
		      name: path,
		      type: node.type,
		      data: node.data,
		      placeholder: false
		    });

		    resolve(newNode);

  		}


  		// TODO: passes to updateNode or insertNode? 


  		// allow opts to enable full-replace (instead of using the "key/value" JSON insert) 

  		// lookup node at path, run updateNode for that Node 

  	});
  }
}

let MySecond = new Second();

let __parsedFiles = {};
function jsonParse(key, contents){
  if(__parsedFiles[key]){
    return __parsedFiles[key]
  }

  __parsedFiles[key] = JSON.parse(contents);
  return __parsedFiles[key];

}


// Events (usually from inside a codeNode) 
eventEmitter.on('command',async (message, socket) => {

	 //  eventEmitter.emit(
	 //    'response',
	 //    {
	 //      // id      : ipc.config.id,
	 //      id: message.id,
	 //      data: {
	 //      	hash
	 //      }
	 //    }
	 //  );
})



const runSafe = ({code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodePath, timeout}) => {
  return new Promise(async (resolve, reject)=>{

    // threadEventHandlers make it easy to handle onGasExceeded, etc.
    // - handles every tick? 
    // - MUST return a single value 

    safeContext = safeContext || {};
    // safeContext._ = lodash;
    safeContext.console = console;

    let useExec;

    // Check node.data.exec for path to file, run that real quick 
    try {
    	let codeNode = safeContext.SELF;
	    if(codeNode.data.exec){
	    	let binPath = path.join(process.env.ATTACHED_VOLUME_ROOT, codeNode.name, codeNode.data.exec);
	    	let contents = fs.readFileSync(binPath, 'utf8');
	    	// console.log('=====contents=======:', contents);
	    	code = contents;
	    	useExec = true;
	    	// code = contents;
			  // const { stdout, stderr } = await exec('find . -type f | wc -l');

			  // if (stderro) {
			  //   console.error(`error: ${stderr}`);
			  // }
			  // console.log(`Number of files ${stdout}`);
			  // return false;
	    }
	  }catch(err){
	  	console.error('binError:', err);
	  }


    try {
      // console.log('Run ThreadedSafeRun', code);
      let safeResult = await ThreadedSafeRun(code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodePath, timeout, useExec);
      // console.log('Resolved ThreadedSafeRun', safeResult);
      resolve(safeResult);
    }catch(err){
      // err may be the result of the threadEventHandlers throwing (onGasExceeded, onTimeToFetchExceeded, onStorageSpaceExceeded)! 
      // - could have killed the fetch
      // Failed parsing the user-provided "reduce" function! 
      console.error('Failed parsing user-provided reduce function3!', err);
      console.error(code);
      resolve(undefined);
    }

  });

}


const ThreadedSafeRun = (evalString, context = {}, requires = [], threadEventHandlers, requestId, mainIpcId, nodePath, timeout, useExec) => {
  return new Promise(async (resolve, reject)=>{

    // console.log('starting ThreadedSafeRun (cannot console.log inside there/here (when run in a sandbox!)!)');
    let ob = {evalString, context, requires, threadEventHandlers, requestId, mainIpcId, nodePath, timeout, useExec}; 

    let combinedOutputData = '';
    let eventEmitter = App.eventEmitter;

    const request = require('request-promise-native');

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
     
    let cJSON = require('circular-json');

    const uuidv4 = require('uuid/v4');



    // passed-in libs as required and available
    let required = {};
    for(let r of ob.requires){
      if(Array.isArray(r)){
        // ['utils','../utils']
        required[r[0]] = require(r[1]);
      } else {
        required[r] = require(r);
      }
    }

    const lodash = require('lodash');

    App.globalCache = App.globalCache || {};


    let codeNode = await App.sharedServices.db.Node.find({
    	where: {
    		name: nodePath
    	}
    });

    // Get codenode and parents/children  
    // - from nodeId passed in
    // - cache, until code changes are made 
    //   - or simply cache for a limited time period? (testing: 2 minutes) 


    let funcInSandbox = Object.assign({
      universe: {
      	requestsCache: App.requestsCache,
      	requestId: ob.requestId,
        __dirname: __dirname,
        staticFilePath: path.resolve(process.env.STATIC_FILE_PATH || __dirname + '/staticfiles'), // where static files will be stored
        runRequest: App.secondAI.MySecond.runRequest,
        process: process,
        env: process.env, // just allow all environment variables to be accessed 
        console,
        lodash,
        required, // "requires" libs
        require,
        uuidv4: uuidv4,
        cJSON,
        scriptError: async (err, _SELF) => {
        	_SELF = _SELF || {name:'SELF IS MISSING'};
		      let lineNum = 'unknown';
		      let lineCode = '';
		      let message = '';
		      let stacktrace = '';
		      try {
		        
		        if (typeof err === 'object') {
		          
		          message= err.message;
		          
		          let lineNums = err.stack.match(/vm.js:\d+/g);
		          if(lineNums.length){
		            lineNum = lineNums[0].split(':').pop();
		            lineCode = _SELF.data.code.split("\n")[lineNum - 1];
		          }
		          if (err.stack) {
		            stacktrace = err.stack;
		          }
		        } else {
		          console.error('dumpError :: argument is not an object', err);
		        }
		      }catch(err){
		        console.error('---Unable to load lines---');
		      }
		      
		      console.error('====Error in CodeNode====');
		      console.error('Message:', message);
		      console.error('CodeNode:', _SELF.name);
		      console.error('Line Number:', lineNum);
		      console.error('Line Code:', lineCode.trim());
        },
        // shim'd "dynamic require" from universe, so that we can rename/alias packages that are dynamically installed
        // - only works with github urls (need a solution for easily forking, renaming in package.json)
        drequire: (pkgName, semVerComparison, installationPackageUrl)=>{
               // // TODO:
               // // for the pkgName, see if we have a semver match using semVerComparison, and return the best match (sort, findLastValid)
               // // - if no match, then install using installationPackageUrl
 
               // // expecting installationPackageUrl's package.json's name to be pkgName+pkgVersion
               // // - if it isn't, faillure
 
               // // expecting/mandating that the package match the version, and the name matches?
               // let mypkg = universe.drequire('package-name',{
               //      version: '0.1.3',
               //      onMissing: 'github.com/nicholasareed/url.git#branchname'
               // })
               // if(!mypkg){
 
               // }
 
				},
				drequireInstall: ()=>{
				     // installs an npm package,
				     // - caches, validates
				     // - used as a temporary measure for dynamic packages
				},
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        eventEmitter,
        globalCache: App.globalCache,
        sharedServices: App.sharedServices, // express server, socketio client/server, IPFS, 

        // // client
        // // - attaching to remote server 
        // socketioClient, 
        // socketioServers: App.socketioServers, // where I'm the client, connected to a remote socketio server 

        // // websocket server 
        // // - clients attached to server (IoT devices) 
        // socketIOServer: App.socketIOServer,
        // wsClients: App.wsClients, 
        // socketioClients: App.socketioClients,

        // google,
        webrequest: request, // use similar to request-promise: https://www.npmjs.com/package/request-promise

        sleep: (ms)=>{
          return new Promise((resolve,reject)=>{
            setTimeout(resolve,ms)
          })
        },

				httpResponse: (action, data) => {
					// res.send('data');
        	requestsCache[ob.requestId].res[action](data);
        	return;
        },

        // checkPackage: (pkgName)=>{
        //   App.globalCache.packages = App.globalCache.packages || {};
        //   return App.globalCache.packages[pkgName] || {};
        // },
        // installPackage: (pkgName)=>{
        //   // manages package installation 
        //   // - simultaneous, etc. 
        //   return new Promise(async (resolve,reject)=>{
        //     // create global package tracker
        //     console.log('installPackage1');
        //     App.globalCache.packages = App.globalCache.packages || {};
        //     if(!App.globalCache.packages[pkgName]){
        //       let onInstallResolve;
        //       let onInstall = new Promise((resolve2)=>{
        //         onInstallResolve = resolve2;
        //       });
        //       let onRemoveResolve;
        //       let onRemove = new Promise((resolve2)=>{
        //         onRemoveResolve = resolve2;
        //       });
        //       App.globalCache.packages[pkgName] = {
        //         installing: false,
        //         removing: false,
        //         installed: false,
        //         errorInstalling: null,
        //         onInstallResolve,
        //         onInstall,
        //         onRemoveResolve,
        //         onRemove
        //       }
        //     }
        //     let pkg = App.globalCache.packages[pkgName];
        //     console.log('pkg:', pkg);
        //     if(pkg.installing){
        //       console.log('waiting for install, in progress');
        //       return pkg.onInstall.then(resolve);
        //     }
        //     if(pkg.removing){
        //       console.log('waiting for removal, in progreess, then re-install');
        //       await pkg.onRemove;
        //     }
        //     if(pkg.installed){
        //       // all good, return resolved
        //       console.log('installed already, ok!');
        //       return resolve(true);
        //     }
            
        //     if(pkg.errorInstalling){
        //       console.log('Unable to load, previous error installing (try uninstalling, then reinstalling)');
        //       return resolve(false);
        //     }

        //     // install
        //     pkg.installing = true;
        //     const { exec } = require('child_process');
        //     exec('npm install ' + pkgName, (err, stdout, stderr) => {
        //       if (err) {
        //         console.error(`exec error installing package!: ${err}`);
        //         pkg.installing = false;
        //         pkg.errorInstalling = true;
        //         return;
        //       }
        //       console.log(`Exec Result: ${stdout}`);
              
        //       // resolve all waiting scripts (including in this block) 
        //       if(pkg.onInstallResolve){
        //       	pkg.onInstallResolve(true);
        //       }
        //       pkg.installed = true;
        //       pkg.installing = false;
              
        //     });
            
        //     pkg.onInstall.then(resolve);
            
        //   });

        // },
        // removePackage: (pkgName)=>{
        //   // manages package installation 
        //   // - simultaneous, etc. 
        //   return new Promise(async (resolve,reject)=>{
        //     // create global package tracker
        //     console.log('removePackage1');
        //     App.globalCache.packages = App.globalCache.packages || {};
        //     if(!App.globalCache.packages[pkgName]){
        //       let onInstallResolve;
        //       let onInstall = new Promise((resolve2)=>{
        //         onInstallResolve = resolve2;
        //       });
        //       let onRemoveResolve;
        //       let onRemove = new Promise((resolve2)=>{
        //         onRemoveResolve = resolve2;
        //       });
        //       App.globalCache.packages[pkgName] = {
        //         installing: false,
        //         removing: false,
        //         installed: false,
        //         errorInstalling: null,
        //         onInstallResolve,
        //         onInstall,
        //         onRemoveResolve,
        //         onRemove
        //       }
        //     }
        //     let pkg = App.globalCache.packages[pkgName];
        //     console.log('pkg:', pkg);
        //     if(pkg.installing){
        //       console.log('waiting for install, in progress, before uninstalling');
        //       await pkg.onInstall;
        //     }
        //     if(pkg.removing){
        //       console.log('waiting for remove, in progress');
        //       return pkg.onRemove.then(resolve);
        //     }
        //     // try and remove
        //     // - doesnt matter if installed or not
            
        //     // install
        //     pkg.removing = true; // easier than "anything else 
        //     const { exec } = require('child_process');
        //     exec('npm remove ' + pkgName, (err, stdout, stderr) => {
        //       if (err) {
        //         console.error(`exec error removing package!: ${err}`);
        //         pkg.removing = false;
        //         pkg.errorInstalling = false; // allow re-install
        //         return;
        //       }
        //       console.log(`Exec Result: ${stdout}`);
              
        //       // resolve all waiting scripts (including in this block) 
        //       if(pkg.onRemoveResolve){
        //       	pkg.onRemoveResolve(true);
        //       }
        //       pkg.installed = false;
        //       pkg.removing = false;
        //       pkg.errorInstalling = false; // allow re-install
              
        //     });
            
        //     pkg.onRemove.then(resolve);
            
        //   });

        // },

        // isParentOf: (parentId, node1)=>{
        //   // console.log('isParentOf', parentId);
        //   function getParentNodeIds(node){
        //     let nodes = [node._id];
        //     if(node.parent){
        //       nodes = nodes.concat(getParentNodeIds(node.parent));
        //     }
        //     return nodes;
        //   }
          
        //   let parentNodeIds1 = getParentNodeIds(node1);
        //   if(parentNodeIds1.indexOf(parentId) !== -1){
        //     return true;
        //   }
        //   return false;

        // },

        // getParentRoot: (node)=>{
        //   // get the root of a node (follow parents) 
        //   // - parent probably doesnt have the full chain filled out (TODO: node.nodes().xyz) 
        //   function getParentNodes(node){
        //     let nodes = [node];
        //     if(node.parent){
        //       nodes = nodes.concat(getParentNodes(node.parent));
        //     }
        //     return nodes;
        //   }
          
        //   let parentNodes1 = getParentNodes(node);
        //   return parentNodes1[parentNodes1.length - 1];

        // },

        // sameAppPlatform: (node1, node2)=>{
        //   // console.log('sameAppPlatform');
        //   // return true;

        //   function getParentNodes2(node){
        //     let nodes = [node];
        //     if(node.nodeId && !node.parent){
        //       // console.error('parent chain broken in sameAppPlatform', node.type, node._id);
        //       throw 'parent chain broken in sameAppPlatform'
        //     }
        //     if(node.parent){
        //       nodes = nodes.concat(getParentNodes2(node.parent));
        //     }
        //     return nodes;
        //   }

        //   // if parent chain doesnt exist (or is broken) then just rebuild on-the-fly? 
        //   // - using reference version of nodesDb (w/ parents, children) 
          
        //   let parentNodes1;
        //   let parentNodes2;

        //   try {
        //     parentNodes1 = getParentNodes2(node1);
        //   }catch(err){
        //     let tmpnode1 = lodash.find(App.nodesDbParsed,{_id: node1._id});
        //     try {
        //       parentNodes1 = getParentNodes2(tmpnode1);
        //     }catch(err2){
        //       console.error(err2);
        //     }
        //   }
        //   try {
        //     parentNodes2 = getParentNodes2(node2);
        //   }catch(err){
        //     let tmpnode2 = lodash.find(App.nodesDbParsed,{_id: node2._id});
        //     try {
        //       parentNodes2 = getParentNodes2(tmpnode2);
        //     }catch(err2){
        //       console.error(err2);
        //     }
        //   }

        //   // console.log('NodeParents2:', node2._id, parentNodes2.length);

        //   // see if first match of each is correct (aka "outwards" (not from root, but from nodes)) 
        //   let platformClosest1 = lodash.find(parentNodes1, node=>{
        //     return (
        //       node.type.split(':')[0] == 'platform_nodes'
        //     )
        //   });
        //   let appBaseClosest1 = lodash.find(parentNodes1, node=>{
        //     return (
        //       node.type.split(':')[0] == 'app_base'
        //       ||
        //       node.type.split(':')[0] == 'app_parts'
        //     )
        //   });

        //   let platformClosest2 = lodash.find(parentNodes2, node=>{
        //     return (
        //       node.type.split(':')[0] == 'platform_nodes'
        //     )
        //   });
        //   let appBaseClosest2 = lodash.find(parentNodes2, node=>{
        //     return (
        //       node.type.split(':')[0] == 'app_base'
        //       ||
        //       node.type.split(':')[0] == 'app_parts'
        //     )
        //   });

        //   // if(appBaseClosest2){
        //   //   console.log('appBase MATCH');
        //   // } else {
        //   //   // console.log('nomatch appBase', node2._id);
        //   //   try {
        //   //     console.log(node2.parent._id);
        //   //     console.log(node2.parent.parent._id);
        //   //   }catch(err){}
        //   // }

        //   // if(platformClosest1 && platformClosest2){
        //   //   console.log('platform MATCH');
        //   // } else {
        //   //   console.log('nomatch');
        //   // }

        //   try {
	       //    if(
	       //      platformClosest1 &&
	       //      platformClosest2 &&
	       //      appBaseClosest1 &&
	       //      appBaseClosest2 &&
	       //      platformClosest1.data.platform == platformClosest2.data.platform
	       //      &&
	       //      appBaseClosest1.data.appId == appBaseClosest2.data.appId
	       //      ){
	       //      // console.log('sameAppPlatform TRUE');
	       //      return true;
	       //    }
	       //  }catch(err){}

        //   // console.log('Missed sameAppPlatform');
        //   // console.log('sameAppPlatform false');
        //   return false;

        // },

        // sameParentChain: (node1, node2)=>{
        //   function getParentIds(node){
        //     let ids = [node._id];
        //     if(node.parent){
        //       ids = ids.concat(getParentIds(node.parent));
        //     }
        //     return ids;
        //   }
          
        //   let parentIds1 = getParentIds(node1);
        //   let parentIds2 = getParentIds(node2);

        //   if(lodash.intersection(parentIds1, parentIds2).length){
        //     return true;
        //   }

        //   return false;

        // },

        // // WebTorrent: App.WebTorrentClient,
        // // IPFS: {
        // //   ipfs: App.ipfs,
        // //   onReady: App.ipfsReady,
        // //   isReady: ()=>{
        // //     if(App.ipfsIsReady){
        // //       return true;    
        // //     } else {
        // //       return false;
        // //     }
        // //   },

        // //   pin: (buffersToPin)=>{

        // //     return new Promise(async (resolve, reject)=>{

        // //       // pin multiple!
        // //       let returnSingle = false;
        // //       if(!lodash.isArray(buffersToPin)){
        // //         returnSingle = true;
        // //         buffersToPin = [buffersToPin];
        // //       }

        // //       let hashResult;
        // //       try {
        // //         hashResult = await App.ipfs.files.add(buffersToPin);
        // //         console.log('hashResult:', hashResult);
        // //         let ipfsHashes = hashResult.map(result=>result.hash);
        // //         console.log('IPFS hashes to pin:', ipfsHashes);
        // //         for(let ipfsHash of ipfsHashes){
        // //           if(!ipfsHash){
        // //             console.error('Skipping invalid hash, empty from results', );
        // //             continue;
        // //           }
        // //           await App.ipfs.pin.add(ipfsHash);
        // //         }
        // //         if(returnSingle){
        // //           resolve({
        // //             type: 'ipfs_hash:..',
        // //             data: {
        // //               hash: ipfsHashes[0]
        // //             }
        // //           });
        // //         } else {
        // //           resolve({
        // //             type: 'ipfs_hashes:..',
        // //             data: {
        // //               hashes: ipfsHashes
        // //             }
        // //           });
        // //         }
        // //       }catch(err){
        // //         console.error('IPFS pin failure:', err);
        // //         resolve({
        // //           type: 'ipfs_error_pinning:..',
        // //           data: {
        // //             error: true,
        // //             hashResult,
        // //             err
        // //           }
        // //         });
        // //       }

        // //     });


        // //   }
        // // },

        // directToSecond: (opts)=>{
        //   // to an External second
        //   return new Promise(async (resolve, reject)=>{

        //     let url = opts.url;
        //     url = url.split('http://localhost').join('http://docker.for.mac.localhost');

        //     // make web request to Node 
        //     // - just passing through the Node, assume any Auth is already included 
        //     let response = await request.post({
        //       method: 'post',
        //       url: url, //connectNode.data.connection, // expecting URL at first! 
        //       body: opts.RequestNode, //ExternalRequestNode.data.RequestNode,
        //       json: true
        //     })

        //     // console.log('Response from directToSecond:', opts.url, JSON.stringify(response,null,2));

        //     resolve(response);

        //   })
        // },

        // directToSecondViaWebsocket: (opts)=>{

        // 	// OLD, NOT USING

        //   // to an External second
        //   return new Promise(async (resolve, reject)=>{
        //     // opts = {
        //     //   clientId,
        //     //   RequestNode
        //     // }

        //     let clientId = opts.clientId;

        //     // exists?
        //     if(!App.sharedServices.wsClients[clientId]){
        //       console.error('Client ID does NOT exist for directToSecondViaWebsocket, cannot send request when not connected');
        //       return resolve({
        //         type: 'error:...',
        //         data: 'Failed cuz clientId does NOT exist for directToSecondViaWebsocket'
        //       });
        //     }

        //     // start emitter listening for response 
        //     let requestId = uuidv4();

        //     // TODO: have a timeout for failed responses (ignore "late" responses?) ? 
        //     eventEmitter.once(`ws-response-${requestId}`, function _listener(r){
        //       console.log('Response to WEBSOCKET request, from RPI!');
        //       resolve(r.data);
        //     });

        //     // Make request via websocket 
        //     let ws = App.sharedServices.wsClients[clientId].ws;

        //     console.log('Making ws.send request with requestId, type, data-as-node'); 

        //     ws.send({
        //       requestId,
        //       type: 'request',
        //       data: opts.RequestNode
        //     });

        //     console.log('Made websocket request, waiting for response');

        //     // resolve(response);

        //   })
        // },

        // // converts words to an address, posts address (temporary, should post on-chain and use ipfs) 
        // createAddressForIdentity: (username, publicKey, connection)=>{
        //   return new Promise(async (resolve, reject)=>{
        //     // fetches 1st bitcoin transaction for wallet address 
        //     // - uses decoded first transaction as an IPFS link 
        //     // - link: https://github.com/ipfs/js-ipfs/tree/master/examples/ipfs-101
        //     // - ipfs pinning service: https://www.eternum.io (with an API) 

        //     // currently just using "language" server! (not on bitcoin/ipfs while testing) 

        //     // notice, using docker.for.mac.localhost !!! (temporary)

        //     console.log('createAddressForIdentity');
        //     console.log('connection:', connection);

        //     // Create IPFS values (ExternalIdentityNode as JSON) 
        //     // - external_identity:0.0.1:local:8982f982j92 
        //     //   - publicKey
        //     // - external_identity_connect_method:0.0.1:local:382989239hsdfmn
        //     //   - method: 'http'
        //     //   - connection: http://*.second.com/ai 
        //     let ExternalIdentityNode = {
        //       type: 'external_identity:0.0.1:local:8982f982j92',
        //       data: {
        //         publicKey, //: '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI+ArOUlbt1k2G2n5fj0obEn4mpCfYEx\nvSZy2c/0tv2caC0AYbxZ4vzppGVjxf+L6fythmWRB0vcwyXHy57fm7ECAwEAAQ==\n-----END PUBLIC KEY-----'
        //       },
        //       nodes: [{
        //         type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn',
        //         data: {
        //           method: 'http',
        //           connection, //: 'https://infinite-brook-40362.herokuApp.com/ai'
        //         }
        //       }]
        //     };

        //     console.log({
        //       username, 
        //       publicKey, 
        //       connection,
        //       ExternalIdentityNode
        //     });
            
        //     let subname = ''; // empty is for root 
        //     let usernameSplit = username.split('@');
        //     if(usernameSplit.length > 1){
        //       subname = usernameSplit[0];
        //       username = usernameSplit[1];
        //     }

        //     // add to stellar and ipfs (nodechain) 
        //     console.log('Adding to stellar and ifps (nodechain)');

        //     // Identity ipfs hash 
        //     // - add to nodechain (pins ipfshash) 
        //     let identityIpfsHash;
        //     try {
        //       let chainResult = await publishNodeToChain({
        //         node: ExternalIdentityNode
        //       });
        //       identityIpfsHash = chainResult.data.hash;
        //     }catch(err){
        //       console.error('Failed writing identity IpfsHash to nodechain', err);
        //       return reject();
        //     }


        //     console.log('Adding to stellar:', identityIpfsHash, username);

        //     // Add to stellar
        //     var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
        //     let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
        //     var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

        //     console.log('pkTarget Seed:', pairTarget.secret());



        //     // Update data (manageData operation) 
        //     console.log('Building transaction (multisig manageData)');

        //     // expecting targetAccount to already exist (aka was claimed, is now being updated)
        //     // - dont automatically CLAIM right now, this is just for UPDATING (targetAccount must exist)! 
        //     let targetAccount;
        //     try {
        //       targetAccount = await funcInSandbox.universe.getStellarAccount(pairTarget.secret(), {claim: true});
        //       // targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())
        //       console.log('Found targetAccount (from getStellarAccount):'); //, targetAccount);
        //     } catch(err){
        //       console.error('Failed finding existing account for username. Should have already claimed!', err);
        //       return reject();
        //     }

        //     // Start building the transaction for manageData update
        //     let transaction = new StellarSdk.TransactionBuilder(targetAccount)

        //     .addOperation(StellarSdk.Operation.manageData({
        //       name: subname + '|second',
        //       value: identityIpfsHash
        //     }))
        //     // .addMemo(StellarSdk.Memo.hash(b32))
        //     .build();

        //     // Sign the transaction to prove you are actually the person sending it.
        //     transaction.sign(pairTarget); // targetKeys
        //     transaction.sign(pairSource); // sourceKeys

        //     // send to stellar network
        //     let stellarResult = await stellarServer.submitTransaction(transaction)
        //     .then(function(result) {
        //       console.log('Stellar manageData Success! Results:'); //, result);
        //       return result;
        //     })
        //     .catch(function(error) {
        //       console.error('Stellar Something went wrong (failed updating data)!', error);
        //       // If the result is unknown (no response body, timeout etc.) we simply resubmit
        //       // already built transaction:
        //       // server.submitTransaction(transaction);
        //       return null;
        //     });

        //     // console.log('stellarResult', stellarResult);

        //     if(!stellarResult){
        //       console.error('Failed stellar createAddressForIdentity');
        //       return reject();
        //     }

        //     console.log('stellarResult succeeded! (createAddressForIdentity)');

        //     return resolve({
        //       type: 'boolean:..',
        //       data: true
        //     })

        //   })
        // },

        // // converts words to an address, posts address (temporary, should post on-chain and use ipfs) 
        // manageData: (network, username, field, nodeValue)=>{
        //   return new Promise(async (resolve, reject)=>{

        //     // writing a node to identity 

        //     console.log('manageData', network, username, field);

        //     let subname = ''; // empty is for root 
        //     let usernameSplit = username.split('@');
        //     if(usernameSplit.length > 1){
        //       subname = usernameSplit[0];
        //       username = usernameSplit[1];
        //     }

        //     // add to stellar and ipfs (nodechain) 
        //     console.log('manageData for Identity on stellar and ifps (nodechain)');

        //     // ipfs hash
        //     // - add to nodechain (pins ipfshash) 
        //     let nodeIpfsHash;
        //     try {
        //       let chainResult = await publishNodeToChain({
        //         chain: 'dev@second', // TODO: should publish to my "personal" nodechain, that nobody can access, but that seeds my ipfs hashes 
        //         node: nodeValue
        //       });
        //       nodeIpfsHash = chainResult.data.hash;
        //     }catch(err){
        //       console.error('Failed writing identity IpfsHash to nodechain', err);
        //       return reject();
        //     }


        //     console.log('Adding to stellar:', nodeIpfsHash, username);

        //     // Add to stellar
        //     var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
        //     let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
        //     var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

        //     console.log('pkTarget Seed:', pairTarget.secret());



        //     // Update data (manageData operation) 
        //     console.log('Building transaction (multisig manageData)');

        //     // expecting targetAccount to already exist (aka was claimed, is now being updated)
        //     // - dont automatically CLAIM right now, this is just for UPDATING (targetAccount must exist)! 
        //     let targetAccount;
        //     try {
        //       targetAccount = await funcInSandbox.universe.getStellarAccount(pairTarget.secret(), {claim: false});
        //       // targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())
        //       console.log('Found targetAccount (from getStellarAccount):'); //, targetAccount);
        //     } catch(err){
        //       console.error('Failed finding existing account for username. Should have already claimed!', err);
        //       return reject();
        //     }

        //     // Start building the transaction for manageData update
        //     let transaction = new StellarSdk.TransactionBuilder(targetAccount)

        //     .addOperation(StellarSdk.Operation.manageData({
        //       name: subname + '|' + field,
        //       value: nodeIpfsHash
        //     }))
        //     // .addMemo(StellarSdk.Memo.hash(b32))
        //     .build();

        //     // Sign the transaction to prove you are actually the person sending it.
        //     transaction.sign(pairTarget); // targetKeys
        //     transaction.sign(pairSource); // sourceKeys

        //     // send to stellar network
        //     let stellarResult = await stellarServer.submitTransaction(transaction)
        //     .then(function(result) {
        //       console.log('Stellar manageData Success! Results:'); //, result);
        //       return result;
        //     })
        //     .catch(function(error) {
        //       console.error('Stellar Something went wrong (failed updating data)!', error);
        //       // If the result is unknown (no response body, timeout etc.) we simply resubmit
        //       // already built transaction:
        //       // server.submitTransaction(transaction);
        //       return null;
        //     });

        //     // console.log('stellarResult', stellarResult);

        //     if(!stellarResult){
        //       console.error('Failed stellar manageData');
        //       return reject();
        //     }

        //     console.log('stellarResult succeeded! (manageData)');

        //     return resolve({
        //       type: 'boolean:..',
        //       data: true
        //     })


        //   })
        // },

        // getStellarAccount: async (targetSeed, opts)=>{

        //   // Returns an account for an identity/username that we control 
        //   // - if necessary: claims account (creates), sets up multi-sig

        //   console.log('getStellarAccount:', targetSeed);

        //   opts = opts || {
        //     claim: true
        //   }

        //   var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
        //   var pairTarget = StellarSdk.Keypair.fromSecret(targetSeed);

        //   console.log('pkSource Seed:', pairSource.secret());
        //   console.log('pkTarget Seed:', pairTarget.secret());


        //   // Load Target account
        //   let targetAccount = await stellarServer
        //   .loadAccount(pairTarget.publicKey())
        //   .catch(()=>{
        //     return false;
        //   })

        //   if(targetAccount){
        //     // target account exists
        //     // - should already be owned by me 

        //     let sourceIsSigner = lodash.find(targetAccount.signers,{public_key: pairSource.publicKey()});
        //     if(sourceIsSigner){
        //       // already claimed, but I'm the owner 
        //       // - multi-sig is already setup 

        //       // all good with this targetAccount! 
        //       console.log('targetAccount all set with multisig for updating!');
        //       return targetAccount;

        //     } else {
        //       // exists, and I'm not the owner 
        //       // - could also check to see if it is unprotected? (unlikely, maybe on testnet only) 
        //       // - could check the "data.willSellFor" field to see if it is for sale? 
        //       console.error('Username exists and you are not the owner'); // TODO: return who the owner is 
        //       return false;

        //     }


        //   }


        //   // identity Account doesn't exist 
        //   // - register account (and setup multisig) if I have a balance in my sourceAccount 


        //   // Load source account
        //   let sourceAccount;
        //   try {
        //     sourceAccount = await stellarServer.loadAccount(pairSource.publicKey())
        //   }catch(err){
        //     // problem with account 
        //     return false;
        //   }

        //   // get source balance 
        //   if(sourceAccount){
        //     let balance = 0;
        //     balance = sourceAccount.balances[0].balance;

        //     console.log('Balance:', balance);

        //     balance = parseInt(balance,10);
        //     if(balance < 10){
        //       console.error('Insufficient balance in account for creation:', sourceAccount.balances[0].balance);
        //       return false;
        //     }
        //   }


        //   // Claim account
        //   if(!opts.claim){
        //     console.error('NOT claiming even though targetAccount doesnt exist!');
        //     return false;
        //   }

        //   // Start building the transaction.
        //   let transaction = new StellarSdk.TransactionBuilder(sourceAccount)
        //   .addOperation(StellarSdk.Operation.createAccount({
        //     destination: pairTarget.publicKey(),
        //     startingBalance: "3.0"
        //     // source: pair
        //   }))
        //   .build();

        //   // Sign the transaction to prove you are actually the person sending it.
        //   transaction.sign(pairSource); // sourceKeys

        //   // send to stellar network
        //   let stellarResult = await stellarServer.submitTransaction(transaction)
        //   .then(function(result) {
        //     console.log('Stellar Success createAccount'); // , result); 
        //     return result;
        //   })
        //   .catch(function(error) {
        //     console.error('Stellar Something went wrong!', error);
        //     // If the result is unknown (no response body, timeout etc.) we simply resubmit
        //     // already built transaction:
        //     // server.submitTransaction(transaction);
        //     return null;
        //   });

        //   // console.log('stellarResult', stellarResult);
        //   if(!stellarResult){
        //     console.error('Failed creating account');
        //     return false;
        //   }

        //   console.log('Created account, starting multisig (reloading account)');

        //   // reload the account 
        //   targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

        //   // Add multisig 
        //   console.log('adding multisig after creating username'); //, targetAccount);

        //   // set multi-sig on this account 
        //   // - will fail if I am unable to claim 

        //   // Start building the transaction.
        //   let transaction2 = new StellarSdk.TransactionBuilder(targetAccount)
        //   .addOperation(StellarSdk.Operation.setOptions({
        //     signer: {
        //       ed25519PublicKey: pairSource.publicKey(),
        //       weight: 1
        //     }
        //   }))
        //   .addOperation(StellarSdk.Operation.setOptions({
        //     masterWeight: 1, // set master key weight (should really be nothing, and controlled by this other key?) 
        //     lowThreshold: 2, // trustlines
        //     medThreshold: 2, // manageData
        //     highThreshold: 2  // setOptions (multi-sig)
        //   }))
        //   .build();

        //   // Sign the transaction to prove you are actually the person sending it.
        //   transaction2.sign(pairTarget); // sourceKeys
        //   // transaction2.sign(pairSource); // sourceKeys

        //   // send to stellar network
        //   let stellarResult2 = await stellarServer.submitTransaction(transaction2)
        //   .then(function(result) {
        //     console.log('Stellar MultiSig Setup Success!'); // Results:', result);
        //     return result
        //   })
        //   .catch(function(error) {
        //     console.error('Stellar Something went wrong (failed multisig)!', error);
        //     // If the result is unknown (no response body, timeout etc.) we simply resubmit
        //     // already built transaction:
        //     // server.submitTransaction(transaction);
        //     return null;
        //   });

        //   // console.log('Multisig result:', stellarResult2);

        //   if(!stellarResult2){
        //     console.error('Failed multisig setup');
        //     return false;
        //   }

        //   // return final targetAccount (with signers, etc.) 
        //   console.log('Returning targetAccount after creating and adding multi-sig');
        //   targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

        //   return targetAccount;

        // },


        // TalkToSecond: ({ExternalIdentityNode, InputNode}) => {
        //   return new Promise(async (resolve, reject) => {

        //     // make a request (assuming http for now) to an external Second 
        //     // - could also be local/on-page? 

        //     console.error('Using WRONG TalkToSecond! Should use capability');

        //     let url = lodash.find(ExternalIdentityNode.nodes,{
        //       type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn'
        //     }).data.connection;

        //     console.log('ExternalIdentity connection url:', url);

        //     let response = await request.post({
        //       method: 'post',
        //       url: url,
        //       body: InputNode,
        //       json: true
        //     })

        //     resolve(response.secondResponse);

        //   })
        // },

        loadAndRunCapability: (nameSemver, opts, input)=>{
          return new Promise(async(resolve, reject)=>{

            // Run rsa capability 
            let capNode = await funcInSandbox.universe.loadCapability(nameSemver, opts);
            let returnNode = await funcInSandbox.universe.runCapability(capNode, input);

            resolve(returnNode);

          })
        },
        loadCapability: (nameSemver, opts)=>{
          opts = opts || {};
          return new Promise(async (resolve, reject)=>{

            // console.log('--Load capability'); //, platformClosest._id, funcInSandbox.universe.isParentOf ? true:false);

            // Returns the Node for the capability specified
            let capabilityNodes = await funcInSandbox.universe.searchMemory({
            	SELF: codeNode, // derived from this universe instance
              filter: {
              	sameAppPlatform: true,
                dataFilter: {
                  type: {
                  	$like: 'capability:'
                  },
                  'data.key' : nameSemver
                },
                // filterNodes: tmpNodes=>{
                //   return new Promise((resolve, reject)=>{
                //     // tmpNodes = tmpNodes.filter(tmpNode=>{
                //     //   return tmpNode.data.method == 'read';
                //     // })

                //     // try {
                //     //   console.log('platformClosest._id', platformClosest._id);
                //     // }catch(err){
                //     //   console.error('NO PLATFORMClOSEST');
                //     // }
                //     tmpNodes = lodash.filter(tmpNodes, tmpNode=>{

                //       if(funcInSandbox.universe.isParentOf(platformClosest._id, tmpNode)){
                //         // console.log('FOUND IT UNDER SAME APP!!!!!', tmpNode._id);
                //         // console.log('FOUND PARENT1!');
                //         return true;
                //       }
                //       return false;
                //     })
                //     resolve(tmpNodes);
                //   });
                // },
              }
            });
            // capabilityNodes = universe.lodash.sortBy(capabilityNodes,capNode=>{
            //   let orderNode = universe.lodash.find(capNode.nodes, {type: 'order_level:0.0.1:local:382hf273'});
            //   return orderNode ? orderNode.data.level:0;
            // });

            if(!capabilityNodes || !capabilityNodes.length){
              console.error('Unable to find capability!', nameSemver);

              // let allNodes = await funcInSandbox.universe.searchMemory({});
              console.error('Failed capabilityNode',nameSemver); //, allNodes);
              // debugger;

              return reject();
            }

            if(capabilityNodes.length > 1){
              console.error('TOO MANY capability nodes!');
              // return reject();
            }

            return resolve(capabilityNodes[0]);
            
          })
        },
        runCapability: (capNode, externalInputNode)=>{
          // opts = opts || {};
          return new Promise(async (resolve, reject)=>{

            // Pass in InputNode to capability! 

            let codeNode = lodash.find(capNode.nodes, {type: 'code:0.0.1:local:32498h32f2'});

            let inputNode = {
              type: 'capability_input_node:0.0.1:local:29f8239a13h9',
              data: {
                capabilityNode: capNode,
                externalInputNode: externalInputNode
              }
            }

            // run in vm
            let responseNode;
            try {
              responseNode = await funcInSandbox.universe.runNodeCodeInVM({
                codeNode, 
                dataNode: inputNode
              });
            }catch(err){
              console.error('In VM error:', err);
              responseNode = {
                type: 'err_in_vm:6231',
                data: {
                  err: err || {},
                  error: err
                }
              }
            }

            resolve(responseNode);
            
          })
        },

        // capabilities: ()=>{

        //   return {
        //     privateIdentity: getPrivateIdentity,
        //     sign: StringNode=>{
        //       // expecting a type:string:0.0.1:local:289hf329h93
        //       // sign a string using internal IdentityNode (only 1 expected) 

        //       return new Promise(async (resolve, reject)=>{

        //         let stringToSign = StringNode.data;

        //         let IdentityNode = await getPrivateIdentity();
        //         let privateKey = IdentityNode.data.private;

        //         let key = new rsa(privateKey);
        //         let signed = key.sign(stringToSign);

        //         resolve({
        //           type: 'string:0.0.1:local:289hf329h93',
        //           data: signed.toString('base64')
        //         });

        //       });
        //     },
        //     verify: ChallengeVerifyNode=>{
        //       // expecting a type:challenge_verify:0.0.1:local:93fj92hj832ff2
        //       // - verify that what was passed-in 

        //       return new Promise(async (resolve, reject)=>{

        //         // let stringToSign = ChallengeVerifyNode.data;

        //         // let IdentityNode = await getPrivateIdentity();
        //         // let privateKey = IdentityNode.data.private;

        //         let key = new rsa(ChallengeVerifyNode.data.publicKey);

        //         let verified = key.verify(ChallengeVerifyNode.data.challenge, ChallengeVerifyNode.data.solution, undefined, 'base64'); // todo

        //         resolve({
        //           type: 'boolean:0.0.1:local:98h8fh28h3232f',
        //           data: verified
        //         });

        //       });
        //     },
        //     encryptPrivate: StringNode=>{
        //       // expecting a type:string:0.0.1:local:289hf329h93
        //       // sign a string using internal IdentityNode (only 1 expected) 

        //       return new Promise(async (resolve, reject)=>{

        //         try {

        //           let stringToEncrypt = StringNode.data;

        //           let IdentityNode = await getPrivateIdentity();
        //           let privateKey = IdentityNode.data.private;

        //           // Encrypt 
        //           // let ciphertext;
        //           // try {
        //           //   ciphertext = CryptoJS.AES.encrypt('test1', 'private kmk');
        //           // }catch(err){
        //           //   console.error(err);
        //           //   return resolve({
        //           //     type: 'string',
        //           //     data: 'test2'
        //           //   });
        //           // }

        //           // return resolve({
        //           //   // what: 'ok',
        //           //   sha: CryptoJS.SHA256('fuck').toString()
        //           // });

        //           let customEncryptionKey = CryptoJS.SHA256(privateKey).toString().substr(0,32);

        //           let iv = crypto.randomBytes(IV_LENGTH);
        //           let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(customEncryptionKey), iv);
        //           let encrypted = cipher.update(stringToEncrypt);

        //           encrypted = Buffer.concat([encrypted, cipher.final()]);

        //           let ciphertext = iv.toString('hex') + ':' + encrypted.toString('hex');

        //           resolve({
        //             type: 'string:0.0.1:local:289hf329h93',
        //             data: ciphertext
        //           });

        //           // let key = new rsa(privateKey);
        //           // let encrypted = key.encryptPrivate(stringToEncrypt);

        //           // resolve({
        //           //   type: 'string:0.0.1:local:289hf329h93',
        //           //   data: encrypted.toString('base64') //encrypted //.toString('base64')
        //           // });
        //         }catch(err){
        //           return resolve({
        //             type: 'error:..',
        //             data: {
        //               str: 'Failed encrypting!'
        //             }
        //           });
        //         }

        //       });
        //     },
        //     decryptPrivate: StringNode=>{
        //       // expecting a type:string:0.0.1:local:289hf329h93
        //       return new Promise(async (resolve, reject)=>{

        //         try {

        //           let stringToDecrypt = StringNode.data;

        //           let IdentityNode = await getPrivateIdentity();
        //           let privateKey = IdentityNode.data.private;

        //           // // Decrypt 
        //           // var bytes  = CryptoJS.AES.decrypt(stringToDecrypt, privateKey);
        //           // var plaintext = bytes.toString(CryptoJS.enc.Utf8);

        //           let customEncryptionKey = CryptoJS.SHA256(privateKey).toString().substr(0,32);

        //           let textParts = stringToDecrypt.split(':');
        //           let iv = new Buffer(textParts.shift(), 'hex');
        //           let encryptedText = new Buffer(textParts.join(':'), 'hex');
        //           let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(customEncryptionKey), iv);
        //           let decrypted = decipher.update(encryptedText);

        //           decrypted = Buffer.concat([decrypted, decipher.final()]);

        //           // return decrypted.toString();
        //           let plaintext = decrypted.toString();

        //           resolve({
        //             type: 'string:0.0.1:local:289hf329h93',
        //             data: plaintext
        //           });

        //           // let key = new rsa(privateKey);
        //           // let decrypted;
        //           // try {                  
        //           //   decrypted = key.decrypt( new Buffer(StringNode.data,'base64')); // uses Private Key!
        //           // }catch(err){
        //           //   return resolve({
        //           //     err: err,
        //           //     str: err.toString()
        //           //   });
        //           // }

        //           // resolve({
        //           //   type: 'string:0.0.1:local:289hf329h93',
        //           //   data: {
        //           //     StringNode,
        //           //     decrypted
        //           //   }
        //           // });
        //         }catch(err){
        //           return resolve({
        //             type: 'error:..',
        //             data: {
        //               str: 'Failed decrypting'
        //             }
        //           });
        //         }

        //       });
        //     },
        //     externalRequest: ExternalRequestNode => {
        //       return new Promise(async (resolve,reject)=>{

        //         console.error('DEPRECATED! should not be using externalRequest, should use TalkToSecond capability');

        //         // Make a request to an external Second 
        //         // data: {
        //         //   ExternalIdentityNode, // must include connect_method
        //         //   RequestNode: InitiateIdentifyNode
        //         // }

        //         // ExternalIdentityNode needs to have a NodeChild w/ a connect_method 
        //         let connectNode = lodash.find(ExternalRequestNode.data.ExternalIdentityNode.nodes, {type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn'});
        //         if(!connectNode){
        //           console.error('Missing ConnectNode!');
        //           return reject({
        //             type: 'internal_error_output:0.0.1:local:32948x2u3cno2c',
        //             data: {
        //               str: 'Missing existing ExternalIdentity connect_method child!'
        //             }
        //           })
        //         }

        //         console.log('Making external request');

        //         // make web request to Node 
        //         // - just passing through the Node, assume any Auth is already included 
        //         let response = await request.post({
        //           method: 'post',
        //           url: connectNode.data.connection, // expecting URL at first! 
        //           body: ExternalRequestNode.data.RequestNode,
        //           json: true
        //         })

        //         // ONLY returning a "second" response! (no other URL is allowed besides this, for now) 
        //         return resolve(response.secondResponse);


        //       })
        //     }
        //   }

        // }, // check for capabilities, call capabilities with a Node 
        // getCapabilityAndRunWithNodeAsInput: ({capability, InputNode}) =>{

        //   // Finds a capability (added hownow?) 
        //   // - runs Code with 

        //   setupIpcWatcher({
        //       command: 'getCapabilityAndRunWithNodeAsInput', // whole thing for now
        //       data,
        //       capability,
        //       InputNode
        //   }, (r)=>{
        //     resolve(r.data);
        //   })

        // },
        // reportProblem: (problem)=>{
        //   // how to report this problem so it can be tracked down? 
        //   return true;
        // }, 
        // hasChildNode: (node, matcher)=>{
        //   // allow "matcher" to be a function? 
        //   return lodash.find(node.nodes,matcher);
        // },
        // historyLog: (data, type, logLevel)=>{
        //   return new Promise(async (resolve, reject)=>{

        //     // Runs in ThreadedVM 
        //     // - putting this here means it PROBABLY won't have all the context we'd hope for

        //     // should validate code/schema too? 

        //     setupIpcWatcher({
        //         command: 'historyLog', // whole thing for now
        //         data,
        //         type,
        //         logLevel
        //     }, (r)=>{
        //       resolve(r.data);
        //     })

        //   });
        // },

        findNode: (filterObj) => {
          return new Promise(async (resolve, reject)=>{

            // // Runs in ThreadedVM 
            // // - putting this here means it PROBABLY won't have all the context we'd hope for

            // // should validate code/schema too? 

            // setupIpcWatcher({
            //     command: 'findNode', // whole thing for now
            //     filter: filterObj
            // }, (r)=>{
            //   resolve(r.data);
            // })

          });
        },

        newNode: (node, skipWaitForResolution, skipRebuild) => {
          return new Promise(async (resolve, reject)=>{

            // // Runs in ThreadedVM 
            // // - putting this here means it PROBABLY won't have all the context we'd hope for

            // // should validate code/schema too? 

            // setupIpcWatcher({
            //     command: 'newNode', // whole thing for now
            //     node,
            //     skipWaitForResolution,
            //     skipRebuild
            // }, (r)=>{
            //   resolve(r.data);
            // })

          });
        },
        
        updateNode: (node, skipWaitForResolution, skipRebuild) => {
          return new Promise(async (resolve, reject)=>{

            // // Runs in ThreadedVM 
            // // - putting this here means it PROBABLY won't have all the context we'd hope for

            // // should validate code/schema too? 

            // if(!node){
            //   console.error('Missing Node to update!');
            //   return reject();
            // }
            // node = Object.assign({},node);

            // node = {
            //   _id: node._id || undefined,
            //   name: node.name || undefined, 
            //   nodeId: node.hasOwnProperty('nodeId') ? node.nodeId : undefined,
            //   placeholder: node.hasOwnProperty('placeholder') ? node.placeholder : undefined,
            //   type: node.type || undefined,
            //   data: node.data || undefined,
            //   active: node.hasOwnProperty('active') ? node.active : undefined,
            //   createdAt: node.createdAt || undefined,
            //   updatedAt: (new Date()).getTime(),
            // }

            // // console.log('Node to update:', JSON.stringify(node,null,2));

            // setupIpcWatcher({
            //     command: 'updateNode', // whole thing for now
            //     node,
            //     skipWaitForResolution,
            //     skipRebuild
            // }, (r)=>{
            //   resolve(r.data);
            // })

          });

        },
        
        removeNode: (node, skipWaitForResolution, skipRebuild) => {
          return new Promise(async (resolve, reject)=>{

            // // Runs in ThreadedVM 
            // // - putting this here means it PROBABLY won't have all the context we'd hope for

            // // should validate code/schema too? 

            // if(!node){
            //   console.error('Missing Node to remove!');
            //   return reject();
            // }
            // node = Object.assign({},node);

            // node = {
            //   _id: node._id || undefined
            // }

            // // console.log('Node to update:', JSON.stringify(node,null,2));

            // setupIpcWatcher({
            //     command: 'removeNode', // whole thing for now
            //     node,
            //     skipWaitForResolution,
            //     skipRebuild
            // }, (r)=>{
            //   resolve(r.data);
            // })

          });

        },

	      navPathv1: (current, backwards, append)=>{
	      	append = lodash.isString(append) ? append.split('.') : append; 
	      	append = lodash.isArray(append) ? append:[];
	        return current.split('.').slice(0,-1 * backwards).concat(append).join('.');
	      },

			  matchRuleShort: (str, rule)=>{
			    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
			  },
			  
			  pathMatch: (path, pattern)=>{
			    // pattern: xyz.%.%.* something 
			    
			    let pathSplit = path.split('.');
			    let patternSplit = pattern.split('.');
			  
			    let doesMatch = false;
			    let stopCheckingPathCuzFailed;
			    pathSplit.forEach((name,idx)=>{
			      if(stopCheckingPathCuzFailed){
			        return;
			      }
			  
			      let isLastName = (idx == (pathSplit.length - 1)) ? true:false;
			      let isLastPattern = (idx == (patternSplit.length - 1)) ? true:false;
			  
			      let patternForSegment = patternSplit[idx];
			  
			      // console.log('name', name);
			      // console.log('pattern', pattern);
			      // console.log('isLast', isLast);
			  
			      if(patternForSegment == '**'){
			        // console.log('Match **');
			        stopCheckingPathCuzFailed = true;
			        doesMatch = true;
			        return;
			      }
			      
			      if(patternForSegment == '' && isLastName && isLastPattern){
			        // same as ".*"
			        doesMatch = true;
			        return;
			      }
			      
			      if(typeof patternForSegment != 'string'){
			        // failed
			        stopCheckingPathCuzFailed = true;
			        return;
			      }
			  
			      if(funcInSandbox.universe.matchRuleShort(name, patternForSegment)){
			        if(isLastName){
			          if(isLastPattern){
			            doesMatch = true;
			          } else {
			            // not a match 
			            stopCheckingPathCuzFailed = true;
			          }
			        } else {
			          // just continue to checking the next part of this path! 
			          // console.log('continue checking');
			        }
			      } else {
			        stopCheckingPathCuzFailed = true;
			      }
			  
			    })
			  
			    return doesMatch;
			    
			  },

        execCodeNode: (opts) => {
          return new Promise(async (resolve, reject)=>{

            // same as runNodeCodeInVM, except NO JSON.stringify 
            // - skips the whole ThreadedSafeRun request, just makes it directly (runSafe is called) 

            if(!opts.codeNode){
              console.error('Missing codeNode for execCodeNode');
              return reject();
            }
            if(!opts.codeNode.data){
              console.error('Missing codeNode.data for execCodeNode');
              return reject();
            }
            if(!opts.codeNode.data.code && !opts.codeNode.data.exec){
              console.error('Missing codeNode.data.code for execCodeNode');
              return reject();
            }

            try {

              var code = opts.codeNode.data.code;

              var datetime = (new Date());

				  		var safeContext = {
				  			PATH: opts.actionPath || '', // or should be a part of inputNode? 
				  			SELF: opts.codeNode, // code node
				  			INPUT: opts.dataNode || opts.inputNode, 
				  			AUTH: opts.authNode || {}
				  		}
				  		var requires = ['lodash'];
				  		var threadEventHandlers = {};
				  		var mainIpcId = ob.mainIpcId;
				  		var nodePath = ob.nodePath;
				  		var timeout = null; //60 * 1000;

				  		// in case we specified a new request 
				  		// - TODO: use a tree/branching structure? 
				  		// - TODO: store at a "virtual path" like "builtin.request_cache.uuid-123" 
				  		if(opts.requestId && opts.requestId != requestId){
				  			// console.log('Changing requestId for new code!'); 
				  		}
				  		var passThruRequestId = opts.requestId || requestId;

							var safedData;
				      try {
				        safedData = await runSafe({ 
				        	code, 
				        	safeContext, 
				        	requires, 
				        	threadEventHandlers, 
				        	requestId: passThruRequestId,
				        	mainIpcId, 
				        	nodePath, 
				        	timeout
				        })
				      }catch(err){
				      	console.error('Failed execCodeNode', err);
							  return reject(); // allow workers to continue
				      }

              // setupIpcWatcher({
              //   command: 'ThreadedSafeRun',
              //   code: code,
              //   SELF: opts.codeNode,
              //   INPUT: opts.dataNode || opts.inputNode,
              //   requestId: ob ? ob.requestId : uuidv4(), // from ob.context!!
              //   mainIpcId: ob ? ob.mainIpcId : uuidv4(),
              //   nodeId: opts.codeNode._id,
              //   timeout: opts.timeout,
              //   workGroup: opts.workGroup,
              //   workers: opts.workers,
              //   datetime: datetime.getSeconds() + '.' + datetime.getMilliseconds()
              // }, (r)=>{
              //   resolve(r.data);
              // })
              // console.log('Returning safedData from execCodeNode');

              return resolve(safedData);

            } catch(err){
              console.error('Failed execCodeNode', err, Object.keys(opts.codeNode));
            }


          });

        },

        execPath: (execPath, opts) => {
          return new Promise(async (resolve, reject)=>{

          	// execute execCodeNode for a path to a code node 
          	// - usually a service, or a route 

          	opts = opts || {};

          	// TODO: validate that I'm allowed to run this codepath 

        		let codeNode = await funcInSandbox.universe.getNodeAtPath(execPath);
        		if(!codeNode){
        			console.error('Missing valid execPath:', execPath);
        			return reject(false);
        		}

        		opts.codeNode = codeNode;

        		let execResult = await funcInSandbox.universe.execCodeNode(opts);

        		resolve(execResult);

          });
        },

        getNodeAtPath: (path, opts)=>{
        	return new Promise(async (resolve,reject)=>{

        		opts = opts || {};

        		// TODO: make exact (strip possible "LIKE" (%) characters) 

        		let whereQuery = {};
        		if(!opts.excludeChildren){
        			// include children (should specify path/depth?) (graphql?) 
        			whereQuery = {
					      [Op.or]: [{
					        name: path
					      },{
					        name: {
					          [Op.like]: path + '.%'
					        }
					      }]
					    }
        		} else {
        			// no children 
        			whereQuery = {
					      name: path
					    }
        		}
        		
					  let rawNodeWithChildren = await App.sharedServices.db.Node.findAll({
					    where: whereQuery,
					    raw: true
					  });

					  let refNode = rawNodeWithChildren.find(n=>{return n.name == path});
					  if(!refNode){
					  	// console.log('No node:', path);
					  	return resolve(null);
					  }

					  let strSplitLen = lodash.memoize(function(str){
					    return str.split('.').length;
					  });
					  let strStartsWith = lodash.memoize(function(str, startsWith){
					    return str.startsWith(startsWith);
					  },(...args) => args.join('|')); // 2nd argument for resolver 

					  function updateChildNodes(thisNode, allChildNodes){
					    thisNode.nodes = thisNode.nodes || [];
					    for(let node of allChildNodes){
					      if(strStartsWith(node.name, thisNode.name + '.') && 
					         strSplitLen(node.name) == (strSplitLen(thisNode.name) + 1)){
					        thisNode.nodes.push(node);
					        updateChildNodes(node, allChildNodes);
					      }
					    }
					  }
					  updateChildNodes(refNode, rawNodeWithChildren); 

					  // // Version without placeholders (determine paths) 
					  // function updateChildNodes(thisNode, allChildNodes){
					  //   thisNode.nodes = thisNode.nodes || [];
					  //   // let needsPlaceholder = true;
					  //   let toAdd = new Set();
					  //   let counted = new Set();
					  //   for(let node of allChildNodes){
					  //     if(strStartsWith(node.name, thisNode.name + '.')){
						 //      if(strSplitLen(node.name) == (strSplitLen(thisNode.name) + 1)){
						 //        thisNode.nodes.push(node);
						 //        counted.add(node.name.split('.')[strSplitLen(thisNode.name) + 0]);
						 //        updateChildNodes(node, allChildNodes);
						 //      } else {
						 //      	// need to make sure gets added 
						 //      	toAdd.add(node.name.split('.')[strSplitLen(thisNode.name) + 0]);
						 //      }
					  //     }
					  //   }
					  //   // iterate over placeholder entries 
					  //   toAdd.forEach((name)=>{
					  //   	if(!counted.has(name)){
					  //   		// should be added as placeholder, then process child nodes 
					  //   		let placeholderNode = {name: thisNode.name + '.' + name, type: '', data: {}, placeholder: true, more: 'okokokok'};
					  //   		thisNode.nodes.push(placeholderNode);
						 //      updateChildNodes(placeholderNode, allChildNodes);
					  //   	}
					  //   })
					  // }

        		// TODO: opts.followMirror ? returns data for the mirror'd path 
        		let returnNode;
        		if(refNode){
        			refNode = refNode; //refNode.toJSON();
        			if(opts.fields){
        				returnNode = lodash.pick(refNode, opts.fields);
        			} else {
        				returnNode = refNode;
        			}
        			// if(opts.lean){
        			// 	returnNode = cJSON.parse(cJSON.stringify(returnNode));
        			// }
        		}
        		resolve(returnNode)
        	});
        },

        getNodesForPathPattern: (pattern, opts)=>{
        	return new Promise(async (resolve,reject)=>{

        		// opts.includeChildren (default: true) 
        		// - using '**' prevents including children (too many results) 

        		// * => one level of nodes 
        		// ** => all nodes

        		// console.log('Pattern:', pattern);

        		opts = lodash.defaults(opts,{
        			includeChildren: true,
        			excludeData: false
        		});

        		let includeChildren = opts.includeChildren;

        		let attributes = {};
        		if(opts.excludeData){
        			attributes.exclude = ['data'];
        		}

        		// // patternArr is array of patterns to return nodes for 
        		// // ["xyz.*", "testwhat.testing.*"]
        		// if(!lodash.isArray(patternArr)){
        		// 	patternArr = [patternArr];
        		// }

        // 		// TODO: convert "xyz.*" to regex patterns for matching 
        // 		// - also get children where requested 
        // 		let whereOrQuery = [];
        // 		// for(let pat of patternArr){
        // 			// determine if '$' should be included 
        // 			// - yes, if '**' is omitted at end 
        // 		let pat = pattern;
        // 			let patArr = pat.split('.');
        // 			if(patArr[patArr.length - 1] == '**'){
        // 				includeChildren = false // NOT including children! 
        // 				patArr.pop();
        // 			}
        // 			pat = patArr.join('.');

        // 			let newPat = pat.replace(/\*/g,'\\w+') + (includeChildren ? '':'$');

        // 			console.log('newPat:', newPat);

        // 			whereOrQuery.push({
        // 				name: {
        // 					[Op.regexp]: newPat
        // 					// [Op.like]: pat.replace('**','%').replace('*','%')
        // 				}
        // 			});
        // 		// }
        // // 		let whereQuery = {
				    // //   [Op.or]: whereOrQuery
				    // // }
				    // let whereQuery = whereOrQuery[0];

				    // let whereQuery = {};
				    if(pattern.split('.').pop() == '**'){
				    	// find all, do NOT get children for each
				    	// - all are considered "top-level" 
						  let rawNodeWithChildren = await App.sharedServices.db.Node.findAll({
						    where: {
						    	name: {
						    		[Op.regexp]: '^' + pattern.split('.').join('\\.').replace(/\*\*/g,'[-\\w\+').replace(/\*/g,'[-\\w]+') // No "$" at end!!! 
						    	}
						    },
						    attributes,
						    raw: true
						  });
						  // console.log('Returning w/o getting children (**)');
						  return resolve(rawNodeWithChildren);


				    }
				    
				    // specific end-point, with option to get children 
				    // - find top-level, build down 
				    //   - could be faster (not two queries) 

				    // console.log('whereQuery:', whereQuery);
        		
					  let topLevelNodes = await App.sharedServices.db.Node.findAll({
					    where: {
					    	name: {
					    		[Op.regexp]: '^' + pattern.split('.').join('\\.').replace(/\*/g,'[-\\w]+') + '$' // limit to top-level! 
					    	}
					    },
						  attributes,
					    raw: true
					  });

					  // console.log('topLevelNodes:', topLevelNodes.length);


					  let childNodes = await App.sharedServices.db.Node.findAll({
					    where: {
					    	name: {
					    		[Op.regexp]: '^' + pattern.split('.').join('\\.').replace(/\*/g,'[-\\w]+') + '\.' // No "$" (so can get children) 
					    	}
					    },
					    attributes,
					    raw: true
					  });

					  let strSplitLen = lodash.memoize(function(str){
					    return str.split('.').length;
					  });
					  let strStartsWith = lodash.memoize(function(str, startsWith){
					    return str.startsWith(startsWith);
					  },(...args) => args.join('|')); // 2nd argument for resolver 

					  function updateChildNodes(thisNode, allChildNodes){
					    thisNode.nodes = thisNode.nodes || [];
					    for(let node of allChildNodes){
					      if(strStartsWith(node.name, thisNode.name + '.') && 
					         strSplitLen(node.name) == (strSplitLen(thisNode.name) + 1)){
					        thisNode.nodes.push(node);
					        updateChildNodes(node, allChildNodes);
					      }
					    }
					  }

					  let removeLast = function(str){
					  	let tmp2 = str.split('.');
					  	tmp2.pop();
			      	return tmp2.join('.');
						}

					  // // match the top-level nodes (no parent in results) 
					  // let topLevelNodes = [];
					  // for(let node of rawNodeWithChildren){
					  // 	for(let pat of patternArr){
					  // 		let parentName = removeLast(pat);
						 //  	if(removeLast(node.name) == parentName){
						 //  		topLevelNodes.push(node);
						 //  	}
						 //  }
					  // }

					  // check for including all the children (fetch again) 

					  for(let node of topLevelNodes){
					  	updateChildNodes(node, childNodes); 
					  }

        		resolve(topLevelNodes);
        	});
        },

        putNodeAtPath: App.secondAI.MySecond.putNodeAtPath,

        removeNodeAtPath: (path, opts)=>{
        	return new Promise(async (resolve,reject)=>{

        		// Default:
        		// - DOES remove children! 
        		// - if you want to clear, then use the PUT, not the REMOVE! 

        		console.log('Removing node (potentially children)');

        		let whereQuery;
        		// if(!opts.removeTree){
        		// 	whereQuery = {
        		// 		name: path
        		// 	};
        		// } else {
        			whereQuery = {
					  		[Op.or]: [{
		      				name: {
		      					[Op.like]: path + '.%'
	      					}
	      				},{
	      					name: path
	      				}]
	      			}
        		// }

					  let removeResult = await App.sharedServices.db.Node.destroy({
					  	where: whereQuery
      			});

					  // console.log('removed!', removeResult);

					  resolve(true);


        		// TODO: passes to updateNode or insertNode? 


        		// allow opts to enable full-replace (instead of using the "key/value" JSON insert) 

        		// lookup node at path, run updateNode for that Node 

        	});
        },

       //  clearNodeAtPath: (path, opts)=>{
       //  	return new Promise(async (resolve,reject)=>{

       //  		// if cleared, checks if needs to be removed 
       //  		// - for below, and each part of chain above that is a placeholder, up to root (stop once NOT empty) 


       //  		console.log('Clearing (placeholder, remove if necessary)');

       //  		// Clear if exists 
       //  		// Remove if no children 
       //  		// - check up parent chain if isPlaceholder, remove if true 

       //  		let thisNode = await funcInSandbox.universe.getNodeAtPath(path);

       //  		if(!thisNode){
       //  			// nothing to do
       //  			return resolve(true);
       //  		}

       //  		if(thisNode.placeholder){
       //  			// already a placeholder 
       //  			return resolve(true);
       //  		}

       //  		// Change this node 

       //  		// Check if has children (can be removed instead of cleared?)
					  // let childCount = await App.sharedServices.db.Node.count({
					  //   where: {
					  //   	name: {
					  //   		[Op.like]: thisNode.name + '.%'
					  //   	}
					  //   }
					  // });
					  // console.log('childCount:', childCount);
					  // if(childCount){
					  // 	// has children 
					  // 	// - simply CLEAR (placeholder=true)
						 //  let updatedSingleNode = await App.sharedServices.db.Node.update({
						 //  	type: '',
						 //  	data: {},
						 //  	placeholder: true
						 //  },{
						 //    where: {
						 //    	name: thisNode.name
						 //    }
						 //  });
						 //  console.log('updatedSingleNode:', updatedSingleNode);

						 //  console.log('Cleared node');

						 //  return resolve(true);
					  // }

				  	// // no children 
				  	// // - can REMOVE
					  // let destroyedNode = await App.sharedServices.db.Node.destroy({
					  //   where: {
					  //   	name: thisNode.name
					  //   }
					  // });

					  // // Check parents 
			  		// let parentPaths = [];
			  		// let parentPathSplit = thisNode.name.split('.');
			  		// parentPathSplit.forEach((tmpPath,i)=>{
			  		// 	parentPaths.push(parentPathSplit.slice(0,i+1).join('.'));
			  		// })
			  		// parentPaths.pop();
			  		// // parentPaths.reverse(); // correct order of parent paths, from myself 
  		

		  			// let parentNodes = [];
		  			// let continueUpChain = true;
		  			// for(let parentPathIdx in parentPaths){
		  			// 	if(!continueUpChain){
		  			// 		continue;
		  			// 	}
		  			// 	try {
		    	// 			let parentPath = parentPaths[parentPathIdx];
		    	// 			let parentNode = await funcInSandbox.universe.getNodeAtPath(parentPath);

		    	// 			// if not placeholder, no need to continue 
		    	// 			if(!parentNode.placeholder){
		    	// 				continueUpChain = false;
		    	// 				continue;
		    	// 			}

		    	// 			// has children 
							//   let childCount = await App.sharedServices.db.Node.count({
							//     where: {
							//     	name: {
							//     		[Op.like]: parentNode.name + '.%'
							//     	}
							//     }
							//   });

						 //    let parentResult = await App.sharedServices.db.Node.findOrCreate({
						 //    	where: {
							//       name: parentPath
							//     },
						 //    	defaults: {
						 //    		type: '',
						 //    		data: {},
							//       placeholder: true
							//     }
						 //    });
						 //  }catch(err){
						 //  	console.error('Failed parentPath check:', parentPaths[parentPathIdx], 'ALL:', parentPaths, err);
						 //  }

					  //   // console.log('parentResult', parentResult);

		  			// }

					  // resolve(true);


       //  		// TODO: passes to updateNode or insertNode? 


       //  		// allow opts to enable full-replace (instead of using the "key/value" JSON insert) 

       //  		// lookup node at path, run updateNode for that Node 

       //  	});
       //  },

        execService: (serviceName, opts) => {
        	return new Promise(async (resolve, reject)=>{

        		// console.log('Running execService');

        		let {
        			actionPath, 
        			inputNode, 
        			authNode,
        			isOwner,
        			requestId // optional, new one indicates we've started a new request cache 
        		} = opts;

        		// TODO: 
        		// - use isInternalOwner instead of isOwner? 
        		//   - difference between external-via-token and internal 

        		// change isOwner to correct authNode
        		if(isOwner){
        			// console.log('execService.auth.isOwner=true');
        			authNode = {
		  				  type: 'builtin.auth',
		  				  data: {
		  				  	isOwner: true,
		  				  	// permissions: {
		  				  	// 	owner: true
		  				  	// }
			  				},
			  				// "permissions" loaded from nodes[] where name=="permissions" 
			  				permissions: [
	                // default: allow all 
	                {
	                  "services": [
	                    "services.**"
	                  ],
	                  "events": [
	                    "pre",
	                  ],
	                  "code": "permission_codes.second.default.true",
	                  "vars": {},
	                  "output": {
	                    "true": "allow"
	                  }
	                }
	               ],
		  				  nodes: [{
		  				  	name: 'permissions',
		  				  	type: 'types.second.default.permissions',
		  				  	data: {
		  				  		permissions: []
		  				  	}
		  				  }]
		  				}
        		}

        		// Load service code 
        		// - handles builtin.xyz automatically 
        		if(serviceName.indexOf('services.') !== 0){
        			console.error('invalid service name doesnt start with "services." : ', serviceName)
        			return resolve(false); 
        		}
        		let serviceCodeNode = await funcInSandbox.universe.getNodeAtPath(serviceName);

        		// ensure service actually exists 
        		if(!serviceCodeNode){
        			console.error('serviceCodeNode does NOT EXIST for execService: ', serviceName)
        			return resolve(false); 
        		}


						// Check Permissions of action/service/input/event details, trying to do what, with what, when 
        		// 1. Check permissions attached to authObj/token (supplied in request) 
        		// 2. Check permissions attached to actionPath (requires lookup, cascade) 
        		let permissionResult = await funcInSandbox.universe.checkPermission({
        			eventName: 'pre', // 'std.second.permission_type.before_service_run',
        			serviceName,
        			actionPath,
        			inputNode,
        			authNode
        		});
        		// console.log('permissionResult:', permissionResult);

        		// UNCOMMENT TO ENABLE PERMISSIONS 
        		// if(permissionResult !== true){
        		// 	// Failed permissions
        		// 	console.error('Failed permission to run service:', serviceName); //, permissionResult);
        		// 	return resolve({
        		// 		type: 'types.second.default.error.service.permissions',
        		// 		data: {
        		// 			error: true,
        		// 			message: "Unable to run service, invalid permissions"
        		// 		}
        		// 	});
        		// }

        		// let permissionForServiceNode = await funcInSandbox.universe.getNodeAtPath('permissions.' + serviceName);

        		// // Depending on permissions, run stuff 
        		// if(permissionForServiceNode){
	        	// 	switch(permissionForServiceNode.type){

	        	// 		case 'std.second.type.code_at':
	        	// 			// Find permissions code at an address, run that 
	        	// 			console.log('loading code from another address (only redirects one time?)');
        		// 			permissionForServiceNode = await funcInSandbox.universe.getNodeAtPath(permissionForServiceNode.data);
        		// 			if(){

        		// 			}
	        	// 			break;

	        	// 		case 'std.second.type.code':
	        	// 			// Run the permissions code 
	        	// 			break;

	        	// 		default:


	        	// 	}
	        	// }

        		// Load service code 
        		// - pass-thru auth object 
        		let serviceCodeNodeResult = await funcInSandbox.universe.execCodeNode({
        			codeNode: serviceCodeNode, // includes serviceName by default at codeNode._path 
        			inputNode,
        			actionPath, 
        			authNode,
        			requestId
        		});

        		// console.log('Finished running service:', serviceName, 'typeof:', typeof serviceCodeNodeResult);

        		resolve(serviceCodeNodeResult); 


        	});
        },

        checkPermission: (obj)=>{
        	return new Promise(async (resolve, reject)=>{

        		let {
        			eventName, // event name: pre, during, post 
        			serviceName, // services.xyz
        			actionPath, // what we're acting on 
        			inputNode,
        			authNode // with permissions object attached at node.permissions (and node.nodes[name:permissions]) 
        		} = obj;

        		// Permissions must path BOTH! 
        		// - can't be denied by token permissions, or by path permissions 

        		// 1. Check the authNode permissions first 
        		// 2. Check permissions based on the actionPath NOT the serviceName 
        		// - well, eventually check both? 

						let allowStatus = 'deny'; // default initial status 

						// 1. permissions granted through authNode 
						let permissions = [];
						if(!lodash.isArray(authNode.permissions)){
							console.error('authNode.permissions NOT an array!!', authNode.permissions);
						} else {
							permissions = authNode.permissions;
						}
						if(permissions.length){
	    				let authNodeOutput = await funcInSandbox.universe.checkPermissionArray(obj, allowStatus, permissions);
	    				switch(authNodeOutput){
	    					case 'allow':
	    					case 'allow_force':
	    						// continue on 
	    						break;

	    					case 'deny':
	    					case 'deny_force':
	    						console.error('Failed token checkPermissionArray');
	    						return resolve(false);
	    						break;

	    					default:
	    						console.error('unexpected output from authNodeOutput checkPermissionArray:', authNodeOutput);
	    						return resolve(false);
	    						break;
	    				}
	    			} else {
	    				// No permission nodes for token to check! 
	    				// - this is the case for anonymous 
	    				//   - TODO: have anonymous still provide some permission checks? 
	    				//     - could require a Secret to be passed in order to skip this check...
	    			}


    				// passed token permissions 

						let breakCheck;

						// reset allow-status to default "deny"
						allowStatus = 'deny'; 

						// 2. permissions based on actionPath 

        		// Run up the chain for each permission 
        		// - each permission can say "for things lower on chain" 
        		//   - checking for matches 
						let namesToCheck = [];
						let splitNames = actionPath.split('.').reverse();
						splitNames.push('permissions'); // add this so that the root/base is also checked (just the name="permissions.xyz" node)
						for(let idx in splitNames){
						  let val = splitNames.slice(idx).reverse();
						  namesToCheck.push(val.join('.'));
						}

						for(let actionPathSlice of namesToCheck){
							// console.log('checking permissions for path:', actionPathSlice);
							if(breakCheck){
								// console.log('skip permission');
								continue;
							}

	        		// Check a type of permission 
	        		// console.log('getPermissions:', actionPathSlice);
	        		let permissionForActionPathNode = await funcInSandbox.universe.getPermission(actionPathSlice);

	        		let permissionsOutputResult;

	        		// Depending on permissions, run stuff 
	        		if(permissionForActionPathNode){
	        			// console.log('permissionForActionPathNode:', permissionForActionPathNode.name);
		        		switch(permissionForActionPathNode.type){

		        			// case 'std.second.type.simple':
		        			// 	// evaluate simple permissions checking 
		        			// 	permissionsOutputResult = await funcInSandbox.universe.simplePermissionCheck(); // TODO 
		        			// 	break;

		        			case 'types.second.default.permissions':
		        				// Check for matches of the event, serviceName, children, etc. 
		        				// iterate over data.permissions array 
		        				let arr = (permissionForActionPathNode.data && permissionForActionPathNode.data.permissions) ? permissionForActionPathNode.data.permissions : [];
		        				let output = await funcInSandbox.universe.checkPermissionArray(obj, allowStatus, arr);
		        				// console.log('output:', output);
		        				switch(output){
		        					case 'allow':
		        					case 'deny':
		        						allowStatus = output;
		        						break;

		        					case 'allow_force':
		        					case 'deny_force':
		        						allowStatus = output;
		        						breakCheck = true;
		        						break;
		        					default:
		        						console.error('unexpected output from initital checkPermissionArray:', output);
		        						break;
		        				}
		        				break;

		        			default:
		        				console.error('Invalid permissionsForServiceNode.type:', permissionForActionPathNode.type);
		        				break;

		        		}
		        	}

		        }

    				switch(allowStatus){
    					case 'allow':
    					case 'allow_force':
    						return resolve(true);
    						
    					case 'deny':
    					case 'deny_force':
    						return resolve(false);

    					default:
    						console.error('Invalid allowStatus returning from checkPermission:', allowStatus);
    						break;
    				}


        	});
        },

        checkPermissionArray: (obj, allowStatus, permissionsTreeArray)=>{
        	return new Promise(async (resolve, reject)=>{

        		let {
        			eventName, // event name: pre, during, post 
        			serviceName, // services.xyz
        			actionPath, // what we're acting on 
        			inputNode,
        			authNode // with permissions object attached at node.permissions (and node.nodes[name:permissions]) 
        		} = obj;

        		// allowStatus = // allow, deny, allow_force, deny_force 

        		let breakCheck;

    				for(let permissionEntry of permissionsTreeArray){

    					// Verify that service, events, etc. match 
    					// - "actionPath" should also be validated for token permissions (so, if exists?) 

    					// verify serviceNames
    					let serviceNameMatch;
    					let services = permissionEntry.services || [];
    					for(let tmpPattern of services){
    						if(tmpPattern.slice(0,1) == '!'){
    							if(funcInSandbox.universe.pathMatch(serviceName, tmpPattern.slice(1))){
    								// ! = ignore 
    								serviceNameMatch = false;
    							}
    						} else {
    							if(funcInSandbox.universe.pathMatch(serviceName, tmpPattern)){
    								if(serviceNameMatch !== false){
    									serviceNameMatch = true;
    								}
    							}
    						}
    					}
    					if(!serviceNameMatch){
    						// console.log('serviceName doesnt match patterns');
    						continue;
    					}

    					// verify event 
    					let eventNameMatch;
    					let events = permissionEntry.events || [];
    					for(let tmpPattern of events){
    						if(tmpPattern.slice(0,1) == '!'){
    							if(funcInSandbox.universe.pathMatch(eventName, tmpPattern.slice(1))){
    								// ! = ignore 
    								eventNameMatch = false;
    							}
    						} else {
    							if(funcInSandbox.universe.pathMatch(eventName, tmpPattern)){
    								if(eventNameMatch !== false){
    									eventNameMatch = true;
    								}
    							}
    						}
    					}
    					if(!eventNameMatch){
    						// console.log('eventName doesnt match patterns');
    						continue;
    					}


    					// verify actionPath
    					// - only for token permissions, but we're checking it here anyways 
    					if(permissionEntry.paths){
	    					let actionPathMatch;
	    					let paths = permissionEntry.paths || [];
	    					for(let tmpPattern of paths){
	    						if(tmpPattern.slice(0,1) == '!'){
	    							if(funcInSandbox.universe.pathMatch(actionPath, tmpPattern.slice(1))){
	    								// ! = ignore 
	    								actionPathMatch = false;
	    							}
	    						} else {
	    							if(funcInSandbox.universe.pathMatch(actionPath, tmpPattern)){
	    								if(actionPathMatch !== false){
	    									actionPathMatch = true;
	    								}
	    							}
	    						}
	    					}
	    					if(!actionPathMatch){
	    						// console.log('actionPath doesnt match patterns');
	    						continue;
	    					}
	    				}

    					if(breakCheck){
    						continue;
    					}

    					// get code node 
    					let permissionCodeNode = await funcInSandbox.universe.getNodeAtPath(permissionEntry.code);
    					if(!permissionCodeNode){
    						console.error('Missing permissionCodeNode for path:', permissionEntry.code, 'in permission:', permissionEntry.name);
    						continue;
    					}
	        		let permissionsOutputResult = await funcInSandbox.universe.execCodeNode({
	        			codeNode: permissionCodeNode,
	        			inputNode: {
	        				eventName,
	        				serviceName,
		        			actionPath, 
		        			inputNode, 
		        			authNode
	        			}
	        		});

	        		// console.log('permissionsOutputResult:', permissionsOutputResult);

	        		switch(typeof permissionsOutputResult){
	        			case 'string':
	        				// allow 
	        				// deny 
	        				// allow_force 
	        				// deny_force 
	        				// continue (aka null) 
	        				switch(permissionsOutputResult){
	        					case 'allow':
	        					case 'deny':
	        						allowStatus = permissionsOutputResult;
	        						break;

	        					case 'allow_force':
	        					case 'deny_force':
	        						allowStatus = permissionsOutputResult;
	        						breakCheck = true;
	        						break;

	        					case 'continue':
	        						break;

	        					default:
	        						console.error('Invalid string response from permissionsOutputResult:', permissionsOutputResult);
	        						break;
	        				}
	        				break;

	        			case 'boolean':
	        				// check for the output of the response
	        				let boolOutput = permissionsOutputResult.toString(); // "true" or "false" 
        					if(permissionEntry.output && permissionEntry.output.hasOwnProperty(boolOutput)){
        						// string, or array of permissions to process 
        						switch(typeof permissionEntry.output[boolOutput]){
        							case 'string':
				        				switch(permissionEntry.output[boolOutput]){
				        					case 'allow':
				        					case 'deny':
				        						allowStatus = permissionEntry.output[boolOutput];
				        						break;

				        					case 'allow_force':
				        					case 'deny_force':
				        						allowStatus = permissionEntry.output[boolOutput];
				        						breakCheck = true;
				        						break;

				        					case 'continue':
				        						break;

				        					default:
				        						console.error('Invalid string response from permissionsOutputResult:', permissionsOutputResult);
				        						break;
				        				}
        								break;

        							case 'object':
        								// array!
        								if(lodash.isArray(permissionEntry.output[boolOutput])){
        									let arr = permissionEntry.output[boolOutput];
					        				let output = await funcInSandbox.universe.checkPermissionArray(obj, allowStatus, arr);
					        				switch(output){
					        					case 'allow':
					        					case 'deny':
					        						allowStatus = output;
					        						break;

					        					case 'allow_force':
					        					case 'deny_force':
					        						allowStatus = output;
					        						breakCheck = true;
					        						break;
					        					default:
					        						console.error('unexpected output from initital checkPermissionArray:', output);
					        						break;
					        				}
        								} else {
        									console.error('Invalid typeof permissionEntry.output.true:', 'object, but NOT an array');
        								}
        								break;
        							default:
        								console.error('Invalid typeof permissionEntry.output.true:', typeof permissionEntry.output.true);
        								break;
        						}
        					} else {
        						// continue, cuz output.true does not exist 
        						// - we REQUIRE "continue" to exist at least! 
        						console.error('Missing permissionEntry.output.hasOwnProperty(boolOutput). boolOutput:', boolOutput);
        					}
	        				break;


	        			default:
	        				// expecting undefined/null output 
	        				// - just continue 
	        				break;
	        		}

	        		// permissionEntry.output: 
	        		// - determines what to do based on response from code 
	        		//   - allow_force, deny_force, allow, deny, continue, or an array of permissions 
	        		//   - default is to continue 

	        		// allow/deny change-and-continue a flag for if stuff is allowed 
	        		// - not sure if this makes sense or is useful..?



	        		// possible output: 
	        		// - true: allow,  
	        		// - false: disallow, stop 
	        		// - null: continue 


	        	}

	        	return resolve(allowStatus);

        	});
        },

        getPermission: (permissionPath, depth)=>{
        	return new Promise(async (resolve, reject)=>{

        		depth = depth || 1;
        		if(depth > 10){
        			// too many redirects
        			console.log('too many redirects in getPermission'); 
        			return resolve(false);
        		}

        		let permissionsNode;
        		try {
        			permissionsNode = await funcInSandbox.universe.getNodeAtPath(permissionPath);
        		}catch(err){
        			console.error('permissionsNode error:', err);
        		}

        		// Depending on permissions, run stuff 
        		if(permissionsNode){
	        		switch(permissionsNode.type){

	        			case 'types.second.default.permissions':
	        				break;

	        			case 'std.second.type.permission_at':
	        				// Use permissions from another node 
        					permissionsNode = await funcInSandbox.universe.getPermission(permissionsNode.data, depth + 1);
	        				break;

	        			default:
	        				console.error('Invalid permissionsNode.type', permissionsNode.type, permissionsNode.name);
	        				break;

	        		}
	        	}

	        	return resolve(permissionsNode);

        	});
        },



      }
    },ob.context);

		global.funcInSandboxLatest = funcInSandbox;

		let requireObj = null;
		let requirePath = null;

		// exec (path) vs. code (in-node) 
		if(ob.useExec){
			// console.log('USING EXTERNAL REQUIREOBJ', ob.context.SELF.data.exec);
			requireObj = {};

			let rootPath = path.join(process.env.ATTACHED_VOLUME_ROOT, ob.context.SELF.name) + '/';
			requirePath = path.join(rootPath, ob.context.SELF.data.exec);
			// console.log('rootPath:', rootPath);
			// console.log('requirePath:', requirePath);
			requireObj.root = rootPath;
			requireObj.external = true;
			requireObj.builtin = ['*'];
			// requireObj.context = 'sandbox'; // 'host'
		}

    // using VM, NOT !!!!!!! NodeVM from vm2!!! (external modules NOT allowed!) 
    // let vm = new VM({
    let vmObj = {
      // console: 'off', //'inherit',
      console: 'inherit', //'inherit',
      sandbox: funcInSandbox, // all the passed-in context variables (node, tenant) 
      nesting: true,
      timeout: ob.timeout || (5 * 1000), //5 * 1000, // default timeout of 5 seconds 
      require: requireObj
      // {
      //   // external: true,
      //   // [
      //   //   '@stdlib/stdlib', // stdlib with lots of math functions
      //   //   'lodash', // some basic useful functions 
      //   //   'luxon', // datetime with good timezone support built-in 
      //   //   'bigi', // big integer stuff for bitcoin
      //   //   'bitcoinjs-lib', // big integer stuff for bitcoin
      //   // ].concat(ob.requires || []), // also use passed-in libraries!
      //   // builtin: [],
      //   // root: "./",
      //   // mock: {
      //   //   fs: {
      //   //     readFileSync() { return 'Nice try!'; }
      //   //   }
      //   // }
      // }
    }
	
		let vm;
		if(ob.useExec){
			vm = new NodeVM(vmObj);
		} else {
			vm = new VM(vmObj);
		}
    

    // process.on('uncaughtException', (err) => {
    //   process.send({
    //     error: true,
    //     err: 'Asynchronous error caught, uncaughtException'
    //   });
    // })

    let output;
    try {
      output = vm.run(ob.evalString, requirePath);
      // process.send('OUTPUT:' + ob.evalString);
      // output could be a promise, so we just wait to resolve it (and resolving a value just returns the value :) )
      if(ob.useExec){
      	try {
      		let data = await output({
      			universe: funcInSandbox.universe,
      			...ob.context,
      		}); // SELF, INPUT, PATH, 
      		resolve(data); // respond to parent 
      	}catch(err){
      		console.error('Failed running newer vm function:', err);
      		funcInSandbox.universe.scriptError(err, ob.context.SELF);
      	}
      } else {
      	// inline
	      Promise.resolve(output)
	      .then(async (data)=>{
	          // console.log(JSON.stringify(data));
	          // process.stdout.write(JSON.stringify(
	          //     data
	          // ));

	          // console.log('DATA3:', data);

	          // should be returning a Node!
	          resolve(
	            data
	          ); // sends up from subprocess/child

	          // prevent wipe for awhile 
	          await Promise.resolve(funcInSandbox.universe.wipeFunc)

	          // if(output && output.keepVM === true){
	          //   // not used, always not kept (was maybe using when ob was nulled for scheduler...)
	          // } else {
	            output = null;
	            setTimeout(()=>{
	              // console.log('freememory-universe');
	              data = null;
	              ob = null;

	              // free memory here? delete the vm entirely? 
	              delete funcInSandbox.universe;
	              funcInSandbox = null;
	              vm = null;

	              // console.log('Cleared funcInSandbox');

	            },100);
	          // }


	          // exit();
	      })
	      .catch(err=>{
	        console.error('---Failed in VM1!!!---- internal_server_error. --', codeNode ? codeNode.name:null, ob.nodePath, err, err.toString ? err.toString():null, output);
	        resolve({
	          type: 'internal_server_error_public_output:0.0.1:local:3298ry2398h3f',
	          data: {
	            error: true,
	            err: 'Error in returned promise',
	            str: err.toString(),
	            nodePath: ob.nodePath,
	            code: ob.evalString
	          }
	        });
	      })
	    }
    }catch(err){
      console.error('---Failed in VM2!!!----', codeNode ? codeNode.name:null, ob.nodePath, err, err.toString ? err.toString():null);
      resolve({
          type: 'internal_server_error_public_output:0.0.1:local:3298ry2398h3f',
          data: {
            error: true,
            err: 'Error in code (without a Promise)',
            str: err.toString(),
            nodePath: ob.nodePath || 'Missing nodePath',
            code: ob.evalString
            // msg: err.message,
            // line: err.lineNumber,
            // stack: err.stack,
            // keys: Object.getOwnPropertyNames(err)
          }
      });
    }

  });
}


// Your AI is going to look for the data in its memory, but if you delete it, then it wont be able to find it. Just like removing a part of your brain, you cant just wish it back in place! 
// - "surgery" is performed by bypassing your AIs controls on data and directly editing the database 

// export default incomingAIRequest;
export {
	// incomingAIRequest,
	// incomingAIRequestWebsocket,
	// incomingAIRequestSocketIO,
	MySecond
}



// Proof-of-X network is storing: 
// - txId: js-schema for something (PointerType, ActionInput) 







