# NCLI R1

nodeclient (NCLI) assists developers with managing multiple Node.js packages in an application ecosystem.  With NCLI, you can readily call scripts and manage configurations.


## Rationale

It's difficult to manage large Node.js projects.  Developers typically discover a single Git repository is more valuable than many NPM packages.  Developers become confused about the purpose of a Node.js package.  Lerna is one of a small number of packages that help utilize the Node.js filesystem for large projects.  However, Lerna has a learning curve.  Developers understand that packages are an option for segmenting large projects but are left without a tool to truly leverage the Node.js filesystem.


## Approach

Multi-package development should allow you to decouple development to allow multiple developers or teams to progress your application ecosystem simultaneously.  The way NCLI solves this is 1) semantically grouping files by folder within a package and 2) accessing those files with great tooling.  Example folders include:



*   `api`
*   `configs`
*   `functions`
*   `keys`
*   `scripts`
*   `tests`
*   `timers`
*   `www`

You may already see how this can be useful based on a recent project you know.  For instance, consider the following application ecosystem for a chatbot:




```
📁 /chatbot
📁 /backend
    📁 /configs
        📄 chatbot.json
    📁 /scripts
        📄 build.js
        📄 start.js
        📄 package.json
📁 /data
    📁 /configs
        📄 chatbot.json
    📁 /scripts
        📄 build.js
    📄 package.json
📁 /frontend
    📁 /configs
        📄 chatbot.json
    📁 /scripts
        📄 build.js
        📄 package.json
    📁 /scripts
        📄 build.js
📄 package.json
```


In the above ecosystem, there is a `chatbot-frontend`, `chatbot-data`, and `chatbot-backend` package.  Each package implements a `configs` and `scripts` folder.


### Without NCLI

Without NCLI, you'll need to manually add the `build.js` to the `package.json` file in each package.  Each time you want to run the `build` script, you'll need to change into that directory before running the `npm run-script` command.

Likewise, for `configs` you'll need to read each file and parse it as JSON.  You need to perform error handling for bad JSON, and if you want to merge `chatbot.json` you need to manually call `Object.assign`.


### With NCLI

NCLI makes this easy.  Run the build script any number of ways without changing directory:


```
 $ ncli build # runs build script in all packages.
 $ ncli chatbot-backend/build # runs build in backend.
 $ ncli chatbot-*/build # runs build in backend/data/frontend.
```


Include configs across packages with one line of code.  The configs object is populated upon requiring NCLI.


```
 require('ncli').configs['build'];
```


In the above example, the build object represents the configs specified across the `chatbot-frontend`, `chatbot-data`, `chatbot-backend` and `chatbot` packages.  The `chatbot` package inherits properties from `chatbot-frontend`, `chatbot-data`, and `chatbot-backend`.  The `chatbot` package additionally overwrites any config keys specified by default.  Internally, this is achieved using `Object.assign`.


## NCLI Features

✅ -- Currently Supported

☐ -- Still in Development

❌ -- Unsupported


<table>
  <tr>
   <td>
   </td>
   <td>NCLI
   </td>
  </tr>
  <tr>
   <td>Task Runner
   </td>
   <td>✅
   </td>
  </tr>
  <tr>
   <td>Configs Management
   </td>
   <td>✅
   </td>
  </tr>
  <tr>
   <td>Console Management
   </td>
   <td>☐
   </td>
  </tr>
</table>



## Installation


```
 $ npm i ncli
```

### Bootstrap Local Packages
To utilize packages in your filesystem and treat them as node_modules, simply require the NCLI package from your code:


```
 require('ncli');
```


Now you can require packages outside node_modules as though they are inside node_modules.


```
📁 /packages
    📁 /mypackage
        📄 foo.js
        📄 package.json
📁 /node_modules
    📁 /otherPackage
        📄 package.json
📄 bar.js
📄 package.json

 require('mypackage'); // great!.
 require('mypackage/foo.js'); // also cool.
 require('node_modules/mypackage'); // yes, even this works.
```



## Basic API


### Get File Listings

If you need a list of all files across all packages, `getFiles` provides an array listing of files given a folder.

**_Example: You need to run SQL files across all packages, where all SQL files live inside a "sql" folder for each package._**


```
 require('ncli').getFiles('sql'); // all files as array.
```



### Get File Contents

If you need the contents of each file across packages, use `getFileContents`.  This function returns an object of file contents, keyed by filename.

**_Example: You need to return an aggregation of logs using string concatenation.  All logs are stored via the "logs" folder for each package._**


```
 require('ncli').getFileContents('logs'); // all function files contents, keyed by filename.
```



### Require Files

If you need to require each file contained within a package folder, use `requireFiles`.  This calls a provided callback function on each `require `call made.  This allows for code execution to be controlled.

**_Example: You'd like to include all routes specified in the "api" folder across packages._**


```
 require('ncli').requireFiles('api', (file, pkg, code, exports) => {
}); // require every function, and run callback on each require.
```



### Get JSON

If you want to read JSON files stored across packages, use `getJSON`.  This utilizes `Object.assign(topMostPackage, subPackage, subSubPackage)`to create a JSON object with the resulting key/values.  The returned object is a JSON object itself, keyed by the filenames, e.g. `obj['configFilename']['key']`.

**_Example: You'd like to create an object of configurations as stored in the "configs" folder per package.  You'd like a hierarchical value returned such that a top-most package inherits config values from sub-packages as well as the top-most package may override keys specified._**


```
 require('ncli').getJSON('configs'); // returns JSON from functions folders, keyed by filename and overwritten/inherited by top-most package via Object.assign.
```



## Solutions

## See Also


### Multi-Package Development

Lerna: [https://github.com/lerna/lerna](https://github.com/lerna/lerna)

<img src="https://lh5.googleusercontent.com/V3T0_6uDoa0DkHYaPwgYceE_OTZDB_ZR_4evW-8Lg0iqfhqrME42EMmBXofWmhwg1S69MXd8iPwiV7denREUVnyPqv-eWaEiI0Tyu3ZxcLYkNEqRoC1i1WnUCE346cGqQo6cGruA" width="150" />


### Task Management

Grunt: [https://github.com/lerna/lerna](https://github.com/lerna/lerna)

<img src="https://lh3.googleusercontent.com/qL-puUnz9OYNIdKYzrHHNJpd1lQYNb003cc02Fu6hUxPHgo27DoTcBWKX-sgBbfMcsuHpHKO06mCY8FMxHIfaJ8yS1Ix9i64WjFD1yRT-rHGg1tNOpH4FjeQiZX42YMMfwOfggfC" width="150" />

npm-run-all: [https://github.com/mysticatea/npm-run-all](https://github.com/mysticatea/npm-run-all)

### Configs Management

Mozilla Convict: [https://github.com/mozilla/node-convict](https://github.com/mozilla/node-convict)

<img src="https://lh3.googleusercontent.com/XVvMJlFRJxanTo4BIN0wRPucw64mpmcEqW5TW-i4ojKH1r60oFnTIA690E3kf7D4tC-p6LkH38UeJmIzT2ainRbTEbA6fDboJPZBG5hLLKx7iBU5IOy56Wiu1ILe5qQxvnN3Z4uh" width="150" />

node-config-manager: [https://www.npmjs.com/package/node-config-manager](https://www.npmjs.com/package/node-config-manager)
