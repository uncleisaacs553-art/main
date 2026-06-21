// Command Center — demo data.
// Used when the live GitHub feed is unavailable (offline / rate-limited) or when
// the user toggles demo mode, so the dashboard is never blank. Shapes match the
// real GitHub REST responses the rest of the app expects.

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const REPOS = ["orbit-saas", "atlas-site", "relay-agents", "ledger-sync", "beacon-store"];
const LANGS = ["TypeScript", "Python", "JavaScript", "Go", "CSS"];

export function demoData() {
  const repos = REPOS.map((name, i) => ({
    name,
    full_name: "uncleisaacs553-art/" + name,
    html_url: "#",
    description: pick([
      "Real-time analytics dashboard",
      "Immersive marketing site",
      "Autonomous outreach agents",
      "Cross-tool data sync service",
      "Headless commerce storefront",
    ]),
    language: LANGS[i % LANGS.length],
    pushed_at: ago(i * 47 + 3),
    open_issues_count: Math.floor(Math.random() * 6),
    fork: false, private: false, stargazers_count: Math.floor(Math.random() * 40),
  }));

  const workflows = ["CI", "Deploy", "Claude Agent", "Nightly Sync", "Lint & Test"];
  const runs = [];
  let id = 1000;
  for (let i = 0; i < 22; i++) {
    const repo = pick(REPOS);
    const wf = pick(workflows);
    const running = i < 3; // a few live
    const conclusion = running ? null : pick(["success", "success", "success", "failure", "success"]);
    const started = ago(i * 11 + Math.floor(Math.random() * 7));
    runs.push({
      id: id++,
      name: wf,
      display_title: pick(["Update pipeline", "Fix flaky test", "Deploy to prod", "Sync nightly data", "Refactor module"]),
      status: running ? "in_progress" : "completed",
      conclusion,
      html_url: "#",
      run_started_at: started,
      updated_at: started,
      head_branch: pick(["main", "main", "develop", "feat/agents"]),
      event: pick(["push", "schedule", "workflow_dispatch"]),
      actor: { login: wf === "Claude Agent" ? "claude[bot]" : "uncleisaacs553-art" },
      _repo: repo,
    });
  }

  const actors = ["uncleisaacs553-art", "claude[bot]", "relay-agent", "github-actions[bot]"];
  const events = [];
  for (let i = 0; i < 28; i++) {
    const type = pick(["PushEvent", "PushEvent", "PullRequestEvent", "IssuesEvent", "CreateEvent", "WorkflowRunEvent"]);
    const repo = pick(REPOS);
    const created = ago(i * 9 + Math.floor(Math.random() * 5));
    const payload = {};
    if (type === "PushEvent") {
      payload.size = 1 + Math.floor(Math.random() * 4);
      payload.ref = "refs/heads/main";
      payload.commits = [{ message: pick(["Wire up agent loop", "Polish dashboard", "Fix rate-limit backoff", "Add demo data", "Tune motion timings"]) }];
    } else if (type === "PullRequestEvent") {
      payload.action = pick(["opened", "closed", "synchronize"]);
      payload.pull_request = { title: pick(["Live command center", "Network backdrop", "Agent sparklines"]) };
    } else if (type === "IssuesEvent") {
      payload.action = pick(["opened", "closed"]);
      payload.issue = { title: pick(["Backoff when rate-limited", "Empty-state copy", "Mobile layout"]) };
    } else if (type === "CreateEvent") {
      payload.ref_type = pick(["branch", "tag"]);
      payload.ref = pick(["feat/agents", "v0.2.0"]);
    } else if (type === "WorkflowRunEvent") {
      payload.action = "completed";
      payload.workflow_run = { name: pick(workflows), conclusion: pick(["success", "failure"]) };
    }
    events.push({
      id: "demo" + i,
      type,
      actor: { login: pick(actors) },
      repo: { name: "uncleisaacs553-art/" + repo },
      payload,
      created_at: created,
    });
  }
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return { repos, events, runs };
}
