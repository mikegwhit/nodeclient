# Files

Recursive filename retrieval using the `node_modules` filesystem.  Includes FileWriter and utility functions.  Files are delivered first from `node_modules`, then from subfolder packages, then from the executing package.

## Example Usage

Use `require('ncli-core-files').readFiles(fromFolder);` to retrieve an array listing of files in the `fromFolder` subfolder.  Reads occur in the executing package, subpackages of the executing package and the `node_modules` diretory.

## `require('ncli-core-files')` behavior
Exports a Files class instantiation.

## Dependencies
<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
    </tr>
    <tr>
        <td><strong>chalk</strong></td>
        <td>Creates pretty error messages.</td>
    </tr>
    <tr>
        <td><strong>fs-extra</strong></td>
        <td>Moves files.</td>
    </tr>
    <tr>
        <td><strong>rimraf</strong></td>
        <td>Removes directories and subdirectories in one call.</td>
    </tr>
    <tr>
        <td><strong>stack-trace</strong></td>
        <td>Gets filename of currently executing function's caller.</td>
    </tr>
</table>

## File Contexts

There are five file contexts.

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Example</td>
    </tr>
    <tr>
        <td>Local</td>
        <td>The filesystem relative to which file was called when executing 
            Node.</td>
        <td>
        * `node index.js`
        </td>
    </tr>
    <tr>
        <td>Script</td>
        <td>The filesystem relevant to the first non-`node_modules` folder with
            a `package.json` the executing script.</td>
        <td>
        * `node_modules/bin/foobar`
        </td>
    </tr>
    <tr>
        <td>Global Script</td>
        <td>The filesystem relevant to the first non-`node_modules` folder with
            a `package.json` relative to the current working directory 
            associated with the Node process.</td>
        <td>
        * /usr/local/lib/foobar
        * %AppData%/npm/foobar
        </td>
    </tr>
    <tr>
        <td>node_modules Package</td>
        <td>The filesystem relevant to a package relative to the currently
            executing file.  Looked up by package name as defined by folder
            name directly in `node_modules` folder.</td>
        <td>
        * `node_modules/foo/bar.js`
        </td>
    </tr>
    <tr>
        <td>Local Package</td>
        <td>The filesystem relevant to a package relative to the currently
            executing file.  Looked up by package name as defined by name field
            in `package.json` file.  Requires a local file scan of 
            packages.</td>
        <td>
        * `foo/bar.txt`
        * `foo/package.json`
        </td>
    </tr>
</table>

## FileHelpers Class

Static container class.  Solves common use cases for interacting with a Node.js
development filesystem.  Brings various dependencies into one place.

* Change directory to originally executed filepath.
* Get the most relevant `package.json` __name__ field given a __file__.
* Get first folder not contained in a `node_modules` path if executing from a
 `node_modules` context.
* Given some filepath, find all package.json files not contained in a
  `node_modules` file tree.
* Resolve absolute file paths given a __PackgeName__/__File__ format when local
 use and package use is desired.
 
## FileScanner Class

Provides file reading helperes for local and package contexts.  Additionally 
provides interface for whitelisting and blacklisting packages.

## FileWriter Class

Provides file writing helpers for writing files to local and package contexts.  
Writes files irrespective of file path existing (i.e. creates folders).  
Manages temporary files (i.e. removes on process exit).  Moves files in bulk.

<br>
<img src="../../../media/logo.png" width="250"/>