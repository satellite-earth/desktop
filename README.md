> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything.
>
> BUILD IN PUBLIC

# Satellite Desktop

Satellite Desktop lets you easily install and manage a nostr relay and blossom media proxy running on your local machine.

It basically bundles 3 things:

- A local dedicated Satellite node to back up your notes and media ([personal-node](https://github.com/satellite-earth/personal-node))
- An social interface for interacting with remote public nodes ([web-ui](https://github.com/satellite-earth/web-ui))

### Run it

You can try running it yourself in dev mode:

`npm i`

`npm run dev`

You can also try packaging it. If you're on a mac, run `npm run build`. If you don't have a mac, run `npm run build-linux`. If you're on Windows you're out of luck.

In either case, because of hardcoded relative paths, this will only work if the repos mentioned above are in the same parent directory alongside `desktop`. (Also, make sure you separately `npm run build` all three repos after cloning into them before trying to launch desktop)
