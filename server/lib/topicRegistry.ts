// server/lib/topicRegistry.ts
// Canonical Topic Registry for Quiz and Technical Interview Engines.
// Adheres to Master Prompt Sections 20A, 20B, 20D, 20S.

export type TopicCategory =
  | "Programming"
  | "Web Development"
  | "Backend / Java"
  | "Databases"
  | "CS Fundamentals"
  | "Data & AI"
  | "DevOps"
  | "Security";

export interface TopicDefinition {
  id: string;
  name: string;
  category: TopicCategory;
  description: string;
  subtopics: string[];
  competencies: string[];
  questionStrategies: string[];
  color: string;
  accent: string;
}

export const TOPIC_REGISTRY: TopicDefinition[] = [
  // ── Programming Languages ───────────────────────────────────────────────────
  {
    id: "java",
    name: "Java",
    category: "Programming",
    description: "Core Java, OOP, Collections, Multithreading, JVM, Streams, Memory Model",
    subtopics: [
      "Syntax & Data Types",
      "OOP Principles & Inheritance",
      "Collections Framework (List, Set, Map)",
      "Exceptions & Error Handling",
      "Generics & Reflection",
      "Java 8+ Streams & Lambdas",
      "Multithreading & Concurrency",
      "JVM Architecture & Memory (Heap, Stack, GC)",
      "Output Prediction & Debugging",
    ],
    competencies: ["Java OOP", "Java Collections", "Concurrency & Threads", "JVM & Memory", "Streams & Lambdas"],
    questionStrategies: [
      "Code output prediction",
      "Concurrency race condition identification",
      "Collection choice trade-offs",
      "Exception propagation scenarios",
    ],
    color: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    accent: "#f59e0b",
  },
  {
    id: "python",
    name: "Python",
    category: "Programming",
    description: "Python data structures, OOP, Generators, Decorators, Asyncio, Memory management",
    subtopics: [
      "Data Types & Collections (Lists, Dicts, Tuples, Sets)",
      "Functions & Scopes (LEGB rule)",
      "OOP, Magic Methods & Dunder",
      "Generators & Iterators",
      "Decorators & Closures",
      "List/Dict Comprehensions",
      "GIL, Multiprocessing vs Threading",
      "Memory Management & Reference Counting",
      "Debugging & Error Handling",
    ],
    competencies: ["Python Fundamentals", "Decorators & Generators", "Python Memory & GIL", "Asyncio & Concurrency"],
    questionStrategies: [
      "Mutable default arguments gotchas",
      "Decorator design and call stack",
      "GIL performance impact scenarios",
      "Memory leak via circular reference",
    ],
    color: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    accent: "#3b82f6",
  },
  {
    id: "javascript",
    name: "JavaScript",
    category: "Programming",
    description: "ES6+, Event Loop, Closures, Promises, Async/Await, Prototypes, Scope",
    subtopics: [
      "Scope, Hoisting & Closures",
      "The 'this' Keyword & Execution Context",
      "Prototypes & Prototypal Inheritance",
      "Promises, Microtasks & Async/Await",
      "Event Loop & Call Stack",
      "ES6+ Modules, Destructuring & Rest/Spread",
      "DOM & Event Bubbling/Capturing",
      "Memory Leaks & Garbage Collection",
    ],
    competencies: ["Closures & Scope", "Asynchronous JS & Event Loop", "Prototypes & OOP", "ES6+ Modern JS"],
    questionStrategies: [
      "Event loop output prediction (setTimeout vs Promise.resolve)",
      "Closure-based encapsulation and memory implications",
      "Object prototype chain resolution",
    ],
    color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    accent: "#eab308",
  },
  {
    id: "typescript",
    name: "TypeScript",
    category: "Programming",
    description: "Type System, Generics, Utility Types, Interfaces, Union/Intersection, Mapped Types",
    subtopics: [
      "Basic & Complex Types",
      "Interfaces vs Type Aliases",
      "Generics & Constraints",
      "Union, Intersection & Discriminated Unions",
      "Utility Types (Partial, Pick, Omit, Record)",
      "Type Narrowing & Type Guards",
      "Mapped & Conditional Types",
      "Decorators & TSConfig optimization",
    ],
    competencies: ["TypeScript Type System", "Generics", "Type Narrowing & Guards", "Advanced Types"],
    questionStrategies: [
      "Compile-time type error diagnosis",
      "Generic type constraint formulation",
      "Discriminated union pattern matching",
    ],
    color: "bg-blue-600/15 text-blue-400 border-blue-600/25",
    accent: "#2563eb",
  },
  {
    id: "cpp",
    name: "C++",
    category: "Programming",
    description: "Pointers, References, Memory allocation, RAII, Smart Pointers, STL, Virtual functions",
    subtopics: [
      "Pointers, References & Memory Management",
      "RAII & Smart Pointers (unique_ptr, shared_ptr)",
      "OOP, Virtual Functions, VTable & Polymorphism",
      "STL Containers & Iterators",
      "Templates & Metaprogramming",
      "Move Semantics & Rvalue References",
      "Concurrency & Mutexes in C++11/14/17/20",
    ],
    competencies: ["C++ Memory & Pointers", "Smart Pointers & RAII", "STL & Templates", "Polymorphism & VTable"],
    questionStrategies: [
      "Dangling pointer and memory leak scenarios",
      "Virtual destructor importance in inheritance",
      "Move semantics vs copy constructor efficiency",
    ],
    color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    accent: "#6366f1",
  },
  {
    id: "c",
    name: "C",
    category: "Programming",
    description: "Memory layout, Pointers, Structs, Stack/Heap, Dynamic allocation, Syscalls",
    subtopics: [
      "Data types, Operators & Flow Control",
      "Pointers & Pointer Arithmetic",
      "Dynamic Memory (malloc, calloc, realloc, free)",
      "Structs, Unions & Typedefs",
      "Memory Layout (Code, Data, BSS, Heap, Stack)",
      "Function Pointers & Callbacks",
      "File I/O & System Calls",
    ],
    competencies: ["C Pointers & Memory", "Memory Layout & Allocation", "Structs & Data Structures"],
    questionStrategies: [
      "Buffer overflow & pointer arithmetic bug detection",
      "Memory leak & double-free prevention",
      "Stack frame layout explanation",
    ],
    color: "bg-slate-500/15 text-slate-300 border-slate-500/25",
    accent: "#64748b",
  },

  // ── Web Development ────────────────────────────────────────────────────────
  {
    id: "react",
    name: "React",
    category: "Web Development",
    description: "Component lifecycle, Hooks, State management, Rendering behavior, Virtual DOM, Performance",
    subtopics: [
      "Components & JSX",
      "Props vs State",
      "Hooks (useState, useEffect, useRef)",
      "Performance Hooks (useMemo, useCallback)",
      "Context API & Global State Management",
      "Virtual DOM & Reconciliation (Fiber)",
      "Re-render Triggers & Prevention",
      "Forms & Controlled vs Uncontrolled Components",
      "Error Boundaries & Suspense",
    ],
    competencies: ["React Hooks", "Rendering & Reconciliation", "Performance Optimization", "State Architecture"],
    questionStrategies: [
      "Why is my component re-rendering infinitely?",
      "useCallback vs useMemo trade-offs with code example",
      "Virtual DOM diffing algorithm explanation",
      "Context API performance vs Redux/Zustand",
    ],
    color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    accent: "#06b6d4",
  },
  {
    id: "nextjs",
    name: "Next.js",
    category: "Web Development",
    description: "SSR, SSG, ISR, App Router, Server Components, API routes, SEO & Performance",
    subtopics: [
      "App Router vs Pages Router",
      "Server Components (RSC) vs Client Components",
      "SSR, SSG, ISR & Hydration",
      "Data Fetching (fetch caching & revalidation)",
      "Routing, Nested Layouts & Route Handlers",
      "Middleware, Auth & Edge Runtime",
      "SEO, Metadata & Image Optimization",
    ],
    competencies: ["Next.js App Router", "Server Components & Hydration", "Rendering Strategies (SSR/SSG/ISR)"],
    questionStrategies: [
      "Client vs Server component boundary placement",
      "Hydration error diagnosis",
      "ISR cache invalidation strategies",
    ],
    color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
    accent: "#71717a",
  },
  {
    id: "nodejs-express",
    name: "Node.js & Express",
    category: "Web Development",
    description: "Event Loop, Streams, Clusters, Middleware architecture, REST APIs, Error handling",
    subtopics: [
      "Node.js Architecture & libuv Event Loop",
      "Buffers, Streams & Pipes",
      "Express Middleware Pipeline & Error Handling",
      "RESTful API Design & Status Codes",
      "Authentication & JWT in Express",
      "Clustering, Worker Threads & PM2",
      "File Uploads & Multipart Handling",
      "Security Best Practices (Helmet, CORS, Rate Limiting)",
    ],
    competencies: ["Node.js Architecture", "Express Middleware", "REST API Design", "Node Performance & Security"],
    questionStrategies: [
      "Blocking the event loop: how to identify and avoid",
      "Stream vs buffer memory usage for large files",
      "Custom error middleware design",
    ],
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    accent: "#10b981",
  },
  {
    id: "html-css",
    name: "HTML & CSS",
    category: "Web Development",
    description: "Semantic HTML, Accessibility (a11y), Flexbox, CSS Grid, Box Model, Responsive design",
    subtopics: [
      "Semantic HTML Elements & Structure",
      "Box Model, Padding, Margin, Border",
      "Flexbox: Alignments, Axes, Flex properties",
      "CSS Grid: Grid template, areas, auto-fit/auto-fill",
      "Specificity, Cascading & Inheritance",
      "Responsive Design & Media Queries",
      "Positioning (relative, absolute, fixed, sticky)",
      "Accessibility (ARIA, keyboard navigation, contrast)",
    ],
    competencies: ["CSS Layout (Flex/Grid)", "CSS Specificity & Box Model", "Semantic HTML & Accessibility"],
    questionStrategies: [
      "Flexbox vs Grid layout scenario decision",
      "Specificity calculation battle",
      "Centering techniques and z-index stacking context gotchas",
    ],
    color: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    accent: "#f97316",
  },

  // ── Backend / Java Ecosystem ───────────────────────────────────────────────
  {
    id: "spring-boot",
    name: "Spring Boot",
    category: "Backend / Java",
    description: "IoC, Dependency Injection, Spring MVC, Spring Data JPA, Security, Actuator, Microservices",
    subtopics: [
      "Inversion of Control (IoC) & Dependency Injection",
      "Spring Bean Scopes & Lifecycle",
      "Spring Boot Auto-configuration & Starters",
      "Controllers, Services, Repositories Architecture",
      "Spring Data JPA & Hibernate Mapping",
      "Transaction Management (@Transactional, propagation, isolation)",
      "Spring Security & JWT Authentication",
      "Exception Handling (@ControllerAdvice, @ExceptionHandler)",
      "Actuator, Profiles & Production Configuration",
    ],
    competencies: ["Spring IoC & DI", "Spring Data JPA & Transactions", "Spring Security", "Spring Boot Architecture"],
    questionStrategies: [
      "Explain bean creation lifecycle in Spring container",
      "@Transactional rollback rules and self-invocation traps",
      "N+1 query problem diagnosis and resolution in Spring Data JPA",
      "How to implement JWT stateless security filter",
    ],
    color: "bg-green-500/15 text-green-300 border-green-500/25",
    accent: "#22c55e",
  },
  {
    id: "microservices",
    name: "Microservices",
    category: "Backend / Java",
    description: "API Gateway, Service Discovery, Saga pattern, Circuit Breaker, Event-driven architecture",
    subtopics: [
      "Monolith vs Microservices Trade-offs",
      "Service Discovery & API Gateway",
      "Inter-service Communication (REST, gRPC, Message Queues)",
      "Distributed Transactions & Saga Pattern",
      "Resilience & Circuit Breaker (Resilience4j)",
      "Distributed Tracing & Centralized Logging",
      "Event-Driven Architecture (Kafka / RabbitMQ)",
    ],
    competencies: ["Microservice Architecture", "Distributed Transactions", "Inter-service Communication & Resilience"],
    questionStrategies: [
      "How to maintain data consistency without 2-phase commit",
      "Circuit breaker state transitions under partial outage",
      "Designing an API Gateway rate limiter",
    ],
    color: "bg-teal-500/15 text-teal-300 border-teal-500/25",
    accent: "#14b8a6",
  },

  // ── Databases ──────────────────────────────────────────────────────────────
  {
    id: "sql",
    name: "SQL & Query Optimization",
    category: "Databases",
    description: "Complex Queries, Joins, Aggregations, Subqueries, CTEs, Window Functions, Index tuning",
    subtopics: [
      "SELECT, WHERE, GROUP BY, HAVING, ORDER BY",
      "INNER, LEFT, RIGHT, FULL OUTER, CROSS JOINs",
      "Subqueries & Common Table Expressions (WITH)",
      "Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG)",
      "Indexes (B-Tree, Hash) & Execution Plans (EXPLAIN)",
      "Query Optimization & Avoiding Full Table Scans",
      "Aggregate Functions & Partitioning",
    ],
    competencies: ["Complex SQL Queries", "Window Functions & CTEs", "Indexing & Query Plans", "Query Optimization"],
    questionStrategies: [
      "Write query to find Nth highest salary / top 3 per department",
      "Analyze EXPLAIN plan output to identify missing index",
      "HAVING vs WHERE filter execution order",
    ],
    color: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    accent: "#8b5cf6",
  },
  {
    id: "dbms",
    name: "DBMS & Database Design",
    category: "Databases",
    description: "ACID properties, Transactions, Normalization (1NF to BCNF), Concurrency control, Sharding",
    subtopics: [
      "ACID Properties & Transaction States",
      "Normalization (1NF, 2NF, 3NF, BCNF) & Denormalization",
      "Transaction Isolation Levels (Read Uncommitted to Serializable)",
      "Concurrency Control: 2PL, Timestamp Ordering, MVCC",
      "Deadlock Detection, Prevention & Recovery",
      "Database Sharding, Replication & Partitioning",
      "CAP Theorem & NoSQL vs Relational Trade-offs",
    ],
    competencies: ["ACID & Transactions", "Database Normalization", "Isolation Levels & Concurrency", "Database Architecture"],
    questionStrategies: [
      "Dirty read vs Non-repeatable read vs Phantom read scenarios",
      "Normalize an unnormalized schema table by table",
      "Deadlock resolution in concurrent updates",
    ],
    color: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    accent: "#a855f7",
  },

  // ── CS Fundamentals ────────────────────────────────────────────────────────
  {
    id: "dsa",
    name: "DSA (Data Structures & Algorithms)",
    category: "CS Fundamentals",
    description: "Arrays, Linked Lists, Trees, Graphs, DP, Sorting, Searching, Complexity analysis",
    subtopics: [
      "Time & Space Complexity (Big-O analysis)",
      "Arrays, Strings & Two Pointers / Sliding Window",
      "Linked Lists & Fast/Slow Pointer",
      "Stacks, Queues & Monotonic Stack",
      "Binary Trees, BST & Tree Traversals (In/Pre/Post/Level)",
      "Heaps & Priority Queues",
      "Graphs: BFS, DFS, Dijkstra, Topo Sort",
      "Dynamic Programming (1D, 2D, Knapsack, Subsequences)",
      "Binary Search & Binary Search on Answer",
    ],
    competencies: ["Algorithm Design & Big-O", "Trees & Graphs", "Dynamic Programming", "Data Structure Selection"],
    questionStrategies: [
      "Analyze brute-force vs optimized time/space complexity",
      "Design sliding window algorithm with edge-case handling",
      "DP recurrence relation and base cases breakdown",
    ],
    color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    accent: "#818cf8",
  },
  {
    id: "os",
    name: "Operating Systems",
    category: "CS Fundamentals",
    description: "Processes, Threads, CPU Scheduling, Synchronization, Deadlocks, Virtual Memory, Paging",
    subtopics: [
      "Process vs Thread & Context Switching",
      "Process Scheduling Algorithms (FCFS, SJF, RR, Priority)",
      "Process Synchronization (Mutex, Semaphore, Monitors)",
      "Classical Sync Problems (Producer-Consumer, Dining Philosophers)",
      "Deadlock (Conditions, Banker's Algorithm, Detection)",
      "Memory Management (Paging, Segmentation, Page Faults)",
      "Virtual Memory & Page Replacement (LRU, FIFO, Optimal)",
      "File Systems & Disk Scheduling",
    ],
    competencies: ["Processes & Threads", "CPU Scheduling", "Synchronization & Deadlocks", "Virtual Memory & Paging"],
    questionStrategies: [
      "Semaphore implementation of producer-consumer queue",
      "Page fault calculation given reference string and frame count",
      "Thrashing cause and working set model resolution",
    ],
    color: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    accent: "#60a5fa",
  },
  {
    id: "cn",
    name: "Computer Networks",
    category: "CS Fundamentals",
    description: "OSI & TCP/IP layers, TCP 3-way handshake, Flow/Congestion control, DNS, HTTP/HTTPS, WebSockets",
    subtopics: [
      "OSI 7 Layers vs TCP/IP 4 Layers",
      "TCP vs UDP Trade-offs & Header Structure",
      "TCP 3-Way Handshake & Connection Teardown",
      "TCP Flow Control (Sliding Window) & Congestion Control",
      "DNS Resolution Flow & Caching",
      "HTTP/1.1 vs HTTP/2 vs HTTP/3",
      "HTTPS, SSL/TLS Handshake & Certificates",
      "Subnetting, IP Addressing & Routing Protocols",
    ],
    competencies: ["TCP/IP Protocols", "Network Architecture & Layers", "HTTP/HTTPS & Web Protocols", "DNS & Routing"],
    questionStrategies: [
      "What happens step-by-step when you type google.com in the browser?",
      "TCP vs UDP decision for gaming vs financial data",
      "TLS handshake encryption key exchange explanation",
    ],
    color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    accent: "#22d3ee",
  },
  {
    id: "system-design",
    name: "System Design",
    category: "CS Fundamentals",
    description: "Scalability, Caching, Load Balancing, CDN, Database Sharding, Rate Limiting, Message Queues",
    subtopics: [
      "Horizontal vs Vertical Scaling",
      "Load Balancers (L4 vs L7, Algorithms)",
      "Caching Strategies (Cache-Aside, Write-Through, Redis, Eviction)",
      "Database Sharding, Replication & Consistency",
      "Message Queues (Kafka, RabbitMQ) & Asynchronous Processing",
      "Rate Limiting Algorithms (Token Bucket, Leaky Bucket)",
      "CDN & Static Asset Delivery",
      "High Availability, Disaster Recovery & SLA/SLO",
    ],
    competencies: ["Scalable Architecture", "Caching & Storage Strategies", "Distributed Components (LB, Queues)"],
    questionStrategies: [
      "Design a URL shortener (TinyURL) with high read/write ratio",
      "Cache invalidation and thundering herd problem",
      "Designing for 100k requests/second",
    ],
    color: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    accent: "#f43f5e",
  },

  // ── DevOps & Engineering ───────────────────────────────────────────────────
  {
    id: "devops",
    name: "DevOps & Engineering",
    category: "DevOps",
    description: "Git, Docker containers, CI/CD pipelines, Linux commands, Cloud fundamentals, Kubernetes",
    subtopics: [
      "Git: Branching, Rebasing, Merge conflicts, Cherry-pick",
      "Docker: Dockerfile, Images, Containers, Multi-stage builds",
      "CI/CD Pipelines: Build, Test, Deploy automation",
      "Linux: File permissions, Process management, Bash commands",
      "Cloud Fundamentals (AWS/GCP/Azure compute, storage, networking)",
      "Kubernetes Fundamentals (Pods, Deployments, Services)",
    ],
    competencies: ["Git & Version Control", "Docker & Containers", "CI/CD Automation", "Linux Fundamentals"],
    questionStrategies: [
      "Git rebase vs git merge implications",
      "Optimizing Docker image layers and size",
      "CI/CD deployment rollback strategy",
    ],
    color: "bg-teal-500/15 text-teal-300 border-teal-500/25",
    accent: "#0d9488",
  },

  // ── Security ───────────────────────────────────────────────────────────────
  {
    id: "security",
    name: "Web & API Security",
    category: "Security",
    description: "OWASP Top 10, SQL Injection, XSS, CSRF, Authentication, JWT Security, CORS, Encryption",
    subtopics: [
      "OWASP Top 10 Overview",
      "SQL Injection & Parameterized Queries",
      "Cross-Site Scripting (XSS: Stored, Reflected, DOM)",
      "Cross-Site Request Forgery (CSRF) & SameSite Cookies",
      "Authentication vs Authorization (RBAC, ABAC)",
      "JWT Security & Storage (Cookies vs LocalStorage)",
      "CORS Policy & Preflight Requests",
      "Hashing (bcrypt, argon2) vs Symmetric/Asymmetric Encryption",
    ],
    competencies: ["OWASP Vulnerabilities", "Authentication & JWT", "Secure API Design", "Data Protection"],
    questionStrategies: [
      "Explain and mitigate a SQL injection attack with code",
      "Where should JWTs be stored in the browser and why?",
      "How does CSRF protection work with tokens and SameSite cookies?",
    ],
    color: "bg-red-500/15 text-red-300 border-red-500/25",
    accent: "#ef4444",
  },
];

// Helper lookup functions
export function getTopicById(id: string): TopicDefinition | undefined {
  const norm = id.toLowerCase().trim();
  return TOPIC_REGISTRY.find(
    (t) => t.id === norm || t.name.toLowerCase() === norm
  );
}

export function getAllCategories(): TopicCategory[] {
  return [
    "Programming",
    "Web Development",
    "Backend / Java",
    "Databases",
    "CS Fundamentals",
    "DevOps",
    "Security",
  ];
}

export function getTopicsByCategory(cat: TopicCategory): TopicDefinition[] {
  return TOPIC_REGISTRY.filter((t) => t.category === cat);
}
