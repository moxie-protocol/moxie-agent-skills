

## Steps to keep repo in sync with public repo
To Keep this repo in sync with public eliza repo

1. Set remote:
    ```
    git remote add upstream https://github.com/elizaOS/eliza.git
    git remote set-url --push upstream DISABLE
    ```
2. Get latest code from upstream
   ```
     git fetch upstream
   ```
3. Rebase branch with upstream mastee
    ```
    git rebase upstream/main
    ```

## Steps for local setup & run moxie-agent
1. Need node Node.js 23+
2. pnpm 9+
3. set node version
    ```bash
    pnpm env use --global 23.3.0
    ```
4. git clone git@github.com:moxie-protocol/moxie-eliza-agent.git
5. cd eliza
6.  Get latest release
    ```
    git checkout $(git describe --tags --abbrev=0)
    ```
7. `pnpm install --no-frozen-lockfile`
8. `pnpm build`
9. Setup .env file
10. Run agent `pnpm start --character="characters/trump.character.json"`
11. Run client `pnpm start:client`

Once the client is running, you'll see a message like this:

```
➜  Local:   http://localhost:5173/
```

## Troubleshoot

1. If getting error related to sharp package `/node_modules/sharp` then set Env var
   ```
   export SHARP_IGNORE_GLOBAL_LIBVIPS=1
   ```
