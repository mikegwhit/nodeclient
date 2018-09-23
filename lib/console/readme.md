# Console
Overrides the default console for prettier messages.  Messages are displayed
with the following format: 

<code style="background: #222; color #fff;">[<span style="color: rgb(100, 100, 255);">PackageName</span>] [<span style="color: red">Error</span>|<span style="color: rgb(50, 150, 255)">Info</span>|<span style="color: #888">Log</span>|<span style="color: yellow;">Warning</span>] Log Message.</code>

For example, an error message might look like this:

<code style="background: #222; color #fff;">[<span style="color: rgb(100, 100, 255);">ncli-server</span>] [<span style="color: red">Error</span>] User received 500 error.</code>

Console also enables whitelisting/blacklisting, log redirection, and console summaries.

## Having Fun with Emoji

With the introduction of unicode emoji, you can now write fun console and log messages!  Since NPM does not allow emoji in package names, you can add these emoji safely to your package name using the `friendlyName` key in your `package.json` file.

See a full emoji list here: https://unicode.org/emoji/charts/full-emoji-list.html  
Using the `friendlyName` field, all console messages occurring within the package will be printed using the `friendlyName` which can include emoji.

## Configs
<table>
    <tr>
        <td>Name</td>
        <td>Description</td>
        <td>Default</td>
    </tr>
    <tr>
        <td><strong>blacklist</strong></td>
        <td>
            Package names to blacklist from displaying console messages.  By default, squelched packages are redirected to logs.
            Wildcards may be used to match multiple packages.
        </td>
        <td><code>["*"]</code></td>
    </tr>
    <tr>
        <td><strong>loggingMode</strong></td>
        <td>
            Either <code>file</code> or <code>package</code>.  Currently only supports package logging.
        </td>
        <td><code>package</code></td>
    </tr>
    <tr>
        <td><strong>summary</strong></td>
        <td>
            Package names to summarize.  Wildcards may be used to match multiple packages.
        </td>
        <td><code>["*"]</code></td>
    </tr>
    <tr>
        <td><strong>summaryInterval</strong></td>
        <td>
            Package names to summarize.  Wildcards may be used to match multiple packages.
        </td>
        <td><code>30000</code></td>
    </tr>
    <tr>
        <td><strong>thresholdCooldown</strong></td>
        <td>
            After throttling has occurred, number of milliseconds before a log count is decreased.
        </td>
        <td><code>150</code></td>
    </tr>
    <tr>
        <td><strong>thresholdCount</strong></td>
        <td>
            The number of log messages to trigger throttling.  
        </td>
        <td><code>2</code></td>
    </tr>
    <tr>
        <td><strong>whitelist</strong></td>
        <td>
            Package names on the whitelist are not subject to throttling.
        </td>
        <td><code>[]</code></td>
    </tr>
</table>