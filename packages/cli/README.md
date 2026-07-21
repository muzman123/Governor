# Governor CLI

Governor connects prompt-safe Codex token metadata to signed Git context, then creates transparent estimated-cost receipts on GitHub pull requests.

## Connect this computer

After signing in to Governor, copy the one-time command from the Setup page:

```bash
npx --yes @muzman123/governor@latest connect --url https://YOUR_GOVERNOR_HOST --token YOUR_ONE_TIME_TOKEN
```

The command backs up Codex configuration and hooks, keeps prompt collection disabled, preserves an existing Codex `notify` command, and installs `UserPromptSubmit` and `PostToolUse` hooks that record only Git context. Restart Codex, review and trust the new hooks with `/hooks`, then complete one task from a connected GitHub repository.

To intentionally replace a previous Governor connection on the same computer, generate a replacement token in Governor Setup and append `--replace`. This replaces only Governor's managed telemetry block; it never overwrites a third-party OTel configuration.

To install a newer local runtime and context hooks without replacing the existing telemetry token, run:

```bash
npx --yes @muzman123/governor@latest upgrade
```

## Other commands

```bash
governor verify --wait 180
governor capture --file path/to/session.jsonl
```

## Capture an autonomous GitHub Actions run

For a Codex agent that runs in CI, do **not** reuse a developer's local telemetry token. Create the repository-scoped agent token from the Governor repository dashboard, save it as the `GOVERNOR_AGENT_TOKEN` GitHub Actions secret, then run Governor's composite Action after a Codex JSONL-producing step.

`codex exec --json` emits machine-readable JSONL. Governor reads only the `turn.completed` token counts from that file; it never uploads the prompt, Codex message, tool output, or generated code. Pass the run model explicitly because the documented completion usage object does not always include a model field.

```yaml
- name: Run Codex and save JSONL
  run: |
    CODEX_API_KEY="${{ secrets.OPENAI_API_KEY }}" codex exec --json --model gpt-5.6 "Review this pull request." | tee "$RUNNER_TEMP/codex.jsonl"

- uses: muzman123/Governor/.github/actions/governor-capture@main
  with:
    governor-url: https://YOUR_GOVERNOR_HOST
    token: ${{ secrets.GOVERNOR_AGENT_TOKEN }}
    session-file: ${{ runner.temp }}/codex.jsonl
    model: gpt-5.6
    branch: ${{ github.head_ref || github.ref_name }}
    sha: ${{ github.event.pull_request.head.sha || github.sha }}
```

This creates a `github_actions` event with confidence `1.0`, scoped to that repository, workflow run, branch, and commit, then refreshes any known PR receipt on that branch. It is intended for trusted workflows only; never expose OpenAI or Governor secrets to untrusted pull-request code.

Governor never stores prompts, responses, or generated code.
