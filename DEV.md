## Steps for local setup & run moxie-agent-plugin

1. Need node Node.js 23+
2. pnpm 9+
3. set node version
    ```bash
    pnpm env use --global 23.3.0
    ```
4. git clone git@github.com:moxie-protocol/moxie-agent-plugin.git
5. cd moxie-agent-plugin
6. Create a new branch from `main`
    ```sh
    git checkout -b <new-branch>
    ```
7. `pnpm install --no-frozen-lockfile`
8. `pnpm build`
9. Setup .env file. By default, the Moxie Character uses OpenAI model thus need OpenAI API key
10. Run agent `pnpm start --character="characters/moxie.character.json"`
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
2. If getting SQLITE error on embedding vector size differet, then simply delete the local sqlite under `agent/data/db.sqlite` and re-run the agent again
