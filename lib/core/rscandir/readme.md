# RScandir

Recursively scan a directory.

## Rationale

Organizing configuration and data files on the filesystem is the simplest way to segment units of information.  Reading these files effectively and simply is fundamental to developing complex and scalable applications.

## Dependencies
<table>
    <tr>
        <td><strong>Name</strong></td>
        <td><strong>Description</strong></td>
    </tr>
    <tr>
        <td><strong>minimatch</strong></td>
        <td>Used to perform glob-style filtering.</td>
    </tr>
    <tr>
        <td><strong>wildstring</strong></td>
        <td>Performs wildcard filtering.</td>
    </tr>
</table>

## Example Usage

Use `require('ncli-core-rscandir')(folderName)` to retrieve an array of filenames given **folderName**.

## `require('ncli-core-rscandir')` Behavior
Includes the RScandir.walkSync method.

## Ignoring Folders
It's useful to ignore folders to speed up reads.  For example, by default RScandir is configured to ignore `node_modules/**/*`.  Ignores are performed prior to reading.
<table>
    <tr>
        <td><code>Type</code></td>
        <td>Ignores</td>
    </tr>
    <tr>
        <td><code>NODE_MODULES</code></td>
        <td>All node_modules folder reads.</td>
    </tr>
    <tr>
        <td><code>DOT_FOLDERS</code></td>
        <td>All folders beginning with a period, e.g. <code>.vscode</code>.</td>
    </tr>
    <tr>
        <td><code>GIT_IGNORE</code></td>
        <td>All subfolders matching entries of a <code>.gitignore</code> file found while searching.</td>
    </tr>
</table>

## Filtering Results
Filters may be performed using `glob`-style syntax, with wilcards, or using `RegExp`.  Filters are performed after reading and do not optimize RScandir.  There are various ways to specify a filter.  Consider the following examples to retrieve only JSON files from a search given the `rscandir` object:

<table>
    <tr>
        <td><code>Code</code></td>
        <td>Method</td>
        <td>Why?</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName', '\*\*/\*.json')</code></td>
        <td>glob</td>
        <td>Used two asterisks in filter.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName', '\*.json')</code></td>
        <td>wildcard</td>
        <td>Used one asterisks in filter.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName', {<br>&nbsp;&nbsp;pattern: '\*.json',<br>
        &nbsp;&nbsp;type: 'glob'
        <br>})</code></td>
        <td>glob</td>
        <td>Specified a type.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName', /.+\.json$/g)</code></td>
        <td>RegExp</td>
        <td>Filter field is a RegExp object.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName/\*.json')</code></td>
        <td>Wildcard</td>
        <td>Single <code>*</code> character used in folder field.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName/\*\*/\*.json')</code></td>
        <td>glob</td>
        <td>Double <code>**</code> character used in folder field.</td>
    </tr>
    <tr>
        <td><code>rscandir('folderName/*.json', 'glob')</code></td>
        <td>glob</td>
        <td>Specified <code>glob</code> in filter field when asterisk used in folder field.</td>
    </tr>
</table>

<br>
<br>
<br> 
<img src="../../../media/logo.png" width="250"/>