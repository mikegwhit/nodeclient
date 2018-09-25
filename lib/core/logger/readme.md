# Logger

Filesystem-based log storage.  Depends on `Winston` library.

## Example Usage

Use `require('ncli-core-logger').create(key, file);` to create a log file.  Log
messages may be stored via the `key` used to create the log file.

## Other Common Functions


## Log Rotation

By default, logs rotate after 20mb.  This can be changed globally via the 
configs/logger.json file or set on a file-by-file basis.
 
## Dependencies
<table>
    <tr>
        <td><strong>winston</strong></td>
        <td>Creates file interface for loggin.</td>
    </tr>
</table>

<br>
<img src="../../../media/logo.png" width="250"/>