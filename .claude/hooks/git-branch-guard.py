#!/usr/bin/env python3
"""PreToolUse hook (Bash matcher): blocks direct commits/pushes to main/master.

PalletIQ governance requires work to land on main via PR (see CONTRIBUTING.md /
docs/GOVERNANCE.md), not direct commits or pushes to main. This is a workflow
guardrail, not a shell parser or a security boundary — it recognizes common
`git commit` / `git push` invocations and errs on the side of allowing anything
it can't confidently classify, rather than blocking unrelated commands.
"""
import json
import re
import subprocess
import sys

PROTECTED_BRANCHES = {"main", "master"}


def current_branch():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def leading_subcommand(segment):
    """Return (subcommand, remaining_words) if `segment` starts with a git
    invocation (after any leading VAR=val assignments), else (None, None).
    Flags before the subcommand (tokens starting with '-') are skipped; flags
    that take a separate value argument (e.g. `-C <dir>`) are not specially
    handled and may cause a miss — acceptable for a soft guardrail.
    """
    words = segment.strip().split()
    i = 0
    while i < len(words) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[i]):
        i += 1
    if i >= len(words) or words[i] != "git":
        return None, None
    i += 1
    while i < len(words) and words[i].startswith("-"):
        i += 1
    if i >= len(words):
        return None, None
    return words[i], words[i + 1 :]


def push_target_branch(rest, branch):
    positional = [t for t in rest if not t.startswith("-")]
    if not positional:
        return branch  # bare `git push` -> current branch (with upstream config)
    if len(positional) == 1:
        return branch  # `git push <remote>` -> current branch to same-named ref
    refspec = positional[1].lstrip("+")
    dst = refspec.split(":")[-1] if ":" in refspec else refspec
    return dst.split("/")[-1] if dst else branch


def deny(reason):
    print(
        json.dumps(
            {
                "systemMessage": reason,
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                },
            }
        )
    )
    sys.exit(0)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    command = (payload.get("tool_input") or {}).get("command") or ""
    if "git" not in command:
        sys.exit(0)

    branch = current_branch()
    segments = re.split(r"&&|\|\||;|\|", command)

    for segment in segments:
        subcommand, rest = leading_subcommand(segment)
        if subcommand is None:
            continue

        if subcommand == "commit" and branch in PROTECTED_BRANCHES:
            deny(
                f"Blocked: 'git commit' directly on '{branch}'. PalletIQ governance "
                "requires changes to land on main via PR, not direct commits "
                "(see CONTRIBUTING.md). Create a feature branch first, e.g.:\n"
                "  git checkout -b PALLETIQ-NNN-short-slug"
            )

        if subcommand == "push":
            target = push_target_branch(rest, branch)
            if target in PROTECTED_BRANCHES:
                deny(
                    f"Blocked: 'git push' targeting '{target}'. PalletIQ governance "
                    "requires changes to land on main via PR, not direct pushes "
                    "(see CONTRIBUTING.md). Push your feature branch and open a PR "
                    "instead, e.g.:\n"
                    "  git push -u origin <feature-branch> && gh pr create"
                )

    sys.exit(0)


if __name__ == "__main__":
    main()
