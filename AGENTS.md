<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

 

## Yaadro Storefront — Project Development Rules

### Project Context
- Project: Yaadro Storefront
- Repository: `Codeteak/yaadro-ecommerce-user-web-frontend`
- Current working branch: `fayad`
- Application: Grocery and supermarket e-commerce storefront
- Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Current stage: Early scaffold; features will be developed incrementally.

Read `PROJECT_CONTEXT.md` before starting a task. Verify the actual repository state rather than assuming this description is still accurate.

### 1. Mandatory Next.js Documentation Check

Follow the Next.js agent rules above.

Before writing or modifying Next.js code:
1. Read the relevant documentation from the installed Next.js package under `node_modules/next/dist/docs/`.
2. Resolve the correct documentation path from the repository location.
3. Follow the installed version's APIs, conventions, and deprecation notices.
4. If the documentation is missing, explain that limitation and identify an appropriate way to verify the API before proceeding.

Do not blindly apply conventions from older Next.js versions.

### 2. Inspect Before Changing Anything

Before implementation:
- Read `PROJECT_CONTEXT.md`, `README.md`, and relevant configuration files.
- Inspect the existing source code related to the task.
- Review the current routes, layouts, components, styles, API integrations, and dependencies.
- Inspect Git status and relevant diffs.
- Identify existing functionality that can be reused.
- Never overwrite or discard another developer's work.

Do not assume that a feature, API, component, or configuration exists without checking.

### 3. Explain and Plan Before Implementation

Before modifying code, explain:
1. What currently exists and how it works.
2. What needs to change and why.
3. Which files will be created, modified, or deleted.
4. The proposed implementation and data flow.
5. Any API, environment, dependency, or business-rule requirements.
6. Potential risks and regression scenarios.
7. The acceptance criteria and testing plan.

Keep explanations clear enough for the project developer to understand and review.

### 4. Ask Questions When Requirements Are Unclear

Never invent important requirements or backend behavior.

Ask for clarification when API contracts, authentication, cart behavior, pricing, stock, delivery eligibility, checkout, payment, or UI requirements are unclear.

If a decision materially affects architecture or correctness, explain the alternatives and wait for clarification.

For low-risk details, use existing conventions and state reasonable assumptions.

### 5. Approval Before Coding

Wait for explicit approval of the proposed plan before implementing changes.

If the user has already explicitly authorized implementation within a clear scope, proceed within that scope without repeatedly asking for approval.

If a new requirement changes the agreed plan, pause, explain the change, and obtain approval before expanding the scope.

### 6. Incremental Implementation

- Build one agreed feature or logical task at a time.
- Keep changes focused and reviewable.
- Reuse sound existing code.
- Avoid unnecessary dependencies and speculative abstractions.
- Use TypeScript appropriately.
- Follow Server Component and Client Component conventions verified against the installed Next.js documentation.
- Handle relevant loading, empty, error, and success states.
- Avoid unrelated refactoring or mass file generation.

### 7. API and Business Logic Safety

Before API integration, verify the endpoint, HTTP method, authentication requirements, request and response formats, error handling, and environment configuration.

Never fabricate endpoints, response fields, credentials, or business rules.

Treat backend-authoritative prices, stock, discounts, and order totals as server-controlled values. Never simulate successful checkout or payment in production flows.

### 8. Testing and Verification

After meaningful changes:
- Run relevant TypeScript, lint, test, and build checks where available.
- Inspect the final Git diff.
- Fix regressions introduced by the change.
- Report pre-existing failures separately.
- State which commands were actually executed and their results.

Never claim that code, a build, an API integration, or a UI flow works unless it has been verified. Clearly identify anything that remains untested.

### 9. Documentation and Developer Transparency

Maintain these documents as appropriate:
- `PROJECT_CONTEXT.md`: stable project rules and architectural principles.
- `README.md`: setup, commands, and environment instructions.
- `docs/PROJECT_STATUS.md`: current architecture, completed features, limitations, and remaining work.
- `docs/IMPLEMENTATION_LOG.md`: chronological implementation and verification records.
- `docs/decisions/`: important architectural decisions when needed.

Do not create duplicate documentation if an equivalent document already exists. Inspect and update existing documentation first.

After each meaningful task, report:
- What was implemented.
- Files changed and the reason for each change.
- How the feature works.
- Verification commands and actual results.
- Known issues and limitations.
- Remaining work and recommended next steps.

Never mark planned or unverified features as complete.

### 10. Initial Task: Repository Discovery

When beginning this project workflow, perform repository discovery first.

Inspect the actual structure, existing routes, dependencies, configurations, PWA setup, environment requirements, API integrations, and implemented functionality.

Produce a baseline report, identify technical risks, and propose a phased development roadmap with a clear first task.

Do not modify application code during initial discovery. Ask essential questions and wait for approval before implementation.

**Core workflow: Inspect → Explain → Plan → Clarify → Obtain approval → Implement → Test → Document → Handover.**