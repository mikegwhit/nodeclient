# Cache

Cache saves on filesystem traversals and reads.  It is used internally to read
all node_modules folders for all folders used by ncli.  This is done in a precache 
step on each `npm install` or `npm update`.

It is otherwise automatically used by the `RScandir` class to prevent large 
filesystem reads from occurring twice within a process lifetime.

Compute caching is possible via `Cache.get` and `Cache.set`.


## Configs
<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Default</td>
    </tr>
    <tr>
        <td><strong>expireTime</strong></td>
        <td>
            The time in which caches should be rebuilt.  This is done for system
            health reasons since lifecycle scripts won't always be 100% perfect.
            This is also because the cache is for volatile data only.
        </td>
        <td>864000000 (10 days)</td>
    </tr>
    <tr>
        <td><strong>folders</strong></td>
        <td>The folders scanned by the precache step.</td>
        <td>
            <ul>
                <li>api</li>
                <li>configs</li>
                <li>keys</li>
                <li>scripts</li>
                <li>signals</li>
                <li>tests</li>
                <li>timers</li>
                <li>www</li>
            </ul>
        </td>
    </tr>
    <tr>
        <td><strong>inMemory</strong></td>
        <td>
        Whether or not to hold data inMemory by default.  Default is *true*.  If
        false, cache grabs will never be stored in memory by the class object.
        Individual caches can be set to never store in memory or to only store
        in memory.
        </td>
        <td>true</td>
    </tr>
    <tr>
        <td><strong>memoryThreshold</strong></td>
        <td>
        The number of bytes (characters) past which any in-memory data will be 
        written to the filesystem.  Caches are stored to the filesystem until
        the memory usage has been reduced to match or be less than the memory
        threshold.
        </td>
        <td>true</td>
    </tr>
    <tr>
        <td><strong>recursionThreshold</strong></td>
        <td>
        For RScandir integration, this is the number of recursions within a 
        particular recursive scandir to automatically trigger cache storage.
        </td>
        <td>20</td>
    </tr>
</table>

## A List of Precached Folders

The following folders are pre-cached:
* api
* configs
* keys
* scripts
* signals
* tests
* timers
* www

## Dependencies
<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
    </tr>
    <tr>
        <td><strong>ncli-core-files</strong></td>
        <td>Used to run precache step.</td>
    </tr>
    <tr>
        <td><strong>ncli-core-rscandir</strong></td>
        <td>Used to add Cache object.</td>
    </tr>
</table>

## `require('ncli-core-cache')` Behavior
Returns the Cache singleton object.

<img src="../../../media/logo.png" width="250"/>