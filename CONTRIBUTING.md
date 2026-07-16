# Contributing to YuvaHub

Thank you for your interest in contributing to **YuvaHub**! 🎉

We appreciate every contribution, whether it's fixing bugs, improving documentation, enhancing the UI, or adding new features. Please follow the guidelines below to ensure a smooth contribution process.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Setup](#project-setup)
- [Repository Structure](#repository-structure)
- [Creating a Feature Branch](#creating-a-feature-branch)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Assignment Workflow](#issue-assignment-workflow)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Code of Conduct](#code-of-conduct)

---

# Getting Started

1. Fork this repository.
2. Clone your fork to your local machine.

```bash
git clone https://github.com/<your-username>/YuvaHub.git
cd YuvaHub
```

3. Add the original repository as the upstream remote.

```bash
git remote add upstream https://github.com/uditt490-pixel/YuvaHub.git
```

4. Install project dependencies.

```bash
npm install
```

5. Start the development server.

```bash
npm run dev
```

---

# Project Setup

Before making changes:

- Install all dependencies.
- Ensure the project runs without errors.
- Create a new branch for every feature or bug fix.
- Keep your fork updated with the upstream repository.

Update your fork:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

# Repository Structure

A typical project structure may look like:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   └── App.jsx
├── package.json
├── README.md
└── vite.config.js
```

Please place new files in the appropriate directory to keep the project organized.

---

# Creating a Feature Branch

Always create a separate branch before making changes.

```bash
git checkout -b feature/your-feature-name
```

Examples:

```
feature/navbar-improvement
feature/footer-redesign
fix/login-validation
docs/update-readme
```

---

# Coding Standards

Please follow these best practices:

- Write clean and readable code.
- Use meaningful variable and function names.
- Keep components modular and reusable.
- Avoid unnecessary code duplication.
- Follow existing project formatting and naming conventions.
- Remove unused imports and files.
- Ensure your changes do not break existing functionality.

---

# Commit Message Guidelines

Use descriptive commit messages.

Recommended format:

```
type: short description
```

Examples:

```
feat: add responsive navbar
fix: resolve login validation bug
docs: add contributing guide
style: improve button spacing
refactor: simplify event card component
```

---

# Pull Request Process

Before submitting your Pull Request:

- Ensure your branch is up to date.
- Test your changes locally.
- Resolve merge conflicts.
- Verify that the project builds successfully.

Then:

1. Push your branch.

```bash
git push origin feature/your-feature-name
```

2. Open a Pull Request.

3. Include:

- A clear title.
- A detailed description.
- Screenshots (if UI changes).
- Reference the related issue using:

```
Closes #IssueNumber
```

Example:

```
Closes #67
```

---

# Issue Assignment Workflow

Before working on an issue:

- Check if the issue has already been assigned.
- Comment on the issue expressing your interest.
- Wait for assignment if required by the maintainers.
- Work on only one assigned issue at a time unless instructed otherwise.

---

# Reporting Bugs

When reporting a bug, include:

- Bug description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser/Operating System details

---

# Feature Requests

Feature requests should include:

- Problem statement
- Proposed solution
- Benefits
- Additional context or mockups (optional)

---

# Code of Conduct

Please be respectful and professional.

By participating in this project, you agree to:

- Treat everyone with respect.
- Welcome constructive feedback.
- Maintain a positive and inclusive environment.
- Avoid harassment, discrimination, or abusive behavior.

---

## Thank You ❤️

Every contribution, no matter how small, helps improve **YuvaHub**.

Happy Coding! 🚀