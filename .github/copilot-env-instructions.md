
# Copilot Environment Setup Instructions

This project uses a `.env` file to manage environment variables for local development and deployment. Below are the instructions for setting up and using the environment variables with GitHub Copilot:

## 1. Database Configuration

- Ensure PostgreSQL is installed and running.

- The connection string in `.env` is:

  ```env
  DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/cartrita_ai_agents"
  ```

- Create the database `cartrita_ai_agents` if it does not exist:

  ```bash
  createdb -U postgres cartrita_ai_agents
  ```

## 2. API Keys

- The `.env` file contains API keys for OpenAI, Deepgram, HuggingFace, GitHub, Tavily, SerpAPI, and Brave.

- These keys are required for Copilot and related services to function.

- **Do not share your `.env` file or its contents publicly.**

## 3. Server and MCP Configuration

- The app runs in development mode on port 3000 by default.

- MCP server config paths are set in the `.env` file. Ensure referenced files and directories exist.

## 4. Running the Application

- Install dependencies:

  ```bash
  pnpm install
  ```

- Start the application:

  ```bash
  pnpm start
  ```

## 5. Security Notice

- Keep the `.env` file secure and out of version control (add `.env` to `.gitignore`).

- Rotate credentials if you suspect they have been exposed.

## 6. Troubleshooting

- If you encounter issues with missing environment variables, verify the `.env` file is present and correctly formatted.

- For database connection errors, ensure PostgreSQL is running and credentials match those in `.env`.

---

For further assistance, refer to the project README or contact the repository maintainers.
