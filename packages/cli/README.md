# Governor CLI

Governor connects prompt-safe Codex token metadata to signed Git context, then creates transparent estimated-cost receipts on GitHub pull requests.

## Connect this computer

After signing in to Governor, copy the one-time command from the Setup page:

```bash
npx --yes @muzman123/governor@latest connect --url https://YOUR_GOVERNOR_HOST --token YOUR_ONE_TIME_TOKEN
```

The command creates a backup of the Codex configuration, keeps prompt collection disabled, preserves an existing Codex `notify` command, and waits for a real Codex turn to verify the connection. Restart Codex when it asks, then complete one task from a connected GitHub repository.

To intentionally replace a previous Governor connection on the same computer, generate a replacement token in Governor Setup and append `--replace`. This replaces only Governor's managed telemetry block; it never overwrites a third-party OTel configuration.

## Other commands

```bash
governor verify --wait 180
governor capture --file path/to/session.jsonl
```

Governor never stores prompts, responses, or generated code.
