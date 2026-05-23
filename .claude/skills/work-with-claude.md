---
name: plan-mode
description: >
  Structured research -> plan -> implement workflow for Claude Code. Use this skill whenever
  the user wants to build a feature, fix a bug, or refactor code and wants a plan reviewed
  before any implementation. Triggers on: "plan mode", "write a plan", "plan before coding",
  "don't implement yet", "research and plan", or any request to build something non-trivial
  in a codebase. Always use this skill before writing code for tasks that touch more than
  one file or require understanding existing architecture.
---

# Plan Mode

A disciplined research -> plan -> annotate -> implement pipeline.
**Never write code until the user has reviewed and approved a written plan.**

---

## Phase 1 - Research

Ask Claude to deeply read the relevant part of the codebase and write findings to `research.md`.

**Key language to use:**
- "deeply", "in great details", "intricacies" -- signals that surface-level reading is not acceptable
- Always require a written artifact (`research.md`), never just a chat summary

**Example prompts:**

```
Read this folder in depth, understand how it works deeply, what it does and all its
specificities. When done, write a detailed report of your findings in research.md.
```

```
Study the notification system in great detail, understand its intricacies, and write
a detailed research.md with everything there is to know about how it works.
```

```
Go through the task scheduling flow, understand it deeply, and look for potential bugs.
Don't stop until all bugs are found. Write a detailed report in research.md.
```

**Why it matters:** `research.md` is your review surface. Read it and verify Claude actually
understood the system before planning. Wrong research -> wrong plan -> wrong implementation.

---

## Phase 2 - Planning

Once research is validated, ask for a detailed implementation plan in `plan.md`.

**The plan must include:**
- Explanation of the approach
- Code snippets showing actual changes
- File paths that will be modified
- Considerations and trade-offs

**Example prompts:**

```
I want to build <feature>. Write a detailed plan.md outlining how to implement this.
Include code snippets. Read source files before suggesting changes.
```

```
The list endpoint should support cursor-based pagination. Write a detailed plan.md.
Base the plan on the actual codebase -- read source files first.
```

**Tip:** If you have seen a good reference implementation in an open source repo, paste it
alongside the request:

```
This is how project X handles sortable IDs. Write a plan.md explaining how we can
adopt a similar approach in our codebase.
```

Always end the prompt with: **"don't implement yet"**

---

## Phase 3 - Annotation Cycle (repeat 1-6x)

This is where you add the most value. Open `plan.md` in your editor and add inline notes
directly into the document.

**Types of annotations:**
- Domain knowledge Claude doesn't have: "use drizzle:generate for migrations, not raw SQL"
- Correcting wrong assumptions: "no -- this should be a PATCH, not a PUT"
- Rejecting an approach: "remove this section, we don't need caching here"
- Explaining constraints: "the queue consumer already handles retries, remove this retry logic"
- Redirecting a section: "this is wrong -- visibility needs to be on the list, not on items. restructure accordingly"

**To apply your notes:**

```
I added a few notes to the document. Address all notes and update the document
accordingly. Don't implement yet.
```

**Critical:** The "don't implement yet" guard is non-negotiable. Without it, Claude will
start coding the moment it thinks the plan is good enough.

Repeat until the plan perfectly reflects your intent.

---

## Phase 4 - Todo List

Before implementation, request a granular task breakdown appended to `plan.md`:

```
Add a detailed todo list to the plan, with all phases and individual tasks needed
to complete it. Don't implement yet.
```

This becomes a live progress tracker during implementation -- Claude marks items as
completed as it goes.

---

## Phase 5 - Implementation

When the plan is fully approved, issue the implementation command:

```
Implement it all. When done with a task or phase, mark it as completed in the plan
document. Do not stop until all tasks and phases are completed. Do not add unnecessary
comments or jsdocs. Do not use any or unknown types. Continuously run typecheck to make
sure you're not introducing new issues.
```

**What each part does:**
- "implement it all" -- do everything in the plan, don't cherry-pick
- "mark it as completed" -- plan is the source of truth for progress
- "do not stop" -- no mid-flow confirmation pauses
- "continuously run typecheck" -- catch issues early

By this point, every decision has been made. **Implementation should be boring.**

---

## During Implementation - Feedback

Your role shifts to supervisor. Corrections become terse:

- "You didn't implement the `deduplicateByTitle` function."
- "You built this in the main app -- it should be in the admin app, move it."
- "wider" / "still cropped" / "there's a 2px gap"

For visual issues, attach screenshots. For layout/style corrections, point to existing code:

```
This table should look exactly like the users table -- same header, same pagination,
same row density.
```

**When things go wrong:** Don't patch. Revert and re-scope:

```
I reverted everything. Now all I want is to make the list view more minimal -- nothing else.
```

---

## Staying in Control

Even during implementation, you make all judgment calls via `plan.md`:

- Cherry-pick from proposals: "For the first one, use Promise.all. For the third, extract
  to a separate function. Ignore four and five."
- Trim scope: "Remove the download feature from the plan, I don't want it now."
- Protect interfaces: "The signatures of these three functions must not change -- the caller adapts."
- Override technical choices: "Use this library's built-in method instead of a custom one."

---

## Summary

```
Research (research.md) -> Plan (plan.md) -> Annotate -> [repeat] -> Todo list -> Implement
```

One session. One plan document. No code until the plan is right.