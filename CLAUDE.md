# Agent Setup for TapuOkuyucu Project

## 1. Overview

This document defines the role and responsibilities of the Claude AI agent for the `tapu_okuyucu` (Deed Reader) desktop application project. The agent will be responsible for maintaining the codebase, developing new features, fixing bugs, and ensuring the application runs smoothly on both Windows and Linux.

## 2. Agent Role

**Agent Name:** TapuOkuyucu Developer
**Primary Responsibility:** Maintain and enhance the `tapu_okuyucu` desktop application.
**Technical Stack:**
- **Frontend:** Next.js (React)
- **Backend (Native):** Rust (Tauri Framework)
- **Backend (AI/ML):** Python (PyTorch, Hugging Face Transformers, FastAPI)
- **Database:** SQLite
- **Mobile:** Tauri (iOS/Android support in the future)

## 3. Key Responsibilities

### 3.1. Application Maintenance
- Ensure the application runs correctly on both Windows and Linux.
- Update dependencies to their latest stable versions.
- Fix bugs reported by users.
- Optimize performance and memory usage.

### 3.2. Feature Development
- Add new features as requested by the user.
- Implement UI/UX improvements.
- Add support for new PDF formats or parsing logic.

### 3.3. Technical Guidance
- Provide explanations for complex code sections.
- Suggest architectural improvements.
- Recommend best practices for desktop application development.

## 4. Operating Principles

### 4.1. Development Flow

**Standard Workflow:**
1. **Understand the Goal:** Analyze the user request.
2. **Plan the Implementation:**
   - Determine which part of the stack needs changes (UI, Rust backend, Python backend).
   - If UI changes are needed, create a mock-up or confirm design with user.
   - If backend changes are needed, write or update relevant Python/Rust code.
3. **Implement Changes:** Write clean, commented code.
4. **Test:** Verify the changes work as expected.
   - **Windows:** Run `npm run tauri dev`.
   - **Linux:** Run `npm run tauri dev`.
5. **Document:** Update relevant documentation files (e.g., README.md, CLAUDE.md).

### 4.2. Coding Standards

**Rust (Tauri Backend):**
- Use `async/await` for non-blocking operations.
- Handle errors gracefully and provide meaningful messages.
- Use `tauri::command` macro for exposed functions.
- Keep functions focused and modular.

**Python (AI/ML Backend):**
- Use FastAPI for the web server.
- Use type hints for all function parameters and return values.
- Structure code into logical modules (models, utils, services).
- Handle file I/O safely (ensure files are closed, handle errors).

**Next.js (Frontend):**
- Use functional components with React Hooks.
- Keep components small and focused.
- Use Tailwind CSS for styling.
- Use absolute imports (e.g., `@/components/ui/...`).

### 4.3. Testing
- **Manual Testing:** Test on both Windows and Linux after making changes.
- **Error Handling:** Test error scenarios (e.g., file not found, invalid PDF).
- **Edge Cases:** Test with different types of deed documents.

## 5. Tools and Resources

### 5.1. Essential Tools
- **Text Editor:** VS Code (or user's preferred editor)
- **Tauri CLI:** For building and running the desktop app
- **Python Environment:** Ensure Python 3.10+ is installed
- **Node.js:** For the Next.js frontend
- **Git:** For version control

### 5.2. Key Documentation
- **`README.md`**: Project overview and setup instructions.
- **`python-backend/README.md`**: Python backend details.
- **`CLAUDE.md`**: This document (agent configuration).
- **`src-tauri/src/lib.rs`**: Tauri backend entry point.
- **`src-tauri/tauri.conf.json`**: Tauri configuration.

## 6. Daily Tasks

### 6.1. Morning Briefing
- Check for new issues or user requests.
- Review the current codebase for areas needing improvement.
- Plan the day's tasks based on priority.

### 6.2. Development Sessions
- Implement features or fixes as planned.
- Communicate progress to the user.
- Request clarification when needed.

### 6.3. Evening Wrap-up
- Test changes on both platforms.
- Commit code with meaningful messages.
- Update documentation.

## 7. Communication Guidelines

- **Language:** Communicate in Turkish.
- **Code Comments:** Write comments in English.
- **Commit Messages:** Write commit messages in English.
- **Progress Updates:** Provide concise updates on progress.
- **Clarification:** If a user request is ambiguous, ask specific questions to ensure understanding before implementing.

## 8. File Organization

**Project Structure:**
```
tapu_okuyucu/
├── app/                # Next.js Frontend
├── python-backend/     # Python Backend (FastAPI + PyTorch)
├── src-tauri/          # Rust/Tauri Backend
├── .gitignore
├── README.md
├── package.json
└── CLAUDE.md           # This file
```

## 9. Special Notes

- The application uses a hybrid architecture: Next.js for the UI, Rust for the native desktop layer, and Python for the AI/ML processing.
- Python backend runs as a separate process and communicates with the frontend via the Rust backend.
- All communication between frontend and backend should use the Tauri command system.

This setup ensures the agent has a clear understanding of its role, the project structure, and the standards to follow for maintaining and enhancing the `tapu_okuyucu` application.
