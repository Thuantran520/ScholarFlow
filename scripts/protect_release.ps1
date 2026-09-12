param(
    [string]$Repo = "",
    [string]$Branch = "release",
    [string[]]$AllowUsers = @(),
    [string[]]$AllowTeams = @(),
    [switch]$Apply
)

# ---------------------------------------------------------------------------
# ScholarFlow - protect the release branch
#
# Enforces: a release only lands through a pull request that
#   (1) passes the required status check "build" (npm test + pre-packaging
#       checks), AND
#   (2) is approved by at least one contributor with write access.
#   Force pushes / deletions are blocked, and the branch is protected even
#   for admins, so nobody can bypass the tests with a direct push.
#
# Usage (repo admin, gh CLI installed + authenticated with admin scope):
#   gh auth login
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\protect_release.ps1            # dry-run: prints JSON only
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\protect_release.ps1 -Apply     # actually apply
#
# To restrict push/review access to a specific set of contributors:
#   pwsh ...\protect_release.ps1 -Apply -AllowUsers user1,user2 -AllowTeams team-a
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

if (-not $Repo) {
    $origin = git remote get-url origin 2>$null
    if ($origin -match 'github\.com[:/]([^/]+)/([^/.]+)') {
        $Repo = "$($Matches[1])/$($Matches[2])"
    }
}
if (-not $Repo) {
    Write-Host "[protect_release] FAIL: cannot determine the GitHub repo (pass -Repo)." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Build the protection payload
# ---------------------------------------------------------------------------
$body = [ordered]@{
    required_status_checks = [ordered]@{
        strict   = $true   # also requires the branch to be up to date with release
        contexts = @("build")
    }
    enforce_admins         = $true   # admins cannot bypass the test gate either
    required_pull_request_reviews = [ordered]@{
        required_approving_review_count = 1
        dismiss_stale_reviews           = $true
    }
    restrictions           = $null   # default: anyone with write access may open/approve PRs
    allow_force_pushes     = $false  # no direct force-push workaround
    allow_deletions        = $false
}
if ($AllowUsers.Count -gt 0 -or $AllowTeams.Count -gt 0) {
    # restrict who is allowed to be associated with pushes/merges to this branch
    $restrictions = [ordered]@{
        users = @($AllowUsers)
        teams = @($AllowTeams)
        apps  = @()
    }
    $body.restrictions = $restrictions
}

$json = $body | ConvertTo-Json -Depth 6

Write-Host "Repository   : $Repo"
Write-Host "Branch       : $Branch"
Write-Host "Required check: build (runs 'npm test' + package.ps1 pre-packaging checks)"
Write-Host "Required review: 1 approving contributor review"
Write-Host ""
Write-Host "Payload:"
Write-Host $json

if (-not $Apply) {
    Write-Host ""
    Write-Host "Dry-run mode - nothing changed. Re-run with -Apply to enforce." -ForegroundColor Yellow
    exit 0
}

$ghx = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghx) {
    Write-Host "[protect_release] FAIL: gh CLI not found. Install GitHub CLI and run 'gh auth login'." -ForegroundColor Red
    exit 1
}

& gh auth status >$null 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[protect_release] FAIL: not authenticated. Run 'gh auth login' (admin scope)." -ForegroundColor Red
    exit 1
}

$json | gh api --method PUT "repos/$Repo/branches/$Branch/protection" --input -
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[protect_release] OK: branch protection applied to '$Branch' in $Repo" -ForegroundColor Green
Write-Host "Verification: gh api repos/$Repo/branches/$Branch/protection" -ForegroundColor Cyan
Write-Host "Reminder: enable 'Allow auto-merge' in the repo Settings (Pull Requests) or 'gh pr merge --auto' will not work." -ForegroundColor Cyan