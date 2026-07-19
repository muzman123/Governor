# Governor CLI

Governor connects prompt-safe Codex token metadata to signed Git context, then creates transparent estimated-cost receipts on GitHub pull requests.

## Connect this computer

After signing in to Governor, copy the one-time command from the Setup page:

```bash
npx --yes @muzman123/governor@latest connect --url https://YOUR_GOVERNOR_HOST --token YOUR_ONE_TIME_TOKEN
```

The command creates a backup of the Codex configuration, keeps prompt collection disabled, preserves an existing Codex `notify` command, and waits for a real Codex turn to verify the connection. Restart Codex when it asks, then complete one task from a connected GitHub repository.

## Other commands

```bash
governor verify --wait 180
governor capture --file path/to/session.jsonl
```

Governor never stores prompts, responses, or generated code.
