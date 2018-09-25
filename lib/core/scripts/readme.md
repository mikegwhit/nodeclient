# Scripts

Manage tasks for large multi-package projects.  Scripts can be called 
without changing directories.  Distribute multipackage package (i.e. multiple
packages in subdirectories) and cleanly have lifecycle scripts run.  Overrides
and configuration are available for edge cases.

## Installation

### Global Installation
If you install globally, this is more desirable on some systems to access the 
`ncli` command which allows you to interface with the task runner.

### Local Installation
For local installations, some systems like Windows require you to type 
`./node_modules/.bin/ncli` to acccess the task runner.

## Example Usage
From the command-line, you should have access to the `ncli` executable.  You can run a script
either listed in the `package.json` file or in the `scripts` subdirectory.  To do this, simply run `ncli scriptName`.

`require('ncli-core-scripts')` returns the Scripts object. If a script is passed
into the command-line, then it is executed.  You may also execute a script as follows with the Scripts object: `require('ncli-core-scripts').execute('scriptName');`.

## How To: Pass Arguments to Scripts
Generally, you are able to pass arguments to via `npm run-script` if you use the
special `-- --arg=value` format, where `--` notes the end of arguments and all
arguments following `--` are passed directly to the script.  For example, 
consider:

```ncli someScript -- --foo=bar --a=123```

This will call `someScript` inside `somePackage` and pass the arguemnts 
`foo=bar` and `a=123` into the `someScript` execution.

## CLI API

There are multiple methods of calling scripts.  In general, one or more scripts
may be called.  Scripts may be called specific to a package, or wildcards may 
be used to match one or more scripts or packages.  Arguments can be passed into a script.

<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Examples</td>
    </tr>
    <tr>
        <td><strong>Simple</strong></td>
        <td>Call a single script across all packages.</td>
        <td>
        <code>ncli someScript</code><br>
        <code>./node_modules/.bin/ncli someScript</code>
        </td>
    </tr>
    <tr>
        <td><strong>Scoped</strong></td>
        <td>Call a single script across a single package.</td>
        <td>
        <code>ncli somePackage/someScript</code><br>
        </td>
    </tr>
    <tr>
        <td><strong>Scoped With Wildcards</strong></td>
        <td>Call a single script across a packages matching the wildcard.</td>
        <td>
        <code>ncli ncli-core*/someScript</code><br>
        </td>
    </tr>
    <tr>
        <td><strong>Simple With Arguments</strong></td>
        <td>Call a single script across multiple packages with arguments.</td>
        <td>
        <code>ncli someScript -- --foo=bar</code><br>
        </td>
    </tr>
    <tr>
        <td><strong>Scoped With Arguments</strong></td>
        <td>Call a single script across a single package with arguments.</td>
        <td>
        <code>ncli somePackage/someScript -- --foo=bar</code><br>
        </td>
    </tr>
    <tr>
        <td><strong>Multiple Scripts</strong></td>
        <td>Call multiple scripts across a single and scoped packages.</td>
        <td>
        <code>ncli somePackage/someScript anotherScript foo*/bar</code><br>
        </td>
    </tr>
</table>

## Dependencies
<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
    </tr>
    <tr>
        <td><strong>minimist</strong></td>
        <td>Reads arguments from command-line.</td>
    </tr>
    <tr>
        <td><strong>ncli-core-configs</strong></td>
        <td>Allows configuration.</td>
    </tr>
    <tr>
        <td><strong>ncli-core-files</strong></td>
        <td>Reads from the scripts folder.</td>
    </tr>
</table>

## Install Behavior
Creates a `scripts` folder in the installation directory.  Installs the `ncli` executable to the `./node_modules/.bin` directory.


## `require('ncli-core-scripts')` Behavior
Returns an object of Scripts.  Executes any command-line scripts.

<img src="../../../../media/logo.png" width="250"/>