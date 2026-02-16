/**
 * Database seed script — creates admin, users, tags, 50+ blog posts, comments, pages, and settings.
 * Run with: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────
function slug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Data ───────────────────────────────────────────────────────────────

const TAG_DATA = [
  { name: "JavaScript", color: "#f7df1e", description: "The language of the web" },
  { name: "TypeScript", color: "#3178c6", description: "JavaScript with types" },
  { name: "React", color: "#61dafb", description: "A JavaScript library for building user interfaces" },
  { name: "Next.js", color: "#000000", description: "The React framework for production" },
  { name: "Node.js", color: "#339933", description: "JavaScript runtime built on Chrome's V8 engine" },
  { name: "Python", color: "#3776ab", description: "A versatile programming language" },
  { name: "DevOps", color: "#ff6f00", description: "Development and operations practices" },
  { name: "Docker", color: "#2496ed", description: "Containerization platform" },
  { name: "PostgreSQL", color: "#336791", description: "Advanced open-source relational database" },
  { name: "CSS", color: "#1572b6", description: "Styling language for the web" },
  { name: "Tailwind CSS", color: "#06b6d4", description: "Utility-first CSS framework" },
  { name: "GraphQL", color: "#e10098", description: "Query language for APIs" },
  { name: "REST API", color: "#009688", description: "Representational State Transfer" },
  { name: "Machine Learning", color: "#ff6f00", description: "AI and ML concepts" },
  { name: "Security", color: "#d32f2f", description: "Web application security" },
  { name: "Performance", color: "#4caf50", description: "Optimization and speed" },
  { name: "Testing", color: "#9c27b0", description: "Software testing practices" },
  { name: "Git", color: "#f05032", description: "Version control system" },
  { name: "Cloud", color: "#4285f4", description: "Cloud computing services" },
  { name: "Architecture", color: "#795548", description: "Software architecture patterns" },
  { name: "Prisma", color: "#2d3748", description: "Next-generation ORM for Node.js" },
  { name: "Authentication", color: "#ff5722", description: "Identity and access management" },
  { name: "Database", color: "#607d8b", description: "Database design and optimization" },
  { name: "Frontend", color: "#e91e63", description: "Client-side development" },
  { name: "Backend", color: "#3f51b5", description: "Server-side development" },
  { name: "Tutorial", color: "#8bc34a", description: "Step-by-step guides" },
  { name: "Best Practices", color: "#ff9800", description: "Industry standards and conventions" },
  { name: "Open Source", color: "#4caf50", description: "Open-source software and contributions" },
  { name: "Web Development", color: "#2196f3", description: "Modern web development" },
  { name: "Mobile", color: "#00bcd4", description: "Mobile app development" },
];

const USERS_DATA = [
  { username: "admin", email: "admin@myblog.com", password: "Aa1357", firstName: "Admin", lastName: "User", displayName: "Admin", role: "SUPER_ADMIN" as const },
  { username: "sarah_dev", email: "sarah@myblog.com", password: "TestPass123!@", firstName: "Sarah", lastName: "Chen", displayName: "Sarah Chen", role: "EDITOR" as const },
  { username: "mike_writes", email: "mike@myblog.com", password: "TestPass123!@", firstName: "Mike", lastName: "Johnson", displayName: "Mike Johnson", role: "AUTHOR" as const },
  { username: "emma_codes", email: "emma@myblog.com", password: "TestPass123!@", firstName: "Emma", lastName: "Davis", displayName: "Emma Davis", role: "AUTHOR" as const },
  { username: "alex_tech", email: "alex@myblog.com", password: "TestPass123!@", firstName: "Alex", lastName: "Rivera", displayName: "Alex Rivera", role: "CONTRIBUTOR" as const },
  { username: "priya_ml", email: "priya@myblog.com", password: "TestPass123!@", firstName: "Priya", lastName: "Sharma", displayName: "Priya Sharma", role: "AUTHOR" as const },
  { username: "james_sec", email: "james@myblog.com", password: "TestPass123!@", firstName: "James", lastName: "Wilson", displayName: "James Wilson", role: "EDITOR" as const },
  { username: "reader1", email: "reader1@myblog.com", password: "TestPass123!@", firstName: "Tom", lastName: "Brown", displayName: "Tom Brown", role: "SUBSCRIBER" as const },
  { username: "reader2", email: "reader2@myblog.com", password: "TestPass123!@", firstName: "Lisa", lastName: "Garcia", displayName: "Lisa Garcia", role: "SUBSCRIBER" as const },
  { username: "reader3", email: "reader3@myblog.com", password: "TestPass123!@", firstName: "David", lastName: "Kim", displayName: "David Kim", role: "SUBSCRIBER" as const },
];

const BLOG_POSTS: { title: string; excerpt: string; content: string; tags: string[]; status: "PUBLISHED" | "DRAFT" | "ARCHIVED" }[] = [
  {
    title: "Getting Started with Next.js 16: A Complete Guide",
    excerpt: "Learn how to build modern web applications with Next.js 16, including the new App Router and React Server Components.",
    content: `<h2>Introduction</h2><p>Next.js 16 represents a major leap forward in React-based web development. With its improved App Router, enhanced server components, and better performance optimizations, it's never been a better time to start building with Next.js.</p><h2>Setting Up Your Project</h2><p>Getting started is straightforward. Run <code>npx create-next-app@latest</code> and select the options that fit your project. The new project template includes TypeScript, Tailwind CSS, and ESLint by default.</p><h2>App Router</h2><p>The App Router is the recommended way to build new applications. It uses a file-system based router where folders define routes. Each route segment maps to a URL segment.</p><h3>Layouts</h3><p>Layouts let you share UI between route segments. They preserve state, remain interactive, and don't re-render on navigation.</p><h3>Server Components</h3><p>By default, all components in the App Router are React Server Components. This means they render on the server and send minimal JavaScript to the client.</p><h2>Data Fetching</h2><p>Server Components can be async, allowing you to use <code>await</code> directly in your component. This simplifies data fetching significantly compared to <code>getServerSideProps</code>.</p><h2>Conclusion</h2><p>Next.js 16 makes building performant web applications easier than ever. Start experimenting with the App Router and Server Components to see the benefits firsthand.</p>`,
    tags: ["Next.js", "React", "TypeScript", "Web Development", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "TypeScript Best Practices in 2026",
    excerpt: "Comprehensive guide to writing clean, maintainable TypeScript code with modern patterns and conventions.",
    content: `<h2>Why TypeScript?</h2><p>TypeScript has become the de facto standard for large-scale JavaScript applications. Its type system catches errors early, improves IDE support, and makes refactoring safer.</p><h2>Use Strict Mode</h2><p>Always enable <code>strict: true</code> in your tsconfig.json. This enables all strict type-checking options and helps catch more bugs at compile time.</p><h2>Prefer Interfaces Over Types</h2><p>Use interfaces for object shapes that might be extended. Use type aliases for unions, intersections, and computed types.</p><h2>Avoid <code>any</code></h2><p>The <code>any</code> type defeats the purpose of TypeScript. Use <code>unknown</code> when you don't know the type, and narrow it with type guards.</p><h2>Use Generics Wisely</h2><p>Generics make your code reusable without sacrificing type safety. Use them for utility functions, data structures, and API clients.</p><h2>Const Assertions</h2><p>Use <code>as const</code> to create readonly types from literal values. This is especially useful for configuration objects and enum-like constants.</p><h2>Template Literal Types</h2><p>TypeScript 4.1+ supports template literal types, enabling powerful string manipulation at the type level.</p>`,
    tags: ["TypeScript", "JavaScript", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Building a REST API with Node.js and Express",
    excerpt: "Step-by-step tutorial on creating a production-ready REST API with proper error handling, validation, and authentication.",
    content: `<h2>Project Setup</h2><p>We'll build a complete REST API using Node.js, Express, and TypeScript. This API will include CRUD operations, authentication, input validation, and error handling.</p><h2>Installing Dependencies</h2><p>Start by initializing your project and installing the necessary packages: express, cors, helmet, and their TypeScript type definitions.</p><h2>Structuring Your Project</h2><p>A well-organized project structure is crucial for maintainability. We recommend the following: <code>src/routes</code>, <code>src/controllers</code>, <code>src/services</code>, <code>src/middleware</code>, and <code>src/models</code>.</p><h2>Error Handling</h2><p>Implement a global error handler middleware that catches all unhandled errors and returns consistent error responses.</p><h2>Input Validation</h2><p>Use a validation library like Zod to validate request bodies, query parameters, and route parameters. This prevents invalid data from reaching your business logic.</p><h2>Authentication</h2><p>Implement JWT-based authentication with access and refresh tokens. Store refresh tokens securely and implement token rotation.</p>`,
    tags: ["Node.js", "REST API", "Backend", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "Mastering React Hooks: Beyond the Basics",
    excerpt: "Deep dive into advanced React hooks patterns including custom hooks, useReducer, and performance optimization.",
    content: `<h2>The Hook Model</h2><p>React hooks revolutionized how we write components. Understanding the rules of hooks and the component lifecycle is essential for writing bug-free code.</p><h2>useReducer for Complex State</h2><p>When state logic is complex or involves multiple sub-values, <code>useReducer</code> is preferable to <code>useState</code>. It also helps when the next state depends on the previous one.</p><h2>Custom Hooks</h2><p>Extract reusable logic into custom hooks. Follow the convention of prefixing with "use" and ensure your hooks are composable.</p><h2>useCallback and useMemo</h2><p>These hooks are for performance optimization. Use <code>useCallback</code> to memoize functions and <code>useMemo</code> to memoize expensive computations.</p><h2>Common Pitfalls</h2><p>Avoid storing derived state, respect the dependency array rules, and don't put hooks inside conditions or loops.</p>`,
    tags: ["React", "JavaScript", "Frontend", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Docker for Developers: From Zero to Production",
    excerpt: "Learn Docker from scratch, including containers, images, Docker Compose, and production deployment strategies.",
    content: `<h2>What is Docker?</h2><p>Docker is a platform that enables you to package applications into containers — standardized executable components combining application source code with the OS libraries needed to run that code.</p><h2>Your First Container</h2><p>Create a <code>Dockerfile</code> in your project root. Start with a base image, copy your source code, install dependencies, and define the start command.</p><h2>Docker Compose</h2><p>Docker Compose lets you define multi-container applications. Define your app, database, cache, and other services in a single <code>docker-compose.yml</code> file.</p><h2>Multi-Stage Builds</h2><p>Use multi-stage builds to create smaller production images. Build your application in one stage and copy only the necessary artifacts to the final stage.</p><h2>Production Tips</h2><p>Use non-root users, implement health checks, manage secrets properly, and set up logging and monitoring.</p>`,
    tags: ["Docker", "DevOps", "Cloud", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "PostgreSQL Performance Tuning: The Complete Guide",
    excerpt: "Optimize your PostgreSQL database with indexing strategies, query optimization, and configuration tuning.",
    content: `<h2>Understanding the Query Planner</h2><p>PostgreSQL's query planner is sophisticated but not omniscient. Use <code>EXPLAIN ANALYZE</code> to understand how your queries are executed and identify bottlenecks.</p><h2>Indexing Strategies</h2><p>B-tree indexes are the default and most common. Consider GIN indexes for full-text search, GiST for geometric data, and partial indexes for filtered queries.</p><h2>Connection Pooling</h2><p>Use PgBouncer or built-in connection pooling to manage database connections efficiently, especially in high-concurrency applications.</p><h2>Configuration Tuning</h2><p>Key parameters to tune: <code>shared_buffers</code>, <code>work_mem</code>, <code>maintenance_work_mem</code>, and <code>effective_cache_size</code>. Base these on your available RAM and workload.</p><h2>Vacuum and Autovacuum</h2><p>PostgreSQL uses MVCC, which means dead tuples accumulate. Ensure autovacuum is properly configured to prevent table bloat.</p>`,
    tags: ["PostgreSQL", "Database", "Performance", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "Tailwind CSS Tips and Tricks for 2026",
    excerpt: "Unlock the full potential of Tailwind CSS with these advanced tips, custom plugins, and design patterns.",
    content: `<h2>Custom Design Tokens</h2><p>Extend the default Tailwind theme with your brand colors, fonts, and spacing values. Use CSS custom properties for runtime theming.</p><h2>Component Patterns</h2><p>Create consistent UI patterns using Tailwind. Cards, buttons, forms, and navigation components can all be built with utility classes.</p><h2>Dark Mode</h2><p>Tailwind's dark mode support is excellent. Use the <code>dark:</code> variant prefix to style your components for dark mode.</p><h2>Responsive Design</h2><p>Mobile-first responsive design is built into Tailwind. Use breakpoint prefixes like <code>sm:</code>, <code>md:</code>, <code>lg:</code> to adapt your layout.</p><h2>Performance</h2><p>Tailwind's JIT compiler generates only the CSS you use. Combined with tree-shaking, your production CSS bundle will be minimal.</p>`,
    tags: ["Tailwind CSS", "CSS", "Frontend", "Web Development"],
    status: "PUBLISHED",
  },
  {
    title: "Authentication Patterns for Modern Web Apps",
    excerpt: "Compare JWT, sessions, OAuth, and passwordless authentication patterns for web applications.",
    content: `<h2>JWT Authentication</h2><p>JSON Web Tokens are stateless and self-contained. They work well for APIs and microservices but require careful implementation to be secure.</p><h2>Session-Based Auth</h2><p>Traditional session-based authentication stores session data on the server. It's simpler to implement and easier to revoke access.</p><h2>OAuth 2.0</h2><p>OAuth enables third-party authentication (Google, GitHub, etc.). It's complex but widely adopted and well-understood.</p><h2>Passwordless</h2><p>Magic links and passkeys are gaining popularity. They eliminate password-related security issues entirely.</p><h2>Best Practices</h2><p>Always hash passwords with bcrypt, use HTTPS, implement rate limiting, and consider multi-factor authentication for sensitive applications.</p>`,
    tags: ["Authentication", "Security", "Backend", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Introduction to Prisma ORM",
    excerpt: "Learn how Prisma simplifies database access in Node.js applications with type-safe queries and auto-generated types.",
    content: `<h2>What is Prisma?</h2><p>Prisma is a next-generation ORM that makes database access easy with an auto-generated, type-safe query builder. It supports PostgreSQL, MySQL, SQLite, and more.</p><h2>Schema Definition</h2><p>Define your data model in the Prisma schema file. Prisma generates TypeScript types automatically, ensuring your queries are always type-safe.</p><h2>Migrations</h2><p>Prisma Migrate generates SQL migrations from your schema changes. It tracks migration history and supports both development and production workflows.</p><h2>Client API</h2><p>The Prisma Client provides an intuitive API for CRUD operations, filtering, sorting, pagination, and complex queries including relations and transactions.</p>`,
    tags: ["Prisma", "Database", "Node.js", "TypeScript"],
    status: "PUBLISHED",
  },
  {
    title: "Git Workflow Strategies for Teams",
    excerpt: "Compare Git branching strategies including Git Flow, GitHub Flow, and trunk-based development.",
    content: `<h2>Git Flow</h2><p>Git Flow uses feature branches, release branches, and hotfix branches. It works well for projects with scheduled releases.</p><h2>GitHub Flow</h2><p>A simpler alternative: create feature branches, open pull requests, and merge to main. Deploy from main after each merge.</p><h2>Trunk-Based Development</h2><p>All developers work on the main branch with short-lived feature flags. This enables continuous integration and rapid deployment.</p><h2>Commit Messages</h2><p>Use conventional commits for clear, parseable commit messages. This enables automatic changelog generation and semantic versioning.</p>`,
    tags: ["Git", "DevOps", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "GraphQL vs REST: When to Use Which",
    excerpt: "An objective comparison of GraphQL and REST APIs with real-world use cases for each approach.",
    content: `<h2>REST API Strengths</h2><p>REST is simple, cacheable, and well-understood. It works great when your resources map cleanly to CRUD operations and you have well-defined data needs.</p><h2>GraphQL Strengths</h2><p>GraphQL shines when clients need flexible data fetching, when you have multiple consumers with different data needs, or when over-fetching is a concern.</p><h2>Performance Considerations</h2><p>REST can be faster for simple requests due to HTTP caching. GraphQL reduces round trips but may be slower for complex queries without proper optimization.</p><h2>When to Choose REST</h2><p>Choose REST for file uploads, simple CRUD apps, and when HTTP caching is important.</p><h2>When to Choose GraphQL</h2><p>Choose GraphQL for complex data relationships, mobile apps needing bandwidth optimization, and rapid iteration on frontend data needs.</p>`,
    tags: ["GraphQL", "REST API", "Architecture", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "Web Application Security Checklist",
    excerpt: "Essential security measures every web developer should implement, from XSS prevention to CSRF protection.",
    content: `<h2>Input Validation</h2><p>Never trust user input. Validate and sanitize all inputs on the server side, even if you already do it on the client.</p><h2>XSS Prevention</h2><p>Use Content Security Policy headers, escape output in templates, and avoid <code>dangerouslySetInnerHTML</code> in React.</p><h2>CSRF Protection</h2><p>Use anti-CSRF tokens for state-changing operations. SameSite cookies provide additional protection.</p><h2>SQL Injection</h2><p>Use parameterized queries or an ORM. Never concatenate user input into SQL strings.</p><h2>Headers</h2><p>Set security headers: Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.</p>`,
    tags: ["Security", "Web Development", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Machine Learning for JavaScript Developers",
    excerpt: "Get started with machine learning using TensorFlow.js and practical examples you can run in the browser.",
    content: `<h2>TensorFlow.js</h2><p>TensorFlow.js brings ML to the browser and Node.js. You can train models, run pre-trained models, and even convert Python models for JavaScript.</p><h2>Image Classification</h2><p>Use a pre-trained MobileNet model to classify images in real-time. Load the model, preprocess the image, and get predictions in just a few lines of code.</p><h2>Natural Language Processing</h2><p>Implement sentiment analysis, text classification, and language detection using Universal Sentence Encoder.</p><h2>Training Custom Models</h2><p>Define your model architecture with layers, compile with an optimizer and loss function, then train with your data.</p>`,
    tags: ["Machine Learning", "JavaScript", "Python"],
    status: "PUBLISHED",
  },
  {
    title: "Microservices Architecture: Lessons Learned",
    excerpt: "Real-world insights on when to use microservices, common pitfalls, and strategies for successful implementation.",
    content: `<h2>When Microservices Make Sense</h2><p>Microservices are appropriate when you need independent deployment, different technology stacks per service, or team autonomy. They're overkill for small applications.</p><h2>Service Communication</h2><p>Choose between synchronous (REST/gRPC) and asynchronous (message queues) communication based on your requirements.</p><h2>Data Management</h2><p>Each service should own its data. Avoid shared databases. Use event-driven architecture for cross-service data consistency.</p><h2>Observability</h2><p>Implement distributed tracing, centralized logging, and metrics collection. Without these, debugging distributed systems is nearly impossible.</p>`,
    tags: ["Architecture", "Backend", "DevOps"],
    status: "PUBLISHED",
  },
  {
    title: "React Server Components Explained",
    excerpt: "Understanding React Server Components: how they work, when to use them, and migration strategies.",
    content: `<h2>What Are Server Components?</h2><p>React Server Components render on the server and send the rendered output to the client. They can access server-side resources directly and never send their JavaScript to the browser.</p><h2>Client vs Server</h2><p>Use Server Components for data fetching, accessing backend resources, and static content. Use Client Components for interactivity, browser APIs, and state management.</p><h2>The 'use client' Directive</h2><p>Mark a component with 'use client' at the top of the file to make it a Client Component. All components imported by a Client Component are also client components.</p><h2>Performance Benefits</h2><p>Server Components reduce bundle size, enable streaming, and can leverage server-side caching for better performance.</p>`,
    tags: ["React", "Next.js", "Frontend", "Performance"],
    status: "PUBLISHED",
  },
  {
    title: "CSS Grid vs Flexbox: The Ultimate Guide",
    excerpt: "When to use CSS Grid and when to use Flexbox, with practical examples for common layout patterns.",
    content: `<h2>Flexbox: One-Dimensional Layout</h2><p>Flexbox excels at distributing space along a single axis. Use it for navigation bars, card rows, form controls, and centering content.</p><h2>Grid: Two-Dimensional Layout</h2><p>CSS Grid handles both rows and columns simultaneously. Use it for page layouts, image galleries, and complex card layouts.</p><h2>Using Both Together</h2><p>The best layouts often combine Grid for the overall page structure and Flexbox for component-level alignment. They're complementary, not competing.</p><h2>Common Patterns</h2><p>Holy Grail layout with Grid, responsive card grids, sidebar layouts, and masonry-style designs are all achievable with modern CSS.</p>`,
    tags: ["CSS", "Frontend", "Web Development", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "Testing React Applications with Vitest",
    excerpt: "Set up a modern testing workflow with Vitest, Testing Library, and Mock Service Worker for React apps.",
    content: `<h2>Why Vitest?</h2><p>Vitest is a Vite-native test framework that's blazing fast. It supports TypeScript out of the box, provides great DX, and is compatible with the Jest API.</p><h2>Testing Library</h2><p>Use React Testing Library to test components from the user's perspective. Query by role, text, and accessibility attributes instead of implementation details.</p><h2>Mocking API Calls</h2><p>Mock Service Worker (MSW) intercepts network requests at the service worker level, providing realistic API mocking that works in both tests and development.</p><h2>Integration Tests</h2><p>Write integration tests that render full page components and test user flows. These catch more bugs than unit tests alone.</p>`,
    tags: ["Testing", "React", "JavaScript", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "Building Accessible Web Applications",
    excerpt: "Practical guide to web accessibility, from semantic HTML to ARIA patterns and keyboard navigation.",
    content: `<h2>Semantic HTML</h2><p>Start with semantic HTML elements: <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;section&gt;</code>. These provide meaning to assistive technologies.</p><h2>Keyboard Navigation</h2><p>Ensure all interactive elements are keyboard accessible. Implement proper focus management with visible focus indicators.</p><h2>ARIA Attributes</h2><p>Use ARIA when HTML semantics aren't sufficient. Add <code>aria-label</code>, <code>aria-describedby</code>, and live regions for dynamic content.</p><h2>Color and Contrast</h2><p>Maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text. Don't rely on color alone to convey information.</p>`,
    tags: ["Web Development", "Frontend", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Kubernetes for Beginners",
    excerpt: "Introduction to Kubernetes concepts: pods, services, deployments, and how to get started with local development.",
    content: `<h2>What is Kubernetes?</h2><p>Kubernetes (K8s) is an open-source container orchestration platform. It automates deployment, scaling, and management of containerized applications.</p><h2>Core Concepts</h2><p>Pods are the smallest deployable units. Services provide networking. Deployments manage pod replicas. ConfigMaps and Secrets handle configuration.</p><h2>Local Development</h2><p>Use Minikube or k3s for local Kubernetes clusters. Tools like Skaffold and Tilt streamline the development workflow.</p><h2>YAML Manifests</h2><p>Define your infrastructure as code with YAML manifests. Use Helm charts for templating and managing complex deployments.</p>`,
    tags: ["DevOps", "Docker", "Cloud"],
    status: "PUBLISHED",
  },
  {
    title: "State Management in React: 2026 Edition",
    excerpt: "Compare Zustand, Jotai, Redux Toolkit, and React Context for state management in modern React applications.",
    content: `<h2>React Context</h2><p>Built-in and simple. Best for static or slowly-changing values like themes and user preferences. Avoid for frequently-changing state.</p><h2>Zustand</h2><p>Lightweight and unopinionated. Great for global state without the boilerplate of Redux. Supports middleware and devtools.</p><h2>Jotai</h2><p>Atomic state management inspired by Recoil. Each piece of state is an atom. Excellent for derived state and bottom-up composition.</p><h2>Redux Toolkit</h2><p>Still the best choice for complex applications with lots of business logic. RTK Query handles data fetching elegantly.</p><h2>Server State</h2><p>For server-side data, prefer TanStack Query (React Query) over traditional state management. It handles caching, deduplication, and revalidation automatically.</p>`,
    tags: ["React", "JavaScript", "Frontend", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "Python Web Scraping with Beautiful Soup",
    excerpt: "Learn web scraping techniques with Python, Beautiful Soup, and requests, including handling dynamic content.",
    content: `<h2>Getting Started</h2><p>Install Beautiful Soup and requests with pip. These two libraries handle most web scraping needs elegantly.</p><h2>Parsing HTML</h2><p>Beautiful Soup creates a parse tree from HTML documents. Navigate and search the tree using CSS selectors or the find/find_all methods.</p><h2>Handling Forms</h2><p>Submit form data with the requests library's POST method. Handle cookies and sessions for authenticated scraping.</p><h2>Ethical Scraping</h2><p>Respect robots.txt, implement rate limiting, and identify yourself with a user-agent string. Never overwhelm a server with requests.</p>`,
    tags: ["Python", "Web Development", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "CI/CD Pipeline Best Practices",
    excerpt: "Design and implement effective CI/CD pipelines with GitHub Actions, automated testing, and deployment strategies.",
    content: `<h2>Continuous Integration</h2><p>Run linting, type checking, and tests on every push. Use parallel jobs to speed up the pipeline. Cache dependencies to avoid redundant installs.</p><h2>Continuous Deployment</h2><p>Automate deployments to staging on merge to main. Use manual approval gates for production deployments.</p><h2>GitHub Actions</h2><p>Define workflows in YAML files. Use official actions for common tasks and create reusable workflows for shared logic.</p><h2>Deployment Strategies</h2><p>Blue-green deployments minimize downtime. Canary releases reduce risk by gradually rolling out changes. Feature flags enable trunk-based deployment.</p>`,
    tags: ["DevOps", "Git", "Cloud", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Understanding Web Performance Metrics",
    excerpt: "Master Core Web Vitals, Lighthouse scores, and performance optimization techniques for modern web apps.",
    content: `<h2>Core Web Vitals</h2><p>LCP (Largest Contentful Paint), FID (First Input Delay), and CLS (Cumulative Layout Shift) are the key metrics Google uses for ranking.</p><h2>Measuring Performance</h2><p>Use Lighthouse, WebPageTest, and Chrome DevTools Performance panel for lab testing. Use Real User Monitoring (RUM) for field data.</p><h2>Optimization Techniques</h2><p>Optimize images with next/image, use code splitting, implement lazy loading, and minimize third-party scripts.</p><h2>Font Optimization</h2><p>Use next/font for zero-layout-shift font loading. Prefer variable fonts and subset only the characters you need.</p>`,
    tags: ["Performance", "Web Development", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "Building CLI Tools with Node.js",
    excerpt: "Create professional command-line tools with Node.js, including argument parsing, user prompts, and beautiful output.",
    content: `<h2>Project Setup</h2><p>Set up a TypeScript CLI project with the bin field in package.json. Use the shebang line to make your script executable.</p><h2>Argument Parsing</h2><p>Use Commander.js or yargs for parsing command-line arguments. Define commands, options, and help text declaratively.</p><h2>Interactive Prompts</h2><p>Inquirer.js or prompts enable interactive CLI experiences. Support for input, selection, confirmation, and multi-select prompts.</p><h2>Output Formatting</h2><p>Use chalk for colored output, ora for spinners, and cli-table for tabular data. Make your CLI engaging and informative.</p>`,
    tags: ["Node.js", "JavaScript", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "Database Design Principles",
    excerpt: "Essential database design principles including normalization, denormalization, and schema evolution strategies.",
    content: `<h2>Normalization</h2><p>Normalize your data to at least 3NF to eliminate redundancy. Each table should represent a single entity with clearly defined relationships.</p><h2>When to Denormalize</h2><p>Denormalize for read-heavy workloads where joins are expensive. Use materialized views as a middle ground.</p><h2>Naming Conventions</h2><p>Use snake_case for table and column names. Be consistent with singular vs plural table names. Use descriptive names.</p><h2>Schema Evolution</h2><p>Plan for schema changes from the start. Use migrations, avoid breaking changes, and implement backward-compatible alterations.</p>`,
    tags: ["Database", "PostgreSQL", "Architecture", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "Advanced CSS Animations and Transitions",
    excerpt: "Create stunning UI animations using CSS transitions, keyframes, and the new View Transitions API.",
    content: `<h2>CSS Transitions</h2><p>Transitions animate property changes smoothly. Use <code>transition</code> for hover effects, state changes, and toggle animations.</p><h2>Keyframe Animations</h2><p>Use <code>@keyframes</code> for complex, multi-step animations. Control timing, direction, iteration, and fill mode.</p><h2>View Transitions API</h2><p>The View Transitions API creates smooth page transitions without JavaScript animation libraries. It works by capturing snapshots of the old and new states.</p><h2>Performance Tips</h2><p>Animate only <code>transform</code> and <code>opacity</code> for 60fps animations. Use <code>will-change</code> sparingly and prefer CSS animations over JavaScript.</p>`,
    tags: ["CSS", "Frontend", "Web Development", "Performance"],
    status: "PUBLISHED",
  },
  {
    title: "Error Handling Patterns in TypeScript",
    excerpt: "Explore robust error handling strategies including Result types, custom error classes, and error boundaries.",
    content: `<h2>The Problem with Try-Catch</h2><p>Traditional try-catch doesn't encode error types in the function signature. TypeScript can't help you handle errors you don't know exist.</p><h2>Result Type Pattern</h2><p>Inspired by Rust, the Result type makes errors part of the return type. Functions return either a success value or an error, and TypeScript ensures you handle both.</p><h2>Custom Error Classes</h2><p>Create a hierarchy of error classes for different error types: ValidationError, NotFoundError, AuthenticationError, etc.</p><h2>Error Boundaries in React</h2><p>Use React Error Boundaries to catch rendering errors. Display fallback UI and log errors to your monitoring service.</p>`,
    tags: ["TypeScript", "JavaScript", "Best Practices", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "Introduction to WebAssembly",
    excerpt: "What is WebAssembly, why it matters, and how to use it alongside JavaScript for performance-critical code.",
    content: `<h2>What is WebAssembly?</h2><p>WebAssembly (Wasm) is a binary instruction format that runs alongside JavaScript in web browsers. It enables near-native performance for computationally intensive tasks.</p><h2>Use Cases</h2><p>Image/video processing, gaming engines, CAD applications, and scientific computing are ideal WebAssembly use cases.</p><h2>Languages</h2><p>Compile Rust, C, C++, Go, and other languages to WebAssembly. Rust has the best Wasm toolchain with wasm-pack and wasm-bindgen.</p><h2>Integration with JavaScript</h2><p>WebAssembly modules are loaded and instantiated via JavaScript. They can share memory and call functions in either direction.</p>`,
    tags: ["Web Development", "Performance", "JavaScript"],
    status: "PUBLISHED",
  },
  {
    title: "Monitoring and Observability for Web Apps",
    excerpt: "Set up monitoring, logging, and alerting for production web applications using modern observability tools.",
    content: `<h2>The Three Pillars</h2><p>Observability consists of metrics, logs, and traces. Together, they provide complete visibility into your application's behavior.</p><h2>Metrics</h2><p>Track request rate, error rate, latency (RED metrics), and resource utilization (USE metrics). Use Prometheus and Grafana for visualization.</p><h2>Structured Logging</h2><p>Log in JSON format with consistent fields: timestamp, level, message, request ID, and user ID. Use Pino for fast, structured logging in Node.js.</p><h2>Distributed Tracing</h2><p>Use OpenTelemetry to trace requests across services. Identify bottlenecks and understand the full request lifecycle.</p>`,
    tags: ["DevOps", "Backend", "Cloud", "Performance"],
    status: "PUBLISHED",
  },
  {
    title: "React Native vs Flutter in 2026",
    excerpt: "An honest comparison of React Native and Flutter for cross-platform mobile development.",
    content: `<h2>React Native</h2><p>React Native uses JavaScript/TypeScript and React concepts. If you know React, you can build mobile apps quickly. The New Architecture with Fabric and TurboModules has significantly improved performance.</p><h2>Flutter</h2><p>Flutter uses Dart and provides its own rendering engine. It offers pixel-perfect cross-platform UI and excellent developer tooling.</p><h2>Performance</h2><p>Flutter generally has better out-of-the-box animation performance. React Native's New Architecture has closed the gap significantly.</p><h2>Ecosystem</h2><p>React Native benefits from the JavaScript/npm ecosystem. Flutter has a growing package ecosystem and strong Google backing.</p>`,
    tags: ["Mobile", "React", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "API Rate Limiting Strategies",
    excerpt: "Implement effective rate limiting to protect your API from abuse while maintaining good user experience.",
    content: `<h2>Why Rate Limiting?</h2><p>Rate limiting protects your API from abuse, ensures fair usage, and prevents server overload during traffic spikes.</p><h2>Token Bucket Algorithm</h2><p>Tokens are added at a fixed rate. Each request consumes a token. When tokens are exhausted, requests are rejected or queued.</p><h2>Sliding Window</h2><p>Track requests in a sliding time window for more precise rate limiting. Avoid the boundary issue of fixed window counters.</p><h2>Implementation with Redis</h2><p>Use Redis for distributed rate limiting across multiple server instances. Atomic operations ensure accuracy under concurrency.</p>`,
    tags: ["Security", "Backend", "REST API", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "Understanding Async JavaScript",
    excerpt: "Deep dive into promises, async/await, event loop, and common concurrency patterns in JavaScript.",
    content: `<h2>The Event Loop</h2><p>JavaScript is single-threaded but non-blocking. The event loop processes the call stack, microtask queue, and macrotask queue in a specific order.</p><h2>Promises</h2><p>Promises represent the eventual completion of an asynchronous operation. They can be chained, combined with Promise.all, and raced with Promise.race.</p><h2>Async/Await</h2><p>Async/await is syntactic sugar over promises. It makes asynchronous code read like synchronous code while maintaining the non-blocking nature.</p><h2>Common Patterns</h2><p>Sequential vs parallel execution, error handling with try-catch, promise pools for limited concurrency, and abort controllers for cancellation.</p>`,
    tags: ["JavaScript", "Node.js", "Frontend", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "Serverless Architecture with AWS Lambda",
    excerpt: "Build scalable applications with AWS Lambda, API Gateway, and DynamoDB without managing servers.",
    content: `<h2>What is Serverless?</h2><p>Serverless doesn't mean no servers — it means you don't manage them. AWS handles provisioning, scaling, and maintenance.</p><h2>AWS Lambda</h2><p>Lambda runs your code in response to events. Pay only for compute time consumed. Supports Node.js, Python, Go, and more.</p><h2>API Gateway</h2><p>API Gateway creates REST and WebSocket APIs that trigger Lambda functions. It handles authentication, throttling, and CORS.</p><h2>Cold Starts</h2><p>Cold starts occur when a new Lambda instance is created. Minimize them with Provisioned Concurrency or by keeping functions warm.</p>`,
    tags: ["Cloud", "Backend", "Architecture", "Node.js"],
    status: "PUBLISHED",
  },
  {
    title: "Clean Code Principles for JavaScript",
    excerpt: "Write readable, maintainable JavaScript code by applying clean code principles and SOLID guidelines.",
    content: `<h2>Meaningful Names</h2><p>Use descriptive variable and function names. Avoid abbreviations, single-letter names (except loops), and Hungarian notation.</p><h2>Small Functions</h2><p>Functions should do one thing and do it well. If a function needs a comment to explain what it does, it should be broken into smaller functions.</p><h2>DRY Principle</h2><p>Don't Repeat Yourself. Extract common logic into utility functions, hooks, or services. But don't over-abstract — duplication is better than wrong abstraction.</p><h2>SOLID Principles</h2><p>Apply SOLID principles even in JavaScript: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.</p>`,
    tags: ["JavaScript", "TypeScript", "Best Practices", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "WebSocket Real-Time Communication",
    excerpt: "Implement real-time features with WebSocket, Socket.IO, and Server-Sent Events in Node.js applications.",
    content: `<h2>WebSocket Protocol</h2><p>WebSocket provides full-duplex communication over a single TCP connection. Unlike HTTP, both client and server can send messages at any time.</p><h2>Socket.IO</h2><p>Socket.IO adds reliability features on top of WebSocket: automatic reconnection, fallback to HTTP long-polling, and room-based broadcasting.</p><h2>Server-Sent Events</h2><p>SSE is a simpler alternative for server-to-client streaming. It's built on HTTP, supports auto-reconnection, and works through proxies.</p><h2>When to Use What</h2><p>Use WebSocket for chat, gaming, and collaborative editing. Use SSE for notifications, live feeds, and dashboards.</p>`,
    tags: ["Node.js", "JavaScript", "Backend", "Web Development"],
    status: "PUBLISHED",
  },
  {
    title: "Responsive Images: The Complete Strategy",
    excerpt: "Optimize images for performance and visual quality with srcset, picture element, and modern image formats.",
    content: `<h2>The Problem</h2><p>Serving the same image to all devices wastes bandwidth on mobile and looks blurry on high-DPI screens.</p><h2>srcset and sizes</h2><p>Use srcset to provide multiple image sizes. The browser picks the best one based on viewport width and device pixel ratio.</p><h2>Picture Element</h2><p>The picture element enables art direction — serving different images based on viewport size or orientation.</p><h2>Modern Formats</h2><p>Use WebP and AVIF for smaller file sizes. Provide fallbacks for older browsers with the picture element's source list.</p>`,
    tags: ["Frontend", "Performance", "CSS", "Web Development"],
    status: "PUBLISHED",
  },
  {
    title: "Data Validation with Zod",
    excerpt: "Type-safe schema validation in TypeScript using Zod, from basic schemas to complex validation patterns.",
    content: `<h2>Why Zod?</h2><p>Zod provides run-time validation with automatic TypeScript type inference. Define a schema once and get both validation and types.</p><h2>Basic Schemas</h2><p>Define schemas for strings, numbers, objects, arrays, and enums. Compose them to build complex validation logic.</p><h2>Transforms and Refinements</h2><p>Use <code>.transform()</code> to modify data after validation and <code>.refine()</code> for custom validation rules.</p><h2>Integration</h2><p>Zod works great with React Hook Form, tRPC, and API routes. Share schemas between frontend and backend for end-to-end type safety.</p>`,
    tags: ["TypeScript", "JavaScript", "Backend", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "Environment Variables and Configuration Management",
    excerpt: "Best practices for managing environment variables, secrets, and configuration across development and production.",
    content: `<h2>The Problem</h2><p>Hardcoded configuration values make deployment painful and expose secrets. Environment variables provide a solution.</p><h2>.env Files</h2><p>Use .env files for local development. Never commit them to version control. Provide a .env.example with dummy values.</p><h2>Validation</h2><p>Validate environment variables at startup. Fail fast if required variables are missing or invalid. Use Zod or a similar library.</p><h2>Secret Management</h2><p>Use AWS Secrets Manager, Vault, or Doppler for production secrets. Rotate secrets regularly and audit access.</p>`,
    tags: ["DevOps", "Security", "Best Practices", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "Modern JavaScript Features You Should Use",
    excerpt: "ES2023+ features that make JavaScript code cleaner: structuredClone, Array.at(), Object.groupBy(), and more.",
    content: `<h2>structuredClone</h2><p>Deep clone objects without JSON.parse/stringify. Handles dates, maps, sets, and typed arrays correctly.</p><h2>Array.at()</h2><p>Access array elements with negative indices. <code>arr.at(-1)</code> returns the last element — no more <code>arr[arr.length - 1]</code>.</p><h2>Object.groupBy()</h2><p>Group array elements by a key. Returns a null-prototype object with arrays for each group. Replaces lodash's groupBy.</p><h2>Optional Chaining and Nullish Coalescing</h2><p>Use <code>?.</code> and <code>??</code> for safe property access and default values. They're particularly useful when working with API responses.</p>`,
    tags: ["JavaScript", "Frontend", "Tutorial"],
    status: "PUBLISHED",
  },
  {
    title: "Caching Strategies for Web Applications",
    excerpt: "Implement effective caching with Redis, CDN, browser cache, and service workers for optimal performance.",
    content: `<h2>Cache Layers</h2><p>Modern web apps use multiple cache layers: browser cache, CDN, reverse proxy, application cache, and database cache.</p><h2>Redis Caching</h2><p>Use Redis for application-level caching. Cache database queries, API responses, and computed results with appropriate TTLs.</p><h2>HTTP Caching</h2><p>Set Cache-Control headers correctly. Use ETag and Last-Modified for conditional requests. Understand stale-while-revalidate.</p><h2>Service Workers</h2><p>Implement offline-first caching strategies with service workers. Cache-first for static assets, network-first for API data.</p>`,
    tags: ["Performance", "Backend", "Web Development", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "Infrastructure as Code with Terraform",
    excerpt: "Manage cloud infrastructure declaratively with Terraform, including modules, state management, and best practices.",
    content: `<h2>What is Terraform?</h2><p>Terraform lets you define infrastructure in HCL (HashiCorp Configuration Language). It supports AWS, GCP, Azure, and many other providers.</p><h2>Resources and Providers</h2><p>Define resources that map to cloud infrastructure. Terraform handles creation, updating, and deletion based on your configuration.</p><h2>Modules</h2><p>Create reusable infrastructure modules for common patterns like VPCs, Kubernetes clusters, and databases.</p><h2>State Management</h2><p>Store Terraform state remotely (S3, Terraform Cloud) for team collaboration. Use state locking to prevent concurrent modifications.</p>`,
    tags: ["DevOps", "Cloud", "Architecture"],
    status: "PUBLISHED",
  },
  {
    title: "Full-Stack Type Safety with tRPC",
    excerpt: "Build end-to-end type-safe APIs with tRPC, sharing types between your Next.js frontend and backend.",
    content: `<h2>What is tRPC?</h2><p>tRPC enables you to call backend functions from the frontend with full type safety. No API layer, no code generation, just TypeScript.</p><h2>Router Definition</h2><p>Define procedures (queries and mutations) in your tRPC router. Use Zod for input validation and get automatic output types.</p><h2>Client Integration</h2><p>Use the tRPC React Query integration for data fetching. You get autocomplete, type checking, and all React Query benefits.</p><h2>When to Use tRPC</h2><p>tRPC is excellent for full-stack TypeScript apps. If your frontend and backend share a monorepo and TypeScript, tRPC eliminates entire categories of bugs.</p>`,
    tags: ["TypeScript", "Next.js", "React", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "OAuth 2.0 and OpenID Connect Explained",
    excerpt: "Understand OAuth 2.0 flows, OpenID Connect, and how to implement social login in your applications.",
    content: `<h2>OAuth 2.0 Flows</h2><p>Authorization Code flow is the most secure for web apps. PKCE extends it for SPAs and mobile apps. Client Credentials is for service-to-service.</p><h2>OpenID Connect</h2><p>OIDC adds an identity layer on top of OAuth 2.0. It provides ID tokens with user information and standardized user info endpoints.</p><h2>Implementation</h2><p>Use libraries like NextAuth.js (Auth.js) instead of implementing OAuth from scratch. They handle token management, refresh, and session management.</p><h2>Security Considerations</h2><p>Always use PKCE, validate tokens properly, use short-lived access tokens, and implement proper logout flows.</p>`,
    tags: ["Authentication", "Security", "Backend"],
    status: "PUBLISHED",
  },
  {
    title: "React Design Patterns",
    excerpt: "Essential React patterns: compound components, render props, hooks composition, and the container pattern.",
    content: `<h2>Compound Components</h2><p>Compound components share implicit state. Think of <code>&lt;Select&gt;</code> and <code>&lt;Select.Option&gt;</code> — they work together as a unit.</p><h2>Render Props</h2><p>While hooks have replaced many render prop use cases, they're still useful for headless UI components that delegate rendering decisions.</p><h2>Custom Hook Composition</h2><p>Build complex behavior by composing simple hooks. Each hook handles a single concern, and they're combined in the component.</p><h2>Provider Pattern</h2><p>Use the Provider pattern for dependency injection and cross-cutting concerns like authentication, theming, and feature flags.</p>`,
    tags: ["React", "JavaScript", "Architecture", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "Debugging Node.js Applications",
    excerpt: "Master debugging techniques for Node.js: Chrome DevTools, VS Code debugger, logging, and profiling.",
    content: `<h2>VS Code Debugger</h2><p>Set breakpoints, inspect variables, and step through code directly in VS Code. Create launch configurations for different scenarios.</p><h2>Chrome DevTools</h2><p>Run Node.js with <code>--inspect</code> and open Chrome DevTools for a familiar debugging experience with the Performance and Memory panels.</p><h2>Logging Strategy</h2><p>Use structured logging with levels (debug, info, warn, error). Include request IDs and context for tracing issues in production.</p><h2>Memory Profiling</h2><p>Identify memory leaks with heap snapshots. Common causes: event listener accumulation, global caches, and closures holding large objects.</p>`,
    tags: ["Node.js", "JavaScript", "Backend", "Testing"],
    status: "PUBLISHED",
  },
  {
    title: "Database Migration Strategies",
    excerpt: "Handle database migrations safely in production with zero-downtime strategies and rollback plans.",
    content: `<h2>Migration Fundamentals</h2><p>Migrations are version-controlled changes to your database schema. Each migration should be idempotent and reversible.</p><h2>Zero-Downtime Migrations</h2><p>Avoid breaking changes: add columns as nullable, copy data before renaming, and use expand-contract pattern for complex changes.</p><h2>Tools</h2><p>Prisma Migrate, Flyway, and Liquibase are popular migration tools. Choose based on your stack and team preferences.</p><h2>Testing Migrations</h2><p>Test migrations against production-like data. Use database snapshots for quick rollback testing.</p>`,
    tags: ["Database", "Backend", "DevOps", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Web Components: The Platform's Answer",
    excerpt: "Build reusable, framework-agnostic components using Web Components, Shadow DOM, and custom elements.",
    content: `<h2>Custom Elements</h2><p>Define new HTML elements with the Custom Elements API. They work in any framework or no framework at all.</p><h2>Shadow DOM</h2><p>Shadow DOM encapsulates component styles and markup. No more CSS conflicts or naming conventions needed.</p><h2>Templates and Slots</h2><p>Use <code>&lt;template&gt;</code> and <code>&lt;slot&gt;</code> for flexible component composition. Slots enable content projection like React children.</p><h2>Adoption</h2><p>Web Components are supported in all modern browsers. Libraries like Lit make building them ergonomic and efficient.</p>`,
    tags: ["JavaScript", "Frontend", "Web Development"],
    status: "PUBLISHED",
  },
  {
    title: "Event-Driven Architecture Patterns",
    excerpt: "Design scalable systems with event sourcing, CQRS, saga pattern, and message queues.",
    content: `<h2>Event Sourcing</h2><p>Store all changes as a sequence of events. Rebuild state by replaying events. Provides complete audit trail and temporal queries.</p><h2>CQRS</h2><p>Command Query Responsibility Segregation separates read and write operations. Optimize each independently for their specific workloads.</p><h2>Saga Pattern</h2><p>Manage distributed transactions across services with choreography or orchestration sagas. Handle compensation for failed steps.</p><h2>Message Queues</h2><p>Use RabbitMQ, Kafka, or SQS for reliable asynchronous communication. Implement dead letter queues for failed messages.</p>`,
    tags: ["Architecture", "Backend", "Cloud"],
    status: "PUBLISHED",
  },
  {
    title: "Getting Started with Deno 2.0",
    excerpt: "Explore Deno 2.0's features: npm compatibility, improved Node.js interop, and built-in tooling.",
    content: `<h2>What's New in Deno 2.0</h2><p>Deno 2.0 brings full npm compatibility, seamless Node.js module import, and a stabilized API. It's now a viable alternative for production applications.</p><h2>Built-in Tools</h2><p>Deno includes a formatter, linter, test runner, and bundler. No need for separate tool installations and configurations.</p><h2>Security Model</h2><p>Deno's permission system restricts file, network, and environment access by default. Grant only the permissions your application needs.</p><h2>Migration from Node.js</h2><p>Most Node.js code works in Deno 2.0 with minimal changes. The compatibility layer handles most npm packages transparently.</p>`,
    tags: ["JavaScript", "TypeScript", "Node.js"],
    status: "PUBLISHED",
  },
  {
    title: "Optimizing React Rendering Performance",
    excerpt: "Identify and fix rendering bottlenecks in React applications with profiling, memoization, and virtualization.",
    content: `<h2>React Profiler</h2><p>Use React DevTools Profiler to identify components that re-render unnecessarily. Focus on components that render frequently or take long to render.</p><h2>React.memo and useMemo</h2><p>Wrap components in React.memo to skip re-renders when props haven't changed. Use useMemo for expensive computations.</p><h2>Virtualization</h2><p>For long lists, use virtualization libraries like react-virtuoso or TanStack Virtual. They render only visible items, dramatically improving performance.</p><h2>React Compiler</h2><p>React 19's compiler automatically applies memoization. Analyze your bundle with the compiler's output to verify optimizations.</p>`,
    tags: ["React", "Performance", "Frontend"],
    status: "PUBLISHED",
  },
  {
    title: "Securing Your API: A Practical Guide",
    excerpt: "Protect your API endpoints with authentication, authorization, input validation, and rate limiting.",
    content: `<h2>Authentication</h2><p>Verify the identity of API consumers. Use JWTs for stateless auth, API keys for service auth, and OAuth for third-party access.</p><h2>Authorization</h2><p>Check permissions for every request. Implement role-based access control (RBAC) or attribute-based access control (ABAC).</p><h2>Input Validation</h2><p>Validate all request data with schemas. Check types, lengths, ranges, and formats. Reject requests that don't conform.</p><h2>Rate Limiting & Throttling</h2><p>Implement per-user rate limits to prevent abuse. Use Redis for distributed rate limiting across multiple server instances.</p>`,
    tags: ["Security", "REST API", "Backend", "Best Practices"],
    status: "PUBLISHED",
  },
  {
    title: "Understanding DNS and How Domains Work",
    excerpt: "A developer's guide to DNS: record types, propagation, CDN integration, and common debugging techniques.",
    content: `<h2>How DNS Works</h2><p>DNS translates domain names to IP addresses through a hierarchical lookup process: root servers, TLD servers, and authoritative servers.</p><h2>Record Types</h2><p>A records point to IPv4, AAAA to IPv6, CNAME for aliases, MX for mail, and TXT for verification and SPF records.</p><h2>TTL and Propagation</h2><p>TTL determines how long DNS records are cached. Lower TTL enables faster updates but increases DNS query load.</p><h2>Debugging</h2><p>Use <code>dig</code>, <code>nslookup</code>, and online tools like DNS Checker to troubleshoot DNS issues. Check each level of the DNS hierarchy.</p>`,
    tags: ["Web Development", "DevOps", "Cloud"],
    status: "PUBLISHED",
  },
  {
    title: "Open Source Contribution Guide",
    excerpt: "How to start contributing to open source: finding projects, making your first PR, and building a track record.",
    content: `<h2>Finding Projects</h2><p>Look for issues labeled "good first issue" or "help wanted" on GitHub. Start with projects you use daily.</p><h2>Making Your First PR</h2><p>Fork the repo, create a branch, make your changes, write tests, and submit a pull request with a clear description.</p><h2>Code Review</h2><p>Be patient and open to feedback. Respond to review comments promptly and make requested changes courteously.</p><h2>Building a Track Record</h2><p>Start small — fix typos, improve docs, add tests. As you understand the codebase, take on bigger features and bugs.</p>`,
    tags: ["Open Source", "Git", "Best Practices"],
    status: "PUBLISHED",
  },
  // Draft posts
  {
    title: "Exploring Bun 2.0: The Fast JavaScript Runtime",
    excerpt: "How Bun 2.0 compares to Node.js and Deno, and whether it's ready for production use.",
    content: `<h2>What is Bun?</h2><p>Bun is a JavaScript runtime built from scratch using Zig. It aims to be a drop-in replacement for Node.js with dramatically better performance.</p><h2>Performance</h2><p>Bun's startup time and HTTP server throughput significantly outperform Node.js. Package installation is also much faster.</p>`,
    tags: ["JavaScript", "Node.js", "Performance"],
    status: "DRAFT",
  },
  {
    title: "Building a Design System from Scratch",
    excerpt: "Step-by-step guide to creating a design system with tokens, component library, and documentation.",
    content: `<h2>Design Tokens</h2><p>Start with design tokens: colors, typography, spacing, and sizing. These form the foundation of your visual language.</p><h2>Component Library</h2><p>Build atomic components first (buttons, inputs), then molecules (form fields, cards), then organisms (headers, sidebars).</p>`,
    tags: ["Frontend", "CSS", "React", "Architecture"],
    status: "DRAFT",
  },
  {
    title: "Edge Computing with Cloudflare Workers",
    excerpt: "Deploy serverless functions at the edge for minimum latency with Cloudflare Workers.",
    content: `<h2>Edge Computing</h2><p>Edge computing runs code close to users. Cloudflare Workers deploy to 300+ locations worldwide, ensuring sub-50ms latency globally.</p><h2>Workers API</h2><p>Workers use the Service Worker API. Handle HTTP requests with the fetch event handler.</p>`,
    tags: ["Cloud", "JavaScript", "Performance"],
    status: "DRAFT",
  },
  // Archived posts
  {
    title: "Getting Started with Create React App",
    excerpt: "How to bootstrap React applications with Create React App (deprecated in favor of Next.js and Vite).",
    content: `<h2>Note</h2><p>Create React App is no longer recommended by the React team. Consider using Next.js or Vite for new React projects.</p>`,
    tags: ["React", "JavaScript"],
    status: "ARCHIVED",
  },
  {
    title: "jQuery in 2024: Still Relevant?",
    excerpt: "Examining whether jQuery still has a place in modern web development.",
    content: `<h2>The Legacy</h2><p>jQuery revolutionized web development but modern browsers and frameworks have addressed the problems it solved.</p>`,
    tags: ["JavaScript", "Web Development"],
    status: "ARCHIVED",
  },
];

const PAGE_DATA = [
  { title: "Home", slug: "home", content: "<h1>Welcome to My Blog</h1><p>Discover insightful articles on web development, programming, and technology. Written by developers, for developers.</p>", status: "PUBLISHED" as const, isSystem: true, systemKey: "HOME", isHomePage: true, template: "DEFAULT" },
  { title: "About", slug: "about", content: "<h1>About Us</h1><p>We are a team of passionate developers sharing knowledge about modern web development, cloud computing, and software engineering best practices.</p><h2>Our Mission</h2><p>To provide high-quality, practical content that helps developers grow their skills and build better software.</p><h2>The Team</h2><p>Our writers include experienced engineers, open-source contributors, and technology enthusiasts from around the world.</p>", status: "PUBLISHED" as const, template: "DEFAULT" },
  { title: "Contact", slug: "contact", content: "<h1>Contact Us</h1><p>Have questions, feedback, or want to contribute? We'd love to hear from you!</p><h2>Email</h2><p>contact@myblog.com</p><h2>Social Media</h2><p>Follow us on Twitter @myblog for the latest updates.</p><h2>Guest Posts</h2><p>Interested in writing a guest post? Email us with your pitch and a brief bio.</p>", status: "PUBLISHED" as const, template: "DEFAULT" },
  { title: "Privacy Policy", slug: "privacy-policy", content: "<h1>Privacy Policy</h1><p>Last updated: January 1, 2026</p><h2>Data Collection</h2><p>We collect minimal data necessary to provide our services. This includes email addresses for registered users and analytics data for improving our content.</p><h2>Cookies</h2><p>We use essential cookies for authentication and optional analytics cookies. You can manage cookie preferences in your browser settings.</p><h2>Third-Party Services</h2><p>We use Google Analytics and Cloudflare for performance and security. Please refer to their respective privacy policies.</p>", status: "PUBLISHED" as const, template: "FULL_WIDTH" },
  { title: "Terms of Service", slug: "terms-of-service", content: "<h1>Terms of Service</h1><p>By using this website, you agree to our terms of service.</p><h2>User Conduct</h2><p>Users must not post content that is harmful, offensive, or violates any applicable laws. We reserve the right to remove content and suspend accounts at our discretion.</p><h2>Intellectual Property</h2><p>All content published on this blog is protected by copyright. You may share excerpts with proper attribution.</p>", status: "PUBLISHED" as const, template: "FULL_WIDTH" },
  { title: "Contribute", slug: "contribute", content: "<h1>Contribute</h1><p>Want to share your expertise? We accept guest posts from developers of all experience levels.</p><h2>Guidelines</h2><p>Posts should be original, well-researched, and include practical examples. We prefer a conversational tone with clear explanations.</p><h2>Topics</h2><p>We cover web development, cloud computing, DevOps, programming languages, and software engineering practices.</p>", status: "PUBLISHED" as const, template: "SIDEBAR_RIGHT" },
  { title: "Resources", slug: "resources", content: "<h1>Developer Resources</h1><p>A curated list of tools, libraries, and learning resources for web developers.</p><h2>Learning Platforms</h2><p>Frontend Masters, Egghead.io, Pluralsight, Udemy</p><h2>Tools</h2><p>VS Code, GitHub Copilot, Figma, Notion</p>", status: "DRAFT" as const, template: "DEFAULT" },
  { title: "Sponsors", slug: "sponsors", content: "<h1>Our Sponsors</h1><p>Thank you to our amazing sponsors who help keep this blog running.</p>", status: "DRAFT" as const, template: "LANDING" },
];

const COMMENT_TEMPLATES = [
  "Great article! This really helped me understand the concept better.",
  "Thanks for the detailed explanation. I've been struggling with this topic.",
  "I implemented this in my project and it works perfectly. Thank you!",
  "Very informative. Would love to see a follow-up post on advanced topics.",
  "The code examples are really clear and easy to follow.",
  "I disagree with the approach in section 2. In my experience, it's better to use...",
  "Can you elaborate on the performance implications? I'm curious about benchmarks.",
  "This is exactly what I was looking for. Bookmarked for future reference!",
  "I found a small typo in the third paragraph, but otherwise excellent content.",
  "How does this compare to the approach used by {framework}?",
  "I've been using this pattern for a while and can confirm it scales well.",
  "Would this work with serverless deployments? Any caveats?",
  "Clear and concise. Wish more tutorials were written like this.",
  "The section on error handling is particularly useful. Too many tutorials skip this.",
  "Has anyone tried this with the latest version? Any breaking changes?",
  "This saved me hours of debugging. Thank you so much!",
  "Excellent write-up! Sharing this with my team.",
  "I think it's worth mentioning that this approach has trade-offs in terms of complexity.",
  "First comment here. Love the blog, keep up the great work!",
  "The architecture diagram would be a great addition to this post.",
  "One thing I'd add: make sure to handle edge cases in production.",
  "This is a perfect introduction for beginners coming from other languages.",
  "Really well-structured article. Easy to follow from start to finish.",
  "I ran into an issue with the second example. Any debugging tips?",
  "Concise yet comprehensive. Rare combination in tech articles.",
  "I'll be using this as a reference for my team's onboarding docs.",
  "The comparison table in this post is super helpful for quick decisions.",
  "Been looking for a guide like this for months. Finally found one!",
  "I appreciate the focus on best practices rather than just getting things working.",
  "The real-world examples make this much more practical than typical docs.",
];

const GUEST_NAMES = [
  "Chris Thompson", "Maria Rodriguez", "James Park", "Aisha Patel",
  "Ryan O'Brien", "Sophie Martin", "Ahmed Hassan", "Laura Kim",
  "Brandon Lee", "Nina Volkov", "Diego Sanchez", "Hannah Wright",
  "Oliver Schmidt", "Yuki Tanaka", "Marcus Brown", "Elena Popov",
];

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database with rich data...\n");

  // ─── Create Users ──────────────────────────────────────────────────
  const userMap: Record<string, string> = {};

  for (const u of USERS_DATA) {
    const hashed = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        password: hashed,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: u.displayName,
        role: u.role,
        isEmailVerified: true,
        emailVerifiedAt: daysAgo(randInt(30, 365)),
        bio: u.role !== "SUBSCRIBER" ? `${u.displayName} is a passionate developer and writer.` : undefined,
      },
    });
    userMap[u.username] = user.id;
    console.log(`✅ User: ${user.email} (${user.role})`);
  }

  const authorIds = [
    userMap["admin"], userMap["sarah_dev"], userMap["mike_writes"],
    userMap["emma_codes"], userMap["priya_ml"], userMap["james_sec"],
  ];

  // ─── Create Settings ──────────────────────────────────────────────
  const settingsTasks = [
    { model: "siteSettings", data: { siteName: "My Blog", siteTagline: "A modern blog built with Next.js", language: "en", timezone: "UTC", siteDescription: "Discover insightful articles on web development, programming, and technology.", adsEnabled: true } },
    { model: "userSettings", data: {} },
    { model: "commentSettings", data: {} },
    { model: "editorSettings", data: {} },
    { model: "tagSettings", data: {} },
    { model: "captchaSettings", data: {} },
    { model: "pageSettings", data: {} },
    { model: "adSettings", data: { adsEnabled: true } },
  ] as const;

  for (const s of settingsTasks) {
    const existing = await (prisma[s.model] as any).findFirst();
    if (!existing) {
      await (prisma[s.model] as any).create({ data: s.data });
      console.log(`✅ ${s.model} created`);
    } else {
      console.log(`⏭️  ${s.model} already exists`);
    }
  }

  // ─── Create Tags ──────────────────────────────────────────────────
  const tagMap: Record<string, string> = {};

  for (const t of TAG_DATA) {
    const tag = await prisma.tag.upsert({
      where: { slug: slug(t.name) },
      update: {},
      create: {
        name: t.name,
        slug: slug(t.name),
        description: t.description,
        color: t.color,
        featured: Math.random() > 0.7,
        trending: Math.random() > 0.8,
      },
    });
    tagMap[t.name] = tag.id;
  }
  console.log(`✅ ${TAG_DATA.length} tags created`);

  // ─── Create Blog Posts ────────────────────────────────────────────
  const postIds: string[] = [];

  for (let i = 0; i < BLOG_POSTS.length; i++) {
    const bp = BLOG_POSTS[i];
    const postSlug = slug(bp.title);

    const existing = await prisma.post.findUnique({ where: { slug: postSlug } });
    if (existing) {
      postIds.push(existing.id);
      continue;
    }

    const authorId = rand(authorIds);
    const daysOld = BLOG_POSTS.length - i + randInt(1, 30);
    const wordCount = bp.content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    const post = await prisma.post.create({
      data: {
        title: bp.title,
        slug: postSlug,
        content: bp.content,
        excerpt: bp.excerpt,
        status: bp.status,
        authorId,
        publishedAt: bp.status === "PUBLISHED" ? daysAgo(daysOld) : undefined,
        archivedAt: bp.status === "ARCHIVED" ? daysAgo(randInt(1, 15)) : undefined,
        viewCount: bp.status === "PUBLISHED" ? randInt(50, 15000) : 0,
        readingTime,
        wordCount,
        isFeatured: i < 5, // first 5 are featured
        isPinned: i < 2, // first 2 are pinned
        allowComments: true,
        tags: {
          connect: bp.tags
            .filter((t) => tagMap[t])
            .map((t) => ({ id: tagMap[t] })),
        },
      },
    });
    postIds.push(post.id);
  }
  console.log(`✅ ${BLOG_POSTS.length} blog posts created`);

  // ─── Update tag usage counts ──────────────────────────────────────
  for (const [name, tagId] of Object.entries(tagMap)) {
    const count = await prisma.post.count({ where: { tags: { some: { id: tagId } } } });
    await prisma.tag.update({ where: { id: tagId }, data: { usageCount: count } });
  }
  console.log("✅ Tag usage counts updated");

  // ─── Create Comments ──────────────────────────────────────────────
  const publishedPostIds = postIds.slice(0, 50); // only published posts
  const subscriberIds = [userMap["reader1"], userMap["reader2"], userMap["reader3"]];
  const allUserIds = Object.values(userMap);
  let commentCount = 0;

  for (const postId of publishedPostIds) {
    const numComments = randInt(1, 8);
    for (let c = 0; c < numComments; c++) {
      const isGuest = Math.random() > 0.5;
      const statuses = ["APPROVED", "APPROVED", "APPROVED", "PENDING", "SPAM"];
      const status = rand(statuses);

      await prisma.comment.create({
        data: {
          postId,
          content: rand(COMMENT_TEMPLATES),
          status,
          spamScore: status === "SPAM" ? randInt(60, 95) : randInt(0, 20),
          createdAt: daysAgo(randInt(0, 60)),
          ...(isGuest
            ? {
                authorName: rand(GUEST_NAMES),
                authorEmail: `${rand(GUEST_NAMES).toLowerCase().replace(" ", ".")}@example.com`,
              }
            : {
                userId: rand([...subscriberIds, ...authorIds.slice(0, 3)]),
              }),
        },
      });
      commentCount++;
    }
  }
  console.log(`✅ ${commentCount} comments created`);

  // ─── Create Pages ─────────────────────────────────────────────────
  for (const pg of PAGE_DATA) {
    const existing = await prisma.page.findFirst({ where: { slug: pg.slug } });
    if (existing) continue;

    await prisma.page.create({
      data: {
        title: pg.title,
        slug: pg.slug,
        content: pg.content,
        status: pg.status,
        template: pg.template,
        publishedAt: pg.status === "PUBLISHED" ? daysAgo(randInt(30, 180)) : undefined,
        authorId: userMap["admin"],
        isSystem: (pg as any).isSystem || false,
        systemKey: (pg as any).systemKey || null,
        isHomePage: (pg as any).isHomePage || false,
      },
    });
  }
  console.log(`✅ ${PAGE_DATA.length} pages created`);

  // ─── Ad Slots (default positions) ─────────────────────────────────
  const AD_SLOTS = [
    { name: "Sidebar Ad", slug: "sidebar-ad", position: "SIDEBAR", format: "DISPLAY", pageTypes: ["*"], renderPriority: 10 },
    { name: "Sidebar Sticky Ad", slug: "sidebar-sticky-ad", position: "SIDEBAR_STICKY", format: "DISPLAY", pageTypes: ["blog", "blog-index"], renderPriority: 5 },
    { name: "In-Content Ad", slug: "in-content-ad", position: "IN_CONTENT", format: "DISPLAY", pageTypes: ["blog", "home"], renderPriority: 8 },
    { name: "In-Feed Ad", slug: "in-feed-ad", position: "IN_FEED", format: "NATIVE", pageTypes: ["blog-index", "tags-index"], renderPriority: 6 },
    { name: "Before Comments Ad", slug: "before-comments-ad", position: "BEFORE_COMMENTS", format: "DISPLAY", pageTypes: ["blog"], renderPriority: 4 },
    { name: "Header Banner", slug: "header-banner", position: "HEADER", format: "DISPLAY", pageTypes: ["*"], maxWidth: 728, maxHeight: 90, renderPriority: 15 },
    { name: "Footer Banner", slug: "footer-banner", position: "FOOTER", format: "DISPLAY", pageTypes: ["*"], maxWidth: 728, maxHeight: 90, renderPriority: 2 },
  ];

  for (const slot of AD_SLOTS) {
    await (prisma as any).adSlot.upsert({
      where: { slug: slot.slug },
      update: {},
      create: {
        name: slot.name,
        slug: slot.slug,
        position: slot.position,
        format: slot.format,
        pageTypes: slot.pageTypes,
        isActive: true,
        responsive: true,
        renderPriority: slot.renderPriority,
        maxWidth: (slot as any).maxWidth ?? null,
        maxHeight: (slot as any).maxHeight ?? null,
      },
    });
  }
  console.log(`✅ ${AD_SLOTS.length} ad slots created`);

  // ─── Summary ──────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    posts: await prisma.post.count(),
    tags: await prisma.tag.count(),
    comments: await prisma.comment.count(),
    pages: await prisma.page.count(),
    adSlots: await (prisma as any).adSlot.count(),
  };

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log(`  Users:    ${counts.users}`);
  console.log(`  Posts:    ${counts.posts}`);
  console.log(`  Tags:     ${counts.tags}`);
  console.log(`  Comments: ${counts.comments}`);
  console.log(`  Pages:    ${counts.pages}`);
  console.log(`  Ad Slots: ${counts.adSlots}`);
  console.log("─────────────────────────────────────────");
  console.log("  Admin login: admin@myblog.com / Aa1357");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
