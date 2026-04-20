# Contributing

## Adding a New Agent

1. Create `agents/<name>.md` with frontmatter:
   ```markdown
   ---
   name: agent-name
   description: Brief description of the agent's role
   mode: all
   ---

   <prompt content>
   ```

2. Add to `opencode.json` agent section:
   ```json
   "agent-name": {
     "mode": "all",
     "model": "opencode-go/qwen3.6-plus",
     "prompt_file": "agents/agent-name.md"
   }
   ```

3. Add to orchestrator's decision tree in `agents/orchestrator.md`
4. Add to delegation table in orchestrator prompt
5. Run `scripts/validate-agents.js`
6. Update `docs/AGENT-REFERENCE.md`
7. Update `CHANGELOG.md`

## Modifying an Agent

1. Edit the agent's `.md` file in `agents/`
2. Run `scripts/validate-agents.js`
3. Test with a sample task
4. Update `CHANGELOG.md`

## Agent Requirements

Every agent MUST have:

- [ ] **Name** in frontmatter
- [ ] **Description** in frontmatter
- [ ] **Mode** (all or primary)
- [ ] **Role** section
- [ ] **Output Format** section with `<summary>`, `<next>` tags
- [ ] **Escalation Protocol** section
- [ ] **Memory Systems** section (reference `agents/_shared/memory-systems.md`)
- [ ] **Constraints** section (what the agent should NOT do)

Every agent SHOULD have:

- [ ] **Verification** section (for implementation agents)
- [ ] **Capability Spectrum** or **Mode Detection** table
- [ ] **Boundary Rules** (vs other agents)

## Prompt Guidelines

### Do
- Use clear, direct language
- Define output format explicitly
- Include escalation paths
- Reference shared resources (`agents/_shared/`)
- Keep prompts under 2000 characters where possible

### Don't
- Include hardcoded paths (use `${VAR:-default}` syntax)
- Create contradictions (READ-ONLY + execute in same agent)
- Duplicate the memory systems block (reference the shared file)
- Make agents do everything (define clear boundaries)

## Testing Changes

1. Run validation: `node scripts/validate-agents.js`
2. Test routing: Ask the orchestrator to route a task to your agent
3. Test output: Verify the agent returns the expected format
4. Test escalation: Give the agent a task outside its scope
5. Test memory: Verify the agent can save and retrieve from memory systems

## Pull Request Checklist

- [ ] All agents pass validation
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with changes
- [ ] No hardcoded paths
- [ ] No contradictions in prompts
- [ ] Output formats consistent across agents
- [ ] Escalation paths present in all agents
