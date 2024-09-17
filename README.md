> [!IMPORTANT]
> This is pre-alpha software! The first release of the new Satellite application stack will soon be ready (at which point this notice will be removed) but until then expect that things will be moved around, changed, and deleted without warning. In fact we currently make no guarantees about anything.
>
> BUILD IN PUBLIC

# Satellite Desktop

Satellite Desktop lets you easily install and manage a [personal-node](https://github.com/satellite-earth/personal-node) running on your local machine.

## Setup Development environment

This project uses [pnpm](https://pnpm.io/) to manage dependencies

NOTE: There is an issue with `node-gyp` and python versions `>3.12` that require an extra python package to be install. see this [issue](https://stackoverflow.com/questions/77251296/distutils-not-found-when-running-npm-install/77638742#77638742) for more info

This can be installed with `brew install python-setuptools`

Then you can clone the repo and install the dependencies

```sh
git clone https://github.com/satellite-earth/desktop.git
cd desktop
pnpm install
```
