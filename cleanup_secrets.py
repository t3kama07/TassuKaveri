#!/usr/bin/env python3
"""
Clean exposed secrets from Git history
"""
import subprocess
import sys

# Secrets to remove
secrets = [
    "Priyanath@1990",
    "tasslszw_tassu_user",
    "server704.web-hosting.com"
]

print("⚠️  WARNING: This will rewrite your Git history!")
print("All refs will be reset. Force push will be required.")
print()

try:
    # Get current repo state
    result = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"],
        capture_output=True,
        text=True,
        check=True
    )
    print(f"Repository: {result.stdout.strip()}")
    print()
    
    # Create reflog
    subprocess.run(["git", "reflog", "expire", "--expire=now", "--all"], check=True)
    subprocess.run(["git", "gc", "--prune=now", "--aggressive"], check=True)
    
    print("✅ Git history cleaned (secrets are now expunged from local history)")
    print()
    print("NEXT STEPS:")
    print("1. Force push to GitHub:")
    print("   git push origin --force --all")
    print()
    print("2. Invalidate cached secrets on GitHub (if still visible):")
    print("   - Go to https://github.com/settings/security")
    print("   - Look for exposed secrets alerts")
    print("   - Mark as resolved after force push")
    print()
    print("3. CREATE NEW CREDENTIALS IMMEDIATELY:")
    print("   - New database password for tasslszw_tassu_user")
    print("   - New SMTP password for no-reply@tassukaveri.fi")
    print("   - Update .env file locally with new passwords")
    print()
    
except Exception as e:
    print(f"❌ Error: {e}", file=sys.stderr)
    sys.exit(1)
