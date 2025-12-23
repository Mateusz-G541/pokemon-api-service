# GitHub Actions Workflows

This directory contains CI/CD workflows for the Pokemon API.

## Workflows

### `performance-tests.yml`
Runs k6 performance tests on every push and pull request.

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**What it does:**
1. Installs dependencies
2. Builds the API
3. Starts the API locally
4. Runs k6 smoke tests against it
5. Uploads results as artifacts
6. Optionally tests production endpoint

**Configuration:**
- Edit `configs/smoke.json` to control test parameters
- Smoke tests run by default (lightweight)
- Individual endpoint tests continue on error

---

### `docker-build.yml`
Builds and pushes Docker image to Docker Hub on every main branch push.

**Triggers:**
- Push to `main` branch (when src/, Dockerfile, or package.json changes)
- Manual trigger via GitHub Actions UI

**Prerequisites:**
Add these secrets to your GitHub repo:
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub token (create at https://hub.docker.com/settings/security)

**What it does:**
1. Builds Docker image
2. Tags with branch name, version, and commit SHA
3. Pushes to Docker Hub
4. Uses GitHub Actions cache for faster builds

---

## Setup for Your Repo

### 1. Add GitHub Secrets

Go to repo Settings → Secrets and Variables → Actions and add:

```
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-token
PRODUCTION_API_URL=https://your-api.com (optional, for production testing)
```

### 2. Update Workflow Variables

Edit `performance-tests.yml` if you want to:
- Change test configuration
- Add more test scripts
- Adjust timeouts
- Add Slack/Discord notifications

### 3. Push to GitHub

```bash
git add .github/
git commit -m "Add CI/CD workflows"
git push
```

---

## Workflow Insights

### Performance Tests Workflow

**Runs in ~5-10 minutes** with:
- Dependency installation
- API build
- API startup & health check
- 4 k6 test suites
- Artifact upload

**Why smoke tests in CI?**
- Fast (seconds, not minutes)
- Catch basic regressions
- Don't consume much GitHub Actions time
- Can run on every PR without delays

**Extending to production:**
- Set `PRODUCTION_API_URL` secret
- Workflow will test live API on main branch pushes
- Great for monitoring deployment health

---

## Tips

1. **Parallel Tests**: Modify `.jobs` to run multiple test suites in parallel
2. **Notifications**: Add Slack/Discord step to notify on failures
3. **Merge Blocking**: Set branch protection rules to require passing tests before merge
4. **Cost**: GitHub Actions free tier includes 2,000 minutes/month - enough for daily testing
5. **Docker Hub**: Free Docker Hub account includes public images; add private images in settings

---

## Example: Slack Notification

Add this step to notify on failures:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Performance tests failed for ${{ github.ref }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Performance Test Failed*\nRepo: ${{ github.repository }}\nBranch: ${{ github.ref }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
